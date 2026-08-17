import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"

import { and, eq, lt } from "drizzle-orm"

import { db } from "@/lib/db"
import { files, previewJobs } from "@/lib/db/schema"

// 注意：不引入 lib/storage/files.ts（其依赖 server-only，仅限 Next 运行时），
// worker 在纯 Node 进程下运行，这里内联等价的存储路径安全校验。
const FILE_ROOT = path.resolve(process.cwd(), "data", "files")

function safeInputPath(relativePath: string) {
  const resolved = path.resolve(FILE_ROOT, relativePath)
  if (!resolved.startsWith(`${FILE_ROOT}${path.sep}`)) throw new Error("Invalid storage path")
  return resolved
}

const officeExtensions = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"])
const MAX_ATTEMPTS = 3
const LIBREOFFICE_TIMEOUT_MS = 120_000

export async function enqueuePreview(fileId: string, extension: string) {
  if (!officeExtensions.has(extension)) return
  await db.insert(previewJobs).values({ fileId })
  await db.update(files).set({ previewStatus: "PENDING" }).where(eq(files.id, fileId))
}

export async function recoverStalePreviewJobs() {
  const stale = new Date(Date.now() - 15 * 60 * 1000)
  const staleJobs = await db.select({ id: previewJobs.id, attempts: previewJobs.attempts, fileId: previewJobs.fileId })
    .from(previewJobs)
    .where(and(eq(previewJobs.status, "PROCESSING"), lt(previewJobs.startedAt, stale)))
  for (const job of staleJobs) {
    if (job.attempts >= MAX_ATTEMPTS) {
      await db.update(previewJobs).set({ status: "FAILED", finishedAt: new Date(), error: "Max retry attempts exceeded" }).where(eq(previewJobs.id, job.id))
      await db.update(files).set({ previewStatus: "FAILED" }).where(eq(files.id, job.fileId))
    } else {
      await db.update(previewJobs).set({ status: "PENDING", startedAt: null, error: "Recovered after interrupted processing" }).where(eq(previewJobs.id, job.id))
    }
  }
}

export async function processNextPreview() {
  const job = await db.query.previewJobs.findFirst({ where: eq(previewJobs.status, "PENDING") })
  if (!job) return false
  if (job.attempts >= MAX_ATTEMPTS) {
    await db.update(previewJobs).set({ status: "FAILED", finishedAt: new Date(), error: "Max retry attempts exceeded" }).where(eq(previewJobs.id, job.id))
    await db.update(files).set({ previewStatus: "FAILED" }).where(eq(files.id, job.fileId))
    return true
  }
  const claimed = db.update(previewJobs).set({ status: "PROCESSING", startedAt: new Date(), attempts: job.attempts + 1 }).where(and(eq(previewJobs.id, job.id), eq(previewJobs.status, "PENDING"))).run()
  if (claimed.changes === 0) return true // 已被其他 worker 领取
  const file = await db.query.files.findFirst({ where: eq(files.id, job.fileId) })
  if (!file) { await fail(job.id, "File metadata missing"); return true }
  const outputDir = path.resolve(process.cwd(), "data", "previews", file.id)
  try {
    await fs.mkdir(outputDir, { recursive: true })
    await runLibreOffice(safeInputPath(file.storagePath), outputDir)
    const base = path.parse(file.storageName).name
    const generated = path.join(outputDir, `${base}.pdf`)
    await fs.access(generated)
    await db.update(files).set({ previewStatus: "SUCCESS", previewPath: path.relative(path.resolve(process.cwd(), "data", "previews"), generated) }).where(eq(files.id, file.id))
    await db.update(previewJobs).set({ status: "SUCCESS", finishedAt: new Date(), error: null }).where(eq(previewJobs.id, job.id))
  } catch (error) {
    await fail(job.id, error instanceof Error ? error.message.slice(0, 1000) : "Preview conversion failed")
  }
  return true
}

async function fail(jobId: string, error: string) {
  const job = await db.query.previewJobs.findFirst({ where: eq(previewJobs.id, jobId) })
  if (job) await db.update(files).set({ previewStatus: "FAILED" }).where(eq(files.id, job.fileId))
  await db.update(previewJobs).set({ status: "FAILED", finishedAt: new Date(), error }).where(eq(previewJobs.id, jobId))
}

function runLibreOffice(input: string, outputDir: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(/* turbopackIgnore: true */ process.env.LIBREOFFICE_PATH ?? "soffice", ["--headless", "--convert-to", "pdf", "--outdir", outputDir, input], { windowsHide: true })
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error("LibreOffice conversion timed out"))
    }, LIBREOFFICE_TIMEOUT_MS)
    child.stderr.on("data", (chunk: Buffer) => { stderr += String(chunk) })
    child.on("error", (error) => { clearTimeout(timer); reject(error) })
    child.on("exit", (code: number | null) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderr || `LibreOffice exited with code ${code}`))
      }
    })
  })
}

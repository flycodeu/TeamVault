import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"

import { and, eq, lt } from "drizzle-orm"

import { db } from "@/lib/db"
import { files, previewJobs } from "@/lib/db/schema"
import { safeStoragePath } from "@/lib/storage/files"

const officeExtensions = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"])

export async function enqueuePreview(fileId: string, extension: string) {
  if (!officeExtensions.has(extension)) return
  await db.insert(previewJobs).values({ fileId })
  await db.update(files).set({ previewStatus: "PENDING" }).where(eq(files.id, fileId))
}

export async function recoverStalePreviewJobs() {
  const stale = new Date(Date.now() - 15 * 60 * 1000)
  await db.update(previewJobs).set({ status: "PENDING", startedAt: null, error: "Recovered after interrupted processing" }).where(and(eq(previewJobs.status, "PROCESSING"), lt(previewJobs.startedAt, stale)))
}

export async function processNextPreview() {
  const job = await db.query.previewJobs.findFirst({ where: eq(previewJobs.status, "PENDING") })
  if (!job) return false
  await db.update(previewJobs).set({ status: "PROCESSING", startedAt: new Date(), attempts: job.attempts + 1 }).where(and(eq(previewJobs.id, job.id), eq(previewJobs.status, "PENDING")))
  const file = await db.query.files.findFirst({ where: eq(files.id, job.fileId) })
  if (!file) { await fail(job.id, "File metadata missing"); return true }
  const outputDir = path.resolve(process.cwd(), "data", "previews", file.id)
  try {
    await fs.mkdir(outputDir, { recursive: true })
    await runLibreOffice(safeStoragePath(file.storagePath), outputDir)
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
    child.stderr.on("data", (chunk: Buffer) => { stderr += String(chunk) })
    child.on("error", reject)
    child.on("exit", (code: number | null) => code === 0 ? resolve() : reject(new Error(stderr || `LibreOffice exited with code ${code}`)))
  })
}

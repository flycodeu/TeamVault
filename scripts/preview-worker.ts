import { processNextPreview, recoverStalePreviewJobs } from "../lib/preview/worker"

const IDLE_POLL_MS = 2000
const ERROR_POLL_MS = 5000

async function main() {
  console.log("Preview worker started (resident mode)")
  await recoverStalePreviewJobs()
  // 常驻循环：持续处理待转换的 Office 文件，队列空闲时轮询等待
  while (true) {
    try {
      const processed = await processNextPreview()
      if (!processed) {
        await recoverStalePreviewJobs()
        await new Promise(resolve => setTimeout(resolve, IDLE_POLL_MS))
      }
    } catch (error) {
      console.error("Preview worker error:", error instanceof Error ? error.message : error)
      await new Promise(resolve => setTimeout(resolve, ERROR_POLL_MS))
    }
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })

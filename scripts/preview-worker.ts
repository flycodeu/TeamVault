import { processNextPreview, recoverStalePreviewJobs } from "../lib/preview/worker"

async function main() {
  await recoverStalePreviewJobs()
  while (await processNextPreview()) {
    // Process pending jobs sequentially to keep the single-node workload bounded.
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })

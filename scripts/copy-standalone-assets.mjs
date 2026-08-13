import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceStatic = path.join(projectRoot, ".next", "static")
const targetStatic = path.join(projectRoot, ".next", "standalone", ".next", "static")
const sourcePublic = path.join(projectRoot, "public")
const targetPublic = path.join(projectRoot, ".next", "standalone", "public")

if (!fs.existsSync(sourceStatic)) {
  throw new Error(`Missing build output: ${sourceStatic}`)
}

fs.cpSync(sourceStatic, targetStatic, { recursive: true, force: true })
if (fs.existsSync(sourcePublic)) {
  fs.cpSync(sourcePublic, targetPublic, { recursive: true, force: true })
}

console.log(`Standalone assets copied: ${path.relative(projectRoot, targetStatic)}`)

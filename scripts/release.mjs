import { createRelease, verifyRelease } from "./deployment.mjs"

const action = process.argv[2]
if (!["create", "verify"].includes(action))
  throw new Error("Usage: node scripts/release.mjs create|verify")
const config = {
  site_url: process.env.PUBLIC_SITE_URL,
  app_url: process.env.PUBLIC_APP_URL
}
const release = await (action === "create" ? createRelease : verifyRelease)(
  "dist",
  config,
  process.env.RELEASE_SHA
)
console.log(`${action}: ${release.sha} → ${release.site_url}`)

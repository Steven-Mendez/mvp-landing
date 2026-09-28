import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readdir, readFile, lstat, writeFile } from "node:fs/promises"
import { isIP } from "node:net"
import { join } from "node:path"

export function httpsOrigin(value, name) {
  const url = new URL(value)
  assert(
    url.protocol === "https:" && !url.username && !url.password,
    `${name} must be HTTPS without credentials`
  )
  assert(
    url.pathname === "/" && !url.search && !url.hash,
    `${name} must be an origin, without path, query or fragment`
  )
  assert(
    url.hostname.includes(".") &&
      !isIP(url.hostname) &&
      !url.hostname.endsWith(".localhost") &&
      !url.hostname.endsWith(".local") &&
      !url.hostname.endsWith(".internal") &&
      url.hostname !== "localhost",
    `${name} must be a public hostname`
  )
  return url.origin
}

export function validateConfig(
  config,
  mode = config.app_url ? "connected" : "standalone"
) {
  assert(["standalone", "connected"].includes(mode), "Invalid landing mode")
  if (mode === "connected")
    assert(config.app_url, "Connected mode requires web/url")
  const site_url = httpsOrigin(config.site_url, "landing/url")
  const app_url = config.app_url ? httpsOrigin(config.app_url, "web/url") : ""
  if (app_url)
    assert.notEqual(
      site_url,
      app_url,
      "web/url must point to mvp-web, not the landing"
    )
  return { ...config, site_url, app_url }
}

async function filesIn(directory, prefix = "") {
  const result = []
  for (const name of (await readdir(join(directory, prefix))).sort()) {
    const relative = prefix ? `${prefix}/${name}` : name
    if (relative === "release.json") continue
    const stat = await lstat(join(directory, relative))
    assert(!stat.isSymbolicLink(), `Release contains a symlink: ${relative}`)
    if (stat.isDirectory()) result.push(...(await filesIn(directory, relative)))
    else {
      assert(stat.isFile(), `Invalid release entry: ${relative}`)
      result.push(relative)
    }
  }
  return result.sort()
}

async function checksums(directory) {
  const files = {}
  for (const path of await filesIn(directory)) {
    files[path] = createHash("sha256")
      .update(await readFile(join(directory, path)))
      .digest("hex")
  }
  assert(
    files["index.html"] && files["404.html"],
    "Release must contain the home and 404 pages"
  )
  assert(
    Object.keys(files).some((path) => path.startsWith("_astro/")),
    "Release has no built assets"
  )
  return files
}

export async function createRelease(directory, config, sha) {
  assert(/^[a-f0-9]{40}$/.test(sha), "Release SHA must be a full Git commit")
  const { site_url, app_url } = validateConfig(config)
  const release = {
    sha,
    site_url,
    app_url,
    built_at: new Date().toISOString(),
    files: await checksums(directory)
  }
  await writeFile(
    join(directory, "release.json"),
    `${JSON.stringify(release, null, 2)}\n`
  )
  return release
}

export async function verifyRelease(directory, config, sha) {
  const release = JSON.parse(
    await readFile(join(directory, "release.json"), "utf8")
  )
  const expected = validateConfig(config)
  assert.match(sha, /^[a-f0-9]{40}$/)
  assert.equal(
    release.sha,
    sha,
    "Release commit does not match the selected run"
  )
  assert.equal(
    release.site_url,
    expected.site_url,
    "Release belongs to a different site"
  )
  assert.equal(
    release.app_url,
    expected.app_url,
    "Release uses an obsolete web app URL; rebuild instead"
  )
  assert.deepEqual(
    await checksums(directory),
    release.files,
    "Release contents do not match their checksums"
  )
  return release
}

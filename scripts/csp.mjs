import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const marker = '<meta http-equiv="Content-Security-Policy" content="'

/** Hash the scripts actually emitted by Astro, rather than pinning hashes that drift on rebuilds. */
export function addCsp(html) {
  assert(html.includes("<head>"), "Missing HTML head")
  assert(!html.includes(marker), "CSP already installed")
  const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .filter((match) => match[1])
    .map((match) => createHash("sha256").update(match[1]).digest("base64"))
    .map((hash) => `'sha256-${hash}'`)
  const policy = [
    "default-src 'none'",
    `script-src 'self' ${[...new Set(hashes)].join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "manifest-src 'self'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-src 'none'",
    "object-src 'none'"
  ].join("; ")
  return html.replace("<head>", `<head>${marker}${policy}">`)
}

/** Verify the policy precedes all page content and matches the actual script bytes. */
export function verifyCsp(html) {
  const match =
    /^<!doctype html><html\b[^>]*><head>(<meta http-equiv="Content-Security-Policy" content="[^"]+">)/i.exec(
      html
    )
  assert(match, "Missing enforced CSP at the start of the document head")
  assert.equal(
    addCsp(html.replace(match[1], "")),
    html,
    "CSP does not match the inline scripts or required directives"
  )
}

async function htmlFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)))
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path)
  }
  return files
}

if (process.argv[1]?.endsWith("/csp.mjs")) {
  const files = await htmlFiles("dist")
  assert(files.length, "No built HTML to protect")
  for (const file of files) {
    const html = addCsp(await readFile(file, "utf8"))
    verifyCsp(html)
    await writeFile(file, html)
  }
}

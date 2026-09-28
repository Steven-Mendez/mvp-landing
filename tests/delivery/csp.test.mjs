import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { addCsp, verifyCsp } from "../../scripts/csp.mjs"

test("CSP hashes the exact inline scripts without allowing arbitrary inline JavaScript", () => {
  const script = 'window.theme = "dark"'
  const html = `<html><head></head><body><script>${script}</script><script src="/_astro/app.js"></script></body></html>`
  const protectedHtml = addCsp(html)
  const hash = createHash("sha256").update(script).digest("base64")
  assert.match(
    protectedHtml,
    /<head><meta http-equiv="Content-Security-Policy"/
  )
  assert.ok(protectedHtml.includes(`script-src 'self' 'sha256-${hash}'`))
  assert.ok(protectedHtml.includes("default-src 'none'"))
  assert.ok(protectedHtml.includes("object-src 'none'"))
  assert.ok(!protectedHtml.includes("script-src 'self' 'unsafe-inline'"))
  assert.throws(() => addCsp(protectedHtml), /already installed/)
})

test("verification rejects comment-only policies, misplaced tags and stale hashes", () => {
  const html =
    "<!DOCTYPE html><html><head></head><body><script>window.ok = true</script></body></html>"
  const protectedHtml = addCsp(html)
  assert.doesNotThrow(() => verifyCsp(protectedHtml))
  assert.throws(
    () =>
      verifyCsp(
        html.replace(
          "<head>",
          '<head><!-- <meta http-equiv="Content-Security-Policy" content="script-src \'self\'"> -->'
        )
      ),
    /Missing enforced CSP/
  )
  assert.throws(
    () =>
      verifyCsp(
        protectedHtml.replace("<head><meta", "<head><!-- fake --><meta")
      ),
    /Missing enforced CSP/
  )
  assert.throws(
    () =>
      verifyCsp(protectedHtml.replace("window.ok = true", "window.ok = false")),
    /does not match/
  )
})

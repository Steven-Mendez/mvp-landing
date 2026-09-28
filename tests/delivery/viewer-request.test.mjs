import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

const template = readFileSync("infra/functions/viewer_request.js", "utf8")
const render = (domain = "example.com") => {
  const code = template
    .replaceAll(
      '"__WWW_DOMAIN__"',
      JSON.stringify(domain ? `www.${domain}` : "")
    )
    .replaceAll('"__LANDING_DOMAIN__"', JSON.stringify(domain))
  return runInNewContext(`${code}\nhandler`, {})
}
const request = (host, uri = "/page", querystring = {}) => ({
  headers: { host: { value: host } },
  uri,
  querystring
})

test("only the configured www alias redirects, to a fixed trusted domain", () => {
  const handler = render()
  assert.equal(
    handler({
      request: request("WWW.EXAMPLE.COM", "/hello", { q: { value: "1" } })
    }).headers.location.value,
    "https://example.com/hello?q=1"
  )
  for (const host of [
    "www.evil.com",
    "www.example.com.evil.com",
    "example.com"
  ]) {
    assert.equal(handler({ request: request(host) }).uri, "/page/index.html")
  }
  assert.equal(
    render("")({ request: request("www.evil.com") }).uri,
    "/page/index.html"
  )
})

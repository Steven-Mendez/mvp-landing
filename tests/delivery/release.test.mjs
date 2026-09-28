import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  readFile,
  symlink
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  createRelease,
  verifyRelease,
  validateConfig
} from "../../scripts/deployment.mjs"
import { smoke } from "../../scripts/smoke.mjs"

const config = {
  site_url: "https://example.com",
  app_url: "https://app.example.com"
}
const sha = "a".repeat(40)

test("production rejects missing, insecure or same-origin app configuration", () => {
  for (const app_url of [
    undefined,
    "",
    config.site_url,
    "http://app.example.com",
    "https://localhost",
    "https://user:password@app.example.com",
    "https://app.example.com/login",
    "https://app.example.com?x=1"
  ]) {
    assert.throws(() => validateConfig({ ...config, app_url }, "connected"))
  }
  assert.equal(
    validateConfig({ ...config, app_url: `${config.app_url}/` }).app_url,
    config.app_url
  )
})

test("release round-trip supports rollback and rejects corruption, wrong commit and changed config", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "landing-release-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await mkdir(join(dir, "_astro"))
  await Promise.all(
    ["index.html", "404.html", "_astro/site.js"].map((file) =>
      writeFile(join(dir, file), "original")
    )
  )
  await createRelease(dir, config, sha)
  const manifest = await readFile(join(dir, "release.json"), "utf8")
  assert.equal((await verifyRelease(dir, config, sha)).sha, sha)
  await assert.rejects(verifyRelease(dir, config, "b".repeat(40)), /commit/)
  await assert.rejects(
    verifyRelease(
      dir,
      { ...config, app_url: "https://other.example.com" },
      sha
    ),
    /obsolete/
  )
  await writeFile(join(dir, "index.html"), "corrupted")
  await assert.rejects(verifyRelease(dir, config, sha), /checksums/)
  await writeFile(join(dir, "index.html"), "original")
  await writeFile(join(dir, "unexpected.html"), "extra")
  await assert.rejects(verifyRelease(dir, config, sha), /checksums/)
  await rm(join(dir, "unexpected.html"))
  assert.equal((await verifyRelease(dir, config, sha)).sha, sha)
  assert.equal(await readFile(join(dir, "release.json"), "utf8"), manifest)
  await symlink(join(dir, "index.html"), join(dir, "link.html"))
  await assert.rejects(verifyRelease(dir, config, sha), /symlink/)
})

function server(overrides = {}) {
  const home = `<link rel="canonical" href="${config.site_url}/"><a href="${config.app_url}/login">Sign in</a><a href="${config.app_url}/login?mode=sign-up">Try it live</a><script src="/_astro/site.js"></script>`
  const pages = {
    [`${config.site_url}/`]: [200, home, "text/html"],
    [`${config.site_url}/release.json`]: [
      200,
      JSON.stringify({ ...config, sha }),
      "application/json"
    ],
    [`${config.site_url}/_astro/site.js`]: [200, "script", "text/javascript"],
    [`${config.app_url}/login`]: [200, "Sign in", "text/html"],
    [`${config.app_url}/login?mode=sign-up`]: [
      200,
      "Create account",
      "text/html"
    ],
    ...overrides
  }
  return async (url) => {
    const [status, body, type] = pages[url] || [404, "Not found", "text/html"]
    const response = new Response(body, {
      status,
      headers: { "content-type": type }
    })
    Object.defineProperty(response, "url", { value: url })
    return response
  }
}

test("smoke verifies the release, actual CTA responses, assets and the real 404 status", async () => {
  assert.equal(await smoke(config, sha, server()), sha)
  await assert.rejects(
    smoke(
      config,
      sha,
      server({ [`${config.app_url}/login`]: [404, "Missing", "text/html"] })
    ),
    /expected 200/
  )
  await assert.rejects(
    smoke(
      config,
      sha,
      server({
        [`${config.site_url}/_astro/site.js`]: [404, "Missing", "text/html"]
      })
    ),
    /expected 200/
  )
  await assert.rejects(smoke(config, "b".repeat(40), server()), /old release/)
  await assert.rejects(
    smoke(
      config,
      sha,
      server({
        [`${config.site_url}/__deployment_check_missing_page__`]: [
          200,
          "Home",
          "text/html"
        ]
      })
    ),
    /expected 404/
  )
})

test("a standalone release is healthy without any API or web requests", async () => {
  const standalone = { ...config, app_url: "" }
  const html = `<link rel="canonical" href="${config.site_url}/"><a href="/#workspace">Explore the demo</a><script src="/_astro/site.js"></script>`
  const pages = {
    [`${config.site_url}/`]: [200, html, "text/html"],
    [`${config.site_url}/release.json`]: [
      200,
      JSON.stringify({ ...standalone, sha }),
      "application/json"
    ]
  }
  assert.equal(validateConfig(standalone, "standalone").app_url, "")
  assert.equal(await smoke(standalone, sha, server(pages)), sha)
  await assert.rejects(
    smoke(
      standalone,
      sha,
      server({
        ...pages,
        [`${config.site_url}/`]: [
          200,
          `${html}<a href="/login">Sign in</a>`,
          "text/html"
        ]
      })
    ),
    /must not publish login/
  )
})

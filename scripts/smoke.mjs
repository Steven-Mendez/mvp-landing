import assert from "node:assert/strict"
import { setTimeout } from "node:timers/promises"
import { verifyCsp } from "./csp.mjs"
import { validateConfig } from "./deployment.mjs"

export async function smoke(config, expectedSha, fetcher = fetch) {
  const { site_url, app_url } = validateConfig(config)
  const get = async (url, status = 200) => {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(20000),
      redirect: "follow"
    })
    assert.equal(
      response.status,
      status,
      `${url}: expected ${status}, got ${response.status}`
    )
    return response
  }
  const response = await get(`${site_url}/`)
  assert.match(response.headers.get("content-type") || "", /text\/html/)
  const html = await response.text()
  verifyCsp(html)
  assert(
    html.includes(`rel="canonical" href="${site_url}/"`),
    "Incorrect canonical URL"
  )
  for (const path of app_url ? ["/login", "/login?mode=sign-up"] : []) {
    assert(
      html.includes(`href="${app_url}${path}"`),
      `Missing or incorrect CTA: ${path}`
    )
    const target = await get(`${app_url}${path}`)
    assert.notEqual(
      new URL(target.url).origin,
      site_url,
      "CTA redirects back to the landing"
    )
  }
  if (!app_url) {
    assert(
      !/href="[^"]*\/login(?:[?"/])/.test(html),
      "Standalone mode must not publish login links"
    )
    assert(
      html.includes("Explore the demo") && html.includes('href="/#workspace"'),
      "Standalone mode must offer its on-page demo"
    )
  }
  const notFound = await get(
    `${site_url}/__deployment_check_missing_page__`,
    404
  )
  verifyCsp(await notFound.text())
  const release = await (await get(`${site_url}/release.json`)).json()
  assert.match(release.sha, /^[a-f0-9]{40}$/)
  if (expectedSha)
    assert.equal(
      release.sha,
      expectedSha,
      "An old release is still being served"
    )
  assert.equal(release.site_url, site_url)
  assert.equal(release.app_url, app_url)
  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)[^"]*"/g)].map(
        (match) => match[1]
      )
    )
  ]
  assert(assets.length > 0, "No built assets in the published page")
  await Promise.all(assets.map((asset) => get(`${site_url}${asset}`)))
  return release.sha
}

if (process.argv[1]?.endsWith("/smoke.mjs")) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const sha = await smoke(
        { site_url: process.env.SITE_URL, app_url: process.env.APP_URL },
        process.env.RELEASE_SHA
      )
      console.log(`Production verified: ${sha} at ${process.env.SITE_URL}`)
      break
    } catch (error) {
      if (attempt === 3) throw error
      console.error(`Smoke attempt ${attempt}: ${error.message}`)
      await setTimeout(5000)
    }
  }
}

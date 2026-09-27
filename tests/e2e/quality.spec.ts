import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// The web app (PUBLIC_APP_URL) is another origin that is not running here: answer
// its requests so the CTAs can be followed end to end.
const APP_ORIGIN = "http://localhost:3000"

test.beforeEach(async ({ page }) => {
  // The hero copy runs a CSS entrance; test the settled page.
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.route(`${APP_ORIGIN}/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>Web app</title>" })
  )
})

test("the home page has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()

  expect(results.violations.map(({ id, nodes }) => `${id} (${nodes.length})`)).toEqual([])
})

for (const { name, url } of [
  { name: /try it live/i, url: `${APP_ORIGIN}/login?mode=sign-up` },
  { name: /^sign in$/i, url: `${APP_ORIGIN}/login` },
]) {
  test(`the "${name.source}" call to action opens the web app`, async ({ page, isMobile }) => {
    test.skip(isMobile && name.source.includes("sign in"), "Sign in lives in the mobile menu")
    await page.goto("/")
    await page.getByRole("link", { name }).first().click()
    await expect(page).toHaveURL(url)
  })
}

test("the explore link scrolls to the product preview", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "See it running" }).click()
  await expect(page).toHaveURL(/#workspace$/)
  await expect(page.locator("#workspace")).toBeInViewport()
})

test("the page never scrolls sideways", async ({ page }) => {
  await page.goto("/")
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test("the colour scheme follows the operating system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/")
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)

  await page.emulateMedia({ colorScheme: "light" })
  await expect(page.locator("html")).toHaveClass(/\blight\b/)
})

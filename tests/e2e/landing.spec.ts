import { expect, test } from "@playwright/test"
import { landingNavigation } from "../../src/data/navigation"
import { pageTitle, site } from "../../src/site"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("loads with its title, heading and no console errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))

  await page.reload({ waitUntil: "networkidle" })

  await expect(page).toHaveTitle(pageTitle(site.tagline))
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  expect(errors).toEqual([])
})

test("in-page navigation reaches every section", async ({ page, isMobile }) => {
  test.skip(isMobile, "The desktop navigation is hidden on small screens")
  const nav = page.getByRole("navigation", { name: "Main navigation" })

  for (const { label, hash } of landingNavigation) {
    await nav.getByRole("link", { name: label }).click()
    await expect(page).toHaveURL(new RegExp(`#${hash}$`))
    await expect(page.locator(`#${hash}`)).toBeInViewport()
  }
})

test("the mobile menu opens, navigates and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The menu button only shows on small screens")
  const trigger = page.getByRole("button", { name: "Open navigation" })
  const menu = page.getByRole("dialog", { name: site.name })

  await trigger.click()
  await expect(menu).toBeVisible()
  await expect(trigger).toHaveAttribute("aria-expanded", "true")

  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await expect(trigger).toHaveAttribute("aria-expanded", "false")

  const { label, hash } = landingNavigation[1]
  await trigger.click()
  await menu.getByRole("link", { name: label }).click()
  await expect(menu).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`#${hash}$`))
})

test("the catalog preview searches and switches views once hydrated", async ({ page }) => {
  const search = page.getByRole("textbox", { name: "Search sample products" })
  const catalog = page.getByRole("list", { name: "Sample catalog" })
  const status = page.getByRole("status").filter({ hasText: "sample products" })

  // Disabled until the client:idle island hydrates.
  await expect(search).toBeEnabled()
  await expect(catalog.getByRole("listitem")).toHaveCount(3)

  await search.fill("tote")
  await expect(catalog.getByRole("listitem")).toHaveCount(1)
  await expect(status).toHaveText("1 of 3 sample products")

  await search.fill("nothing like this")
  await expect(page.getByText("No matching products")).toBeVisible()
  await page.getByRole("button", { name: "Clear search" }).click()
  await expect(catalog.getByRole("listitem")).toHaveCount(3)

  await page.getByRole("radio", { name: "List view" }).click()
  await expect(page.getByRole("radio", { name: "List view" })).toHaveAttribute(
    "aria-checked",
    "true"
  )
})

test("FAQ answers expand and collapse", async ({ page }) => {
  const faq = page.locator("#questions")
  const first = faq.locator("details").first()

  await expect(first).not.toHaveAttribute("open")
  await first.locator("summary").click()
  await expect(first).toHaveAttribute("open")
  await first.locator("summary").click()
  await expect(first).not.toHaveAttribute("open")
})

test("sign up links point to the web app", async ({ page }) => {
  const signUp = page.locator('a[href$="/login?mode=sign-up"]').first()
  await expect(signUp).toHaveAttribute("href", /^https?:\/\/[^/]+\/login\?mode=sign-up$/)
})

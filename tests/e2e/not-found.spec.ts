import { expect, test } from "@playwright/test"

test("unknown paths show the 404 page with a way home", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist")

  expect(response?.status()).toBe(404)
  await expect(page.getByText("Page not found")).toBeVisible()

  await page.getByRole("link", { name: "Back to home" }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

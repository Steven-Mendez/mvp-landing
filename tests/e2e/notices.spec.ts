import { expect, test } from "@playwright/test"
import { notices } from "../../src/components/notices/notices"

for (const [id, { message }] of Object.entries(notices)) {
  test(`?notice=${id} shows its toast and cleans the URL`, async ({ page }) => {
    await page.goto(`/?notice=${id}&keep=1`)

    await expect(page.getByText(message)).toBeVisible()
    await expect(page).toHaveURL(/\/\?keep=1$/)
  })
}

test("an unknown notice shows nothing and never loads the toast", async ({
  page
}) => {
  const scripts: string[] = []
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url())
  })

  await page.goto("/?notice=<b>hacked</b>", { waitUntil: "networkidle" })

  await expect(page.locator("[data-sonner-toaster]")).toHaveCount(0)
  await expect(page.getByText("hacked")).toHaveCount(0)
  expect(scripts.filter((url) => url.includes("notice-entry"))).toEqual([])
  await expect(page).toHaveURL(/notice=/)
})

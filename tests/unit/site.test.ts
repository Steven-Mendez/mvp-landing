import { describe, expect, it } from "vitest"
import { pageTitle, site } from "@/site"

describe("pageTitle", () => {
  it("suffixes the page with the site name", () => {
    expect(pageTitle("Pricing")).toBe(`Pricing · ${site.name}`)
  })
})

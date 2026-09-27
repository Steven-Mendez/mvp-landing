import { describe, expect, it } from "vitest"
import BrandLogo from "@/components/brand-logo.astro"
import { site } from "@/site"
import { createContainer, parse } from "./container"

describe("<BrandLogo>", () => {
  it("names the brand by default and loads lazily", async () => {
    const container = await createContainer()
    const img = parse(await container.renderToString(BrandLogo)).querySelector("img")

    expect(img).toHaveAttribute("alt", site.name)
    expect(img).toHaveAttribute("width", "40")
    expect(img).toHaveAttribute("loading", "lazy")
    expect(img?.getAttribute("srcset")).toMatch(/2x.*3x/)
  })

  it("is hidden from assistive tech when decorative, and eager with priority", async () => {
    const container = await createContainer()
    const html = await container.renderToString(BrandLogo, {
      props: { decorative: true, priority: true, class: "mb-3" },
    })
    const img = parse(html).querySelector("img")

    expect(img).toHaveAttribute("alt", "")
    expect(img).toHaveAttribute("loading", "eager")
    expect(img).toHaveAttribute("fetchpriority", "high")
    expect(img).toHaveClass("mb-3", "size-10")
  })
})

import { describe, expect, it } from "vitest"
import Hero from "@/components/landing/hero.astro"
import { createContainer, parse } from "./container"

async function render() {
  const container = await createContainer()
  return parse(await container.renderToString(Hero))
}

describe("hero", () => {
  it("labels the section with its h1", async () => {
    const doc = await render()
    const section = doc.querySelector("section.landing-hero")
    const h1 = doc.querySelector("h1")

    expect(section).toHaveAttribute("aria-labelledby", "hero-heading")
    expect(h1).toHaveAttribute("id", "hero-heading")
    expect(h1?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Your next big idea. Minus the plumbing."
    )
    expect(doc.querySelectorAll("h1")).toHaveLength(1)
    expect(h1?.querySelectorAll(".landing-title-line")).toHaveLength(2)
  })

  it("shows the eyebrow and intro copy", async () => {
    const doc = await render()
    const text = doc.body.textContent?.replace(/\s+/g, " ") ?? ""

    expect(text).toContain("The starter kit for web, iOS and Android")
    expect(text).toContain("Start from a working product, not an empty folder.")
  })

  it("links the primary call to action to sign up", async () => {
    const doc = await render()
    const cta = [...doc.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Try it live")
    )

    expect(cta).toHaveAttribute("href", "http://localhost:3000/login?mode=sign-up")
    expect(cta).toHaveAttribute("data-variant", "default")
  })

  it("links to the running workspace preview", async () => {
    const doc = await render()
    const explore = doc.querySelector("a.landing-explore-link")

    expect(explore).toHaveAttribute("href", "/#workspace")
    expect(explore?.textContent?.trim()).toBe("See it running")
    expect(explore?.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(doc.getElementById("workspace")).not.toBeNull()
  })

  it("lists the included capabilities with decorative icons", async () => {
    const doc = await render()
    const capabilities = doc.querySelector("section.landing-capabilities")

    expect(capabilities).toHaveAttribute("aria-label", "Included in the kit")
    const items = [...(capabilities?.querySelectorAll(":scope > span") ?? [])]
    expect(items.map((s) => s.textContent?.trim())).toEqual([
      "Web, iOS & Android",
      "Accounts & workspaces",
      "Typed API client",
      "Tested & CI-ready",
    ])
    for (const item of items) {
      expect(item.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    }
  })

  it("gives every image an alt attribute", async () => {
    const doc = await render()
    for (const img of doc.querySelectorAll("img")) {
      expect(img.hasAttribute("alt"), img.outerHTML).toBe(true)
    }
  })
})

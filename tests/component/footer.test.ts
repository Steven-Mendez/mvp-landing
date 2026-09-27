import { describe, expect, it } from "vitest"
import Footer from "@/components/landing/footer.astro"
import { landingNavigation } from "@/data/navigation"
import { site } from "@/site"
import { createContainer, parse } from "./container"

async function render() {
  const container = await createContainer()
  return parse(await container.renderToString(Footer))
}

const links = (nav: Element | null) =>
  [...(nav?.querySelectorAll("a") ?? [])].map((a) => [
    a.textContent?.trim(),
    a.getAttribute("href"),
  ])

describe("footer", () => {
  it("links the brand home with the site name", async () => {
    const doc = await render()
    const brand = doc.querySelector("a.landing-brand")

    expect(brand).toHaveAttribute("href", "/")
    expect(brand?.textContent?.trim()).toBe(site.name)
    expect(brand?.querySelector("img")).toHaveAttribute("alt", "")
  })

  it("lists every section and customer stories under Explore", async () => {
    const doc = await render()
    const nav = doc.querySelector('nav[aria-labelledby="footer-product-heading"]')

    expect(doc.getElementById("footer-product-heading")?.textContent).toBe("Explore")
    expect(links(nav)).toEqual([
      ...landingNavigation.map(({ label, hash }) => [label, `/#${hash}`]),
      ["Customer stories", "/#customer-stories"],
    ])
  })

  it("links sign up and sign in under Get started", async () => {
    const doc = await render()
    const nav = doc.querySelector('nav[aria-labelledby="footer-start-heading"]')

    expect(doc.getElementById("footer-start-heading")?.textContent).toBe("Get started")
    expect(links(nav)).toEqual([
      ["Try it live", "http://localhost:3000/login?mode=sign-up"],
      ["Sign in", "http://localhost:3000/login"],
    ])
  })

  it("omits the source link without a repository URL", async () => {
    const doc = await render()
    expect(doc.body.textContent).not.toContain("Get the source")
  })

  it("shows the message and licence", async () => {
    const doc = await render()
    const text = doc.body.textContent?.replace(/\s+/g, " ") ?? ""

    expect(text).toContain("Start with what works.")
    expect(text).toContain("Build what’s next.")
    expect(text).toContain(`© ${site.name}. MIT licensed.`)
    expect(text).toContain("Made for your next big idea.")
  })
})

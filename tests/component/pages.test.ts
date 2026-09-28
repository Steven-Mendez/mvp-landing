import { describe, expect, it } from "vitest"
import { landingNavigation } from "@/data/navigation"
import NotFoundPage from "@/pages/404.astro"
import IndexPage from "@/pages/index.astro"
import { pageTitle, site } from "@/site"
import { createContainer, parse, SITE } from "./container"

type Page = Parameters<
  Awaited<ReturnType<typeof createContainer>>["renderToString"]
>[0]

async function render(page: Page, path = "/") {
  const container = await createContainer()
  const html = await container.renderToString(page, {
    request: new Request(new URL(path, SITE))
  })
  return parse(html)
}

const meta = (doc: Document, selector: string) =>
  doc.querySelector(`meta[${selector}]`)?.getAttribute("content")

describe("index page", () => {
  it("has the title, description and social metadata", async () => {
    const doc = await render(IndexPage)

    expect(doc.title).toBe(pageTitle(site.tagline))
    expect(meta(doc, 'name="description"')).toBe(site.description)
    expect(meta(doc, 'property="og:title"')).toBe(pageTitle(site.tagline))
    expect(meta(doc, 'property="og:image"')).toBe(`${SITE}/brand/social.png`)
    expect(doc.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE}/`
    )
  })

  it("renders one h1 and a section for every navigation link", async () => {
    const doc = await render(IndexPage)

    expect(doc.querySelectorAll("h1")).toHaveLength(1)
    for (const { hash } of landingNavigation) {
      expect(doc.getElementById(hash), `#${hash}`).not.toBeNull()
    }
  })

  it("links sign in and sign up to the web app", async () => {
    const doc = await render(IndexPage)
    const hrefs = [...doc.querySelectorAll("a")].map((a) =>
      a.getAttribute("href")
    )

    expect(hrefs).toContain("http://localhost:3000/login")
    expect(hrefs).toContain("http://localhost:3000/login?mode=sign-up")
  })

  it("server-renders the catalog island with every sample product", async () => {
    const doc = await render(IndexPage)
    const island = doc.querySelector("astro-island")

    expect(island).not.toBeNull()
    expect(island?.getAttribute("client")).toBe("idle")
    expect(
      island?.querySelectorAll('ul[aria-label="Sample catalog"] > li')
    ).toHaveLength(3)
  })
})

describe("404 page", () => {
  it("shows the not-found state without claiming a canonical URL", async () => {
    const doc = await render(NotFoundPage, "/missing")

    expect(doc.title).toBe(site.name)
    expect(
      doc.querySelector("h1, [data-slot=empty-title]")?.textContent
    ).toContain("Page not found")
    expect(doc.querySelector('a[href="/"]')?.textContent).toContain(
      "Back to home"
    )
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
    expect(doc.querySelector('meta[property="og:url"]')).toBeNull()
  })
})

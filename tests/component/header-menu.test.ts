import { describe, expect, it } from "vitest"
import HeaderMenu from "@/components/landing/header-menu.astro"
import { landingNavigation } from "@/data/navigation"
import { site } from "@/site"
import { createContainer, parse } from "./container"

const SIGN_UP = "https://app.example.test/login?mode=sign-up"
const REPOSITORY = "https://github.com/example/repo"

async function render(repository: string | undefined = undefined) {
  const container = await createContainer()
  return parse(
    await container.renderToString(HeaderMenu, {
      props: { repository, signUpHref: SIGN_UP },
    })
  )
}

describe("header menu", () => {
  it("renders a closed trigger that controls the dialog", async () => {
    const doc = await render()
    const root = doc.querySelector("[data-header-menu]")
    const trigger = root?.querySelector("button[data-header-menu-open]")

    expect(root).not.toBeNull()
    expect(trigger).toHaveAttribute("type", "button")
    expect(trigger).toHaveAttribute("aria-label", "Open navigation")
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).toHaveAttribute("aria-controls", "landing-menu")
    expect(trigger).toHaveAttribute("data-variant", "ghost")
    expect(trigger).toHaveAttribute("data-size", "icon")
    expect(trigger?.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("renders a labelled, closed dialog", async () => {
    const doc = await render()
    const dialog = doc.getElementById("landing-menu")

    expect(dialog?.tagName).toBe("DIALOG")
    expect(dialog).not.toHaveAttribute("open")
    expect(dialog).toHaveAttribute("aria-labelledby", "landing-menu-title")
    expect(dialog).toHaveAttribute("aria-describedby", "landing-menu-description")
    expect(doc.getElementById("landing-menu-title")?.textContent?.trim()).toBe(site.name)
    expect(doc.getElementById("landing-menu-description")?.textContent?.trim()).toBe(
      `${site.tagline}.`
    )
  })

  it("links every section and closes on navigation", async () => {
    const doc = await render()
    const nav = doc.querySelector('nav[aria-label="Mobile navigation"]')
    const links = [...(nav?.querySelectorAll("a") ?? [])]

    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute("href")])).toEqual(
      landingNavigation.map(({ label, hash }) => [label, `/#${hash}`])
    )
    for (const link of links) expect(link).toHaveAttribute("data-header-menu-close")
  })

  it("links sign up with the given href", async () => {
    const doc = await render()
    const signUp = [...doc.querySelectorAll("a")].find(
      (a) => a.textContent?.trim() === "Try it now"
    )

    expect(signUp).toHaveAttribute("href", SIGN_UP)
    expect(signUp).toHaveAttribute("data-header-menu-close")
    expect(signUp).toHaveAttribute("data-variant", "default")
  })

  it("has a close button that submits the dialog form", async () => {
    const doc = await render()
    const form = doc.querySelector("dialog form")
    const close = form?.querySelector("button")

    expect(form).toHaveAttribute("method", "dialog")
    expect(close).toHaveAttribute("type", "submit")
    expect(close?.querySelector(".sr-only")?.textContent).toBe("Close")
    expect(close?.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("omits the source link without a repository", async () => {
    const doc = await render(undefined)

    expect(doc.body.textContent).not.toContain("Get the source")
    expect(doc.querySelector('a[target="_blank"]')).toBeNull()
  })

  it("links the source when a repository is given", async () => {
    const doc = await render(REPOSITORY)
    const source = [...doc.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Get the source")
    )

    expect(source).toHaveAttribute("href", REPOSITORY)
    expect(source).toHaveAttribute("target", "_blank")
    expect(source).toHaveAttribute("rel", "noopener noreferrer")
    expect(source?.textContent?.trim()).toBe("Get the source")
  })
})

import { describe, expect, it } from "vitest"
import Header from "@/components/landing/header.astro"
import { landingNavigation } from "@/data/navigation"
import { site } from "@/site"
import { createContainer, parse } from "./container"

async function render() {
  const container = await createContainer()
  return parse(await container.renderToString(Header))
}

describe("header", () => {
  it("links the brand home", async () => {
    const doc = await render()
    const brand = doc.querySelector("a.landing-brand")

    expect(brand).toHaveAttribute("href", "/")
    expect(brand).toHaveAttribute("aria-label", `${site.name} home`)
    expect(brand?.textContent?.trim()).toBe(site.name)
    expect(brand?.querySelector("img")).toHaveAttribute("alt", "")
  })

  it("links every section in the main navigation", async () => {
    const doc = await render()
    const nav = doc.querySelector('nav[aria-label="Main navigation"]')
    const links = [...(nav?.querySelectorAll("a") ?? [])]

    expect(
      links.map((a) => [a.textContent?.trim(), a.getAttribute("href")])
    ).toEqual(landingNavigation.map(({ label, hash }) => [label, `/#${hash}`]))
  })

  it("links sign in and sign up to the web app", async () => {
    const doc = await render()
    const signIn = doc.querySelector("a.landing-sign-in")
    const signUp = [
      ...doc.querySelectorAll("header > .landing-header-actions > a")
    ].find((a) => a.textContent?.includes("Try it now"))

    expect(signIn).toHaveAttribute("href", "http://localhost:3000/login")
    expect(signIn?.textContent?.trim()).toBe("Sign in")
    expect(signUp).toHaveAttribute(
      "href",
      "http://localhost:3000/login?mode=sign-up"
    )
    expect(signUp).toHaveAttribute("data-variant", "default")
  })

  it("includes the mobile menu with the sign up link and no source link", async () => {
    const doc = await render()
    const menu = doc.querySelector("[data-header-menu]")

    expect(menu).not.toBeNull()
    expect(menu?.querySelector("dialog")).toHaveAttribute("id", "landing-menu")
    const menuSignUp = [...(menu?.querySelectorAll("a") ?? [])].find((a) =>
      a.textContent?.includes("Try it now")
    )
    expect(menuSignUp).toHaveAttribute(
      "href",
      "http://localhost:3000/login?mode=sign-up"
    )
    expect(doc.body.textContent).not.toContain("Get the source")
  })
})

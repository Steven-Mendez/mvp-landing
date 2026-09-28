import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.doUnmock("astro:env/client")
  vi.resetModules()
})

async function load(appUrl: string) {
  vi.resetModules()
  vi.doMock("astro:env/client", () => ({ PUBLIC_APP_URL: appUrl }))
  return import("@/lib/app-url")
}

describe("app links", () => {
  it("offers the on-page demo without an application", async () => {
    const { appEnabled, primaryCta, signInHref } = await load("")
    expect(appEnabled).toBe(false)
    expect(primaryCta).toEqual({
      href: "/#workspace",
      label: "Explore the demo"
    })
    expect(signInHref).toThrow("not connected")
  })
  it("joins the app origin and the path", async () => {
    const { appHref, signInHref, signUpHref } = await load(
      "https://app.example.com"
    )
    expect(appHref("/settings")).toBe("https://app.example.com/settings")
    expect(signInHref()).toBe("https://app.example.com/login")
    expect(signUpHref()).toBe("https://app.example.com/login?mode=sign-up")
  })

  it("drops trailing slashes from the origin", async () => {
    const { appHref } = await load("https://app.example.com///")
    expect(appHref("/login")).toBe("https://app.example.com/login")
  })

  it("drops a single trailing slash", async () => {
    const { signInHref } = await load("https://app.example.com/")
    expect(signInHref()).toBe("https://app.example.com/login")
  })

  it("keeps a base path and inner slashes", async () => {
    const { appHref } = await load("https://example.com/app/")
    expect(appHref("/login")).toBe("https://example.com/app/login")
    const { appHref: bare } = await load("https://example.com//app")
    expect(bare("/x")).toBe("https://example.com//app/x")
  })
})

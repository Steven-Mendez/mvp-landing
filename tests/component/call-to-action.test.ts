import { describe, expect, it } from "vitest"
import CallToAction from "@/components/landing/call-to-action.astro"
import { createContainer, parse } from "./container"

async function render(props: { inverse?: boolean } = {}) {
  const container = await createContainer()
  return parse(await container.renderToString(CallToAction, { props }))
}

const signUp = (doc: Document) =>
  [...doc.querySelectorAll("a")].find((a) =>
    a.textContent?.includes("Try it live")
  )

describe("call to action", () => {
  it("links to sign up in the web app", async () => {
    const doc = await render()
    const link = signUp(doc)

    expect(link).toHaveAttribute(
      "href",
      "http://localhost:3000/login?mode=sign-up"
    )
    expect(link?.textContent?.trim()).toBe("Try it live")
    expect(link?.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("uses the default marketing button", async () => {
    const link = signUp(await render())

    expect(link).toHaveAttribute("data-variant", "default")
    expect(link).toHaveAttribute("data-size", "lg")
    expect(link).toHaveAttribute("data-slot", "button")
    expect(link?.getAttribute("class")).toContain("rounded-full")
    expect(link?.getAttribute("class")).toContain("h-12")
  })

  it("switches to the secondary button when inverse", async () => {
    const [plain, inverse] = await Promise.all([
      render(),
      render({ inverse: true })
    ])

    expect(signUp(inverse)).toHaveAttribute("data-variant", "secondary")
    expect(signUp(inverse)?.getAttribute("class")).not.toBe(
      signUp(plain)?.getAttribute("class")
    )
  })

  it("keeps the default button when inverse is false", async () => {
    const link = signUp(await render({ inverse: false }))
    expect(link).toHaveAttribute("data-variant", "default")
  })

  it("omits the source link without a repository URL", async () => {
    const doc = await render()

    expect(doc.querySelectorAll("a")).toHaveLength(1)
    expect(doc.body.textContent).not.toContain("Get the source")
    expect(doc.querySelector('a[target="_blank"]')).toBeNull()
  })
})

import { describe, expect, it } from "vitest"
import Faq from "@/components/landing/faq.astro"
import { site } from "@/site"
import { createContainer, parse } from "./container"

async function render() {
  const container = await createContainer()
  return parse(await container.renderToString(Faq))
}

describe("faq", () => {
  it("is the labelled questions section", async () => {
    const doc = await render()
    const section = doc.querySelector("section")

    expect(section).toHaveAttribute("id", "questions")
    expect(section).toHaveAttribute("aria-labelledby", "questions-heading")
    expect(doc.getElementById("questions-heading")?.textContent?.trim()).toBe(
      "Good questions."
    )
  })

  it("renders a closed disclosure per question", async () => {
    const doc = await render()
    const items = [...doc.querySelectorAll("details")]

    expect(
      items.map((d) => d.querySelector("summary h3")?.textContent)
    ).toEqual([
      `What is ${site.name}?`,
      "Is the product catalog part of my product?",
      "Do I have to ship the mobile app?",
      "What does it cost?",
      "Can I try it before I use it?"
    ])
    for (const item of items) {
      expect(item).not.toHaveAttribute("open")
      expect(item.querySelector("summary")).toHaveAttribute(
        "data-variant",
        "ghost"
      )
      expect(item.querySelector(".landing-faq-icon")).toHaveAttribute(
        "aria-hidden",
        "true"
      )
      expect(
        item.querySelector("p.landing-faq-answer")?.textContent?.trim()
      ).not.toBe("")
    }
  })

  it("answers the cost question", async () => {
    const doc = await render()
    const cost = [...doc.querySelectorAll("details")].find(
      (d) => d.querySelector("h3")?.textContent === "What does it cost?"
    )

    expect(cost?.querySelector("p")?.textContent?.trim()).toBe(
      "The kit is open source under the MIT license. You only pay for the infrastructure you run it on."
    )
  })
})

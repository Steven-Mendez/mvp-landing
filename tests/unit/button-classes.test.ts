import { describe, expect, it } from "vitest"
import { buttonVariants } from "@/components/ui/button"
import { buttonLink, marketingButtonLink } from "@/lib/button-classes"

describe("buttonLink", () => {
  it("mirrors <Button asChild> with the default variant and size", () => {
    expect(buttonLink()).toEqual({
      "data-slot": "button",
      "data-variant": "default",
      "data-size": "default",
      class: buttonVariants(),
    })
  })

  it("carries the variant, size and extra classes", () => {
    const link = buttonLink({ variant: "ghost", size: "icon", className: "size-11" })
    expect(link["data-variant"]).toBe("ghost")
    expect(link["data-size"]).toBe("icon")
    expect(link.class).toContain("size-11")
  })
})

describe("marketingButtonLink", () => {
  it("is a large, rounded button that keeps extra classes", () => {
    const link = marketingButtonLink("outline", "w-full")
    expect(link["data-variant"]).toBe("outline")
    expect(link["data-size"]).toBe("lg")
    expect(link.class).toContain("rounded-full")
    expect(link.class).toContain("w-full")
  })
})

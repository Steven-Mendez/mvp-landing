// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NotFound } from "@/components/not-found"

describe("<NotFound>", () => {
  it("explains the missing page and links home", () => {
    render(<NotFound />)

    expect(screen.getByText("Page not found")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/")
  })
})

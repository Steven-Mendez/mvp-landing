// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CatalogDemo } from "@/components/landing/catalog-demo"
import { type CatalogProduct, demoProducts } from "@/data/demo-products"

// The island's props as hero-preview.astro passes them: the optimized image is a URL.
const products: CatalogProduct[] = demoProducts.map(
  ({ name, sku, price, alt, image }) => ({ name, sku, price, alt, image: image.src })
)

const search = () => screen.getByRole("textbox", { name: "Search sample products" })

describe("<CatalogDemo>", () => {
  it("lists every product with its formatted price", () => {
    render(<CatalogDemo products={products} />)
    const list = screen.getByRole("list", { name: "Sample catalog" })

    expect(within(list).getAllByRole("listitem")).toHaveLength(3)
    expect(within(list).getByText("$186.00")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("3 of 3 sample products")
  })

  it("filters by name or SKU, ignoring case and spaces", () => {
    render(<CatalogDemo products={products} />)

    fireEvent.change(search(), { target: { value: "  TOTE " } })
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent("1 of 3 sample products")

    fireEvent.change(search(), { target: { value: "aud-001" } })
    expect(screen.getByRole("heading", { name: "Studio headphones" })).toBeInTheDocument()
  })

  it("shows the empty state and clears the search", () => {
    render(<CatalogDemo products={products} />)

    fireEvent.change(search(), { target: { value: "bicycle" } })
    expect(screen.getByText("No matching products")).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Sample catalog" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(search()).toHaveValue("")
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it("switches between gallery and list views", () => {
    render(<CatalogDemo products={products} />)
    const gallery = screen.getByRole("radio", { name: "Gallery view" })
    const list = screen.getByRole("radio", { name: "List view" })

    expect(gallery).toHaveAttribute("aria-checked", "true")
    fireEvent.click(list)
    expect(list).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("list", { name: "Sample catalog" })).toHaveClass("divide-y")
  })
})

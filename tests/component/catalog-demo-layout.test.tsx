// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CatalogDemo } from "@/components/landing/catalog-demo"
import { type CatalogProduct, demoProducts } from "@/data/demo-products"

const products: CatalogProduct[] = demoProducts.map(
  ({ name, sku, price, alt, image }) => ({ name, sku, price, alt, image: image.src })
)

const catalog = () => screen.getByRole("list", { name: "Sample catalog" })
const items = () => within(catalog()).getAllByRole("listitem")
const priceRow = (item: HTMLElement) =>
  within(item).getByText("Active").parentElement as HTMLElement

describe("<CatalogDemo> layouts", () => {
  it("renders the gallery layout by default", () => {
    render(<CatalogDemo products={products} />)

    expect(catalog()).toHaveAttribute("class", "grid gap-6 sm:grid-cols-3")
    for (const [index, item] of items().entries()) {
      expect(item).toHaveAttribute("class", "landing-gallery-product")
      const img = within(item).getByRole("img")
      expect(img).toHaveAttribute("class", "rounded-lg object-cover mb-4 aspect-square w-full")
      expect(img).toHaveAttribute("alt", products[index].alt)
      expect(img).toHaveAttribute("src", products[index].image)
      expect(img).toHaveAttribute("width", "800")
      expect(img).toHaveAttribute("height", "800")
      expect(img).toHaveAttribute("loading", "lazy")
      expect(priceRow(item)).toHaveAttribute(
        "class",
        "flex items-center justify-between gap-3 mt-4"
      )
    }
  })

  it("renders the list layout after switching views", () => {
    render(<CatalogDemo products={products} />)
    fireEvent.click(screen.getByRole("radio", { name: "List view" }))

    expect(catalog()).toHaveAttribute("class", "divide-y")
    for (const item of items()) {
      expect(item).toHaveAttribute(
        "class",
        "flex flex-wrap items-center gap-4 py-4 first:pt-0"
      )
      expect(within(item).getByRole("img")).toHaveAttribute(
        "class",
        "rounded-lg object-cover size-16 shrink-0"
      )
      expect(priceRow(item)).toHaveAttribute(
        "class",
        "flex items-center justify-between ml-auto gap-6"
      )
    }
  })

  it("keeps the current layout when the active toggle is clicked again", () => {
    render(<CatalogDemo products={products} />)
    const gallery = screen.getByRole("radio", { name: "Gallery view" })

    fireEvent.click(gallery)
    expect(gallery).toHaveAttribute("aria-checked", "true")
    expect(catalog()).toHaveAttribute("class", "grid gap-6 sm:grid-cols-3")

    const list = screen.getByRole("radio", { name: "List view" })
    fireEvent.click(list)
    fireEvent.click(list)
    expect(list).toHaveAttribute("aria-checked", "true")
    expect(catalog()).toHaveAttribute("class", "divide-y")
  })

  it("enables the controls once hydrated", () => {
    render(<CatalogDemo products={products} />)

    expect(screen.getByRole("textbox", { name: "Search sample products" })).toBeEnabled()
    expect(screen.getByRole("radiogroup", { name: "Preview layout" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Gallery view" })).toBeEnabled()
    expect(screen.getByRole("radio", { name: "List view" })).toBeEnabled()
  })

  it("disables the controls in the server render, before hydration", () => {
    const container = document.createElement("div")
    container.innerHTML = renderToString(<CatalogDemo products={products} />)

    const input = within(container).getByRole("textbox", { name: "Search sample products" })
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute("placeholder", "Search name or SKU…")
    expect(within(container).getByRole("radio", { name: "Gallery view" })).toBeDisabled()
    expect(within(container).getByRole("radio", { name: "List view" })).toBeDisabled()
    expect(within(container).getByRole("status")).toHaveTextContent("3 of 3 sample products")
  })

  it("explains the empty state", () => {
    render(<CatalogDemo products={products} />)
    fireEvent.change(screen.getByRole("textbox", { name: "Search sample products" }), {
      target: { value: "bicycle" },
    })

    expect(screen.getByText("Try “tote”, “desk” or a product SKU.")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("0 of 3 sample products")
  })
})

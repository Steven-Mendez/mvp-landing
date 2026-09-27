import { describe, expect, it, vi } from "vitest"
import { CATALOG_IMAGE_WIDTH, toCatalogProducts } from "@/lib/catalog-products"

const source = [
  {
    name: "Desk collection",
    sku: "DSK-001",
    price: "186",
    alt: "Desk lamp",
    image: { src: "desk.webp" },
    category: "Workspace",
    description: "Extra",
  },
  {
    name: "Everyday tote",
    sku: "TOT-001",
    price: "64",
    alt: "Tote bag",
    image: { src: "tote.webp" },
    category: "Everyday",
    description: "Extra",
  },
]

const fakeOptimize = vi.fn(async (image: { src: string }, width: number) =>
  `/_astro/${image.src}?w=${width}`
)

describe("toCatalogProducts", () => {
  it("uses 640 px by default", () => {
    expect(CATALOG_IMAGE_WIDTH).toBe(640)
  })

  it("keeps only the catalog fields and optimizes each image at 640 px", async () => {
    fakeOptimize.mockClear()
    const products = await toCatalogProducts(source, fakeOptimize)
    expect(products).toEqual([
      {
        name: "Desk collection",
        sku: "DSK-001",
        price: "186",
        alt: "Desk lamp",
        image: "/_astro/desk.webp?w=640",
      },
      {
        name: "Everyday tote",
        sku: "TOT-001",
        price: "64",
        alt: "Tote bag",
        image: "/_astro/tote.webp?w=640",
      },
    ])
    expect(Object.keys(products[0] ?? {}).sort()).toEqual(
      ["alt", "image", "name", "price", "sku"]
    )
    expect(fakeOptimize).toHaveBeenCalledTimes(2)
    expect(fakeOptimize).toHaveBeenNthCalledWith(1, source[0]?.image, 640)
    expect(fakeOptimize).toHaveBeenNthCalledWith(2, source[1]?.image, 640)
  })

  it("accepts another width", async () => {
    const products = await toCatalogProducts(source, fakeOptimize, 320)
    expect(products.map(({ image }) => image)).toEqual([
      "/_astro/desk.webp?w=320",
      "/_astro/tote.webp?w=320",
    ])
  })

  it("keeps the order even when images resolve out of order", async () => {
    const delays = [20, 0]
    const optimize = (image: { src: string }) =>
      new Promise<string>((resolve) =>
        setTimeout(() => resolve(image.src), delays.shift())
      )
    const products = await toCatalogProducts(source, optimize)
    expect(products.map(({ sku, image }) => [sku, image])).toEqual([
      ["DSK-001", "desk.webp"],
      ["TOT-001", "tote.webp"],
    ])
  })

  it("resolves to an empty list without products", async () => {
    const optimize = vi.fn(async () => "x")
    await expect(toCatalogProducts([], optimize)).resolves.toEqual([])
    expect(optimize).not.toHaveBeenCalled()
  })

  it("rejects when an image fails to optimize", async () => {
    const optimize = async () => {
      throw new Error("boom")
    }
    await expect(toCatalogProducts(source, optimize)).rejects.toThrow("boom")
  })
})

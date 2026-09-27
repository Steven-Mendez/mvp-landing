import { describe, expect, it } from "vitest"
import { filterProducts, normalizeQuery } from "@/lib/catalog-search"

const products = [
  { name: "Desk collection", sku: "DSK-001" },
  { name: "Everyday tote", sku: "TOT-001" },
  { name: "Studio headphones", sku: "AUD-001" },
  { name: "Écharpe", sku: "SCF-002" },
]
const names = (list: { name: string }[]) => list.map(({ name }) => name)

describe("normalizeQuery", () => {
  it.each([
    ["", ""],
    ["   ", ""],
    ["\t\n", ""],
    ["Tote", "tote"],
    ["  TOTE  ", "tote"],
    ["Desk Lamp", "desk lamp"],
    ["É", "é"],
  ])("normalizes %j to %j", (search, expected) => {
    expect(normalizeQuery(search)).toBe(expected)
  })
})

describe("filterProducts", () => {
  it("returns every product for an empty search", () => {
    expect(filterProducts(products, "")).toEqual(products)
  })

  it("returns every product for a whitespace-only search", () => {
    expect(filterProducts(products, "   ")).toEqual(products)
  })

  it("matches the name case-insensitively", () => {
    expect(names(filterProducts(products, "TOTE"))).toEqual(["Everyday tote"])
    expect(names(filterProducts(products, "desk COLL"))).toEqual(["Desk collection"])
  })

  it("matches part of a name", () => {
    expect(names(filterProducts(products, "phone"))).toEqual(["Studio headphones"])
  })

  it("matches the SKU case-insensitively", () => {
    expect(names(filterProducts(products, "aud-001"))).toEqual(["Studio headphones"])
    expect(names(filterProducts(products, "SCF"))).toEqual(["Écharpe"])
  })

  it("matches a SKU that is not in the name", () => {
    expect(names(filterProducts(products, "tot-"))).toEqual(["Everyday tote"])
  })

  it("matches either the name or the SKU, keeping the original order", () => {
    expect(names(filterProducts(products, "001"))).toEqual([
      "Desk collection",
      "Everyday tote",
      "Studio headphones",
    ])
    expect(names(filterProducts(products, "o"))).toEqual([
      "Desk collection",
      "Everyday tote",
      "Studio headphones",
    ])
  })

  it("ignores surrounding whitespace", () => {
    expect(names(filterProducts(products, "  tote \n"))).toEqual(["Everyday tote"])
  })

  it("does not ignore inner whitespace", () => {
    expect(filterProducts(products, "everydaytote")).toEqual([])
    expect(names(filterProducts(products, "everyday tote"))).toEqual(["Everyday tote"])
  })

  it("matches unicode case-insensitively", () => {
    expect(names(filterProducts(products, "É"))).toEqual(["Écharpe"])
    expect(names(filterProducts(products, "écharpe"))).toEqual(["Écharpe"])
    expect(filterProducts(products, "Écharpe")).toEqual([])
  })

  it("returns nothing when neither name nor SKU match", () => {
    expect(filterProducts(products, "lamp")).toEqual([])
    expect(filterProducts(products, "xyz-999")).toEqual([])
  })

  it("lowercases the product fields, not only the query", () => {
    const upper = [{ name: "TOTE", sku: "ABC" }, { name: "x", sku: "SKU-9" }]
    expect(filterProducts(upper, "tote")).toEqual([upper[0]])
    expect(filterProducts(upper, "sku-9")).toEqual([upper[1]])
  })

  it("returns an empty list for no products", () => {
    expect(filterProducts([], "")).toEqual([])
    expect(filterProducts([], "tote")).toEqual([])
  })

  it("returns the same objects and does not mutate the input", () => {
    const input = [...products]
    const snapshot = structuredClone(input)
    const result = filterProducts(input, "tote")
    expect(result[0]).toBe(products[1])
    expect(result).not.toBe(input)
    expect(input).toEqual(snapshot)
    expect(filterProducts(input, "")).not.toBe(input)
  })
})

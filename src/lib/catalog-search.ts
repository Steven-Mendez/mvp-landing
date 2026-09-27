/** The search box value as the catalog compares it: trimmed and lowercased. */
export function normalizeQuery(search: string): string {
  return search.trim().toLowerCase()
}

/** Products whose name or SKU contains the search, case-insensitively, in their order. */
export function filterProducts<T extends { name: string; sku: string }>(
  products: readonly T[],
  search: string
): T[] {
  const query = normalizeQuery(search)
  return products.filter(
    ({ name, sku }) =>
      name.toLowerCase().includes(query) || sku.toLowerCase().includes(query)
  )
}

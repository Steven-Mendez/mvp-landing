import { LayoutGrid, List, Search, SearchX } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { CatalogProduct } from "@/data/demo-products"
import { useHydrated } from "@/hooks/use-hydrated"
import { filterProducts } from "@/lib/catalog-search"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

/** React island (client:idle): search, view toggle and the no-results state. */
export function CatalogDemo({ products: all }: { products: CatalogProduct[] }) {
  const hydrated = useHydrated()
  const [search, setSearch] = useState("")
  const [layout, setLayout] = useState("gallery")
  const products = filterProducts(all, search)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-medium text-sm">Product catalog</h2>
          <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground text-xs">
            Interactive preview
          </span>
        </div>
        <p className="text-muted-foreground text-xs">Sample products</p>
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="w-full sm:max-w-xs">
            <InputGroup>
              <InputGroupInput
                disabled={!hydrated}
                aria-label="Search sample products"
                placeholder="Search name or SKU…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
          </div>
          <ToggleGroup
            disabled={!hydrated}
            type="single"
            variant="outline"
            value={layout}
            onValueChange={(value) => {
              if (value) setLayout(value)
            }}
            aria-label="Preview layout"
          >
            <ToggleGroupItem value="gallery" aria-label="Gallery view">
              <LayoutGrid className="size-4" aria-hidden="true" /> Gallery
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="size-4" aria-hidden="true" /> List
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="min-h-80">
          {products.length ? (
            <ul
              aria-label="Sample catalog"
              className={cn(
                layout === "gallery" ? "grid gap-6 sm:grid-cols-3" : "divide-y"
              )}
            >
              {products.map((product) => (
                <li
                  key={product.sku}
                  className={cn(
                    layout === "list" &&
                      "flex flex-wrap items-center gap-4 py-4 first:pt-0",
                    layout === "gallery" && "landing-gallery-product"
                  )}
                >
                  <img
                    src={product.image}
                    alt={product.alt}
                    width={800}
                    height={800}
                    loading="lazy"
                    className={cn(
                      "rounded-lg object-cover",
                      layout === "gallery"
                        ? "mb-4 aspect-square w-full"
                        : "size-16 shrink-0"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {product.sku}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3",
                      layout === "gallery" ? "mt-4" : "ml-auto gap-6"
                    )}
                  >
                    <span className="text-sm tabular-nums">
                      {formatPrice(product.price)}
                    </span>
                    <span className="rounded-md bg-success/10 px-2 py-1 text-success text-xs">
                      Active
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
              <SearchX
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-medium">No matching products</p>
              <p className="text-muted-foreground text-sm">
                Try “tote”, “desk” or a product SKU.
              </p>
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t px-5 py-3 text-muted-foreground text-xs sm:px-6">
        <p role="status" aria-live="polite" aria-atomic="true">
          {products.length} of {all.length} sample products
        </p>
        <p>Search by name or SKU. Try either view.</p>
      </div>
    </div>
  )
}

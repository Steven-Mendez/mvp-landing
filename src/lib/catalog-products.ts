/** Gallery cards are ~260 CSS px wide at most. */
export const CATALOG_IMAGE_WIDTH = 640

interface SourceProduct<Image> {
  name: string
  sku: string
  price: string
  alt: string
  image: Image
}

/** The catalog fields of `Product`, with the image as a plain URL. */
export type CatalogProductOf<Product> = Pick<
  Product,
  Extract<keyof Product, "name" | "sku" | "price" | "alt">
> & { image: string }

/**
 * The island gets plain strings: the optimized image URL instead of the import.
 * Only the fields the catalog renders are kept.
 */
export function toCatalogProducts<Image, Product extends SourceProduct<Image>>(
  products: readonly Product[],
  optimize: (image: Image, width: number) => Promise<string>,
  width = CATALOG_IMAGE_WIDTH
): Promise<CatalogProductOf<Product>[]> {
  return Promise.all(
    products.map(
      async ({ name, sku, price, alt, image }) =>
        ({
          name,
          sku,
          price,
          alt,
          image: await optimize(image, width),
        }) as CatalogProductOf<Product>
    )
  )
}

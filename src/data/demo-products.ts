import deskCollection from "@/assets/landing/desk-collection.webp"
import everydayTote from "@/assets/landing/everyday-tote.webp"
import studioHeadphones from "@/assets/landing/studio-headphones.webp"

// Illustrative content for the public preview, never customer catalog data.
// Images are imported so astro:assets can resize and fingerprint them.
export const demoProducts = [
  {
    name: "Desk collection",
    category: "Workspace essentials",
    description: "A little room to do your best work.",
    price: "186",
    image: deskCollection,
    alt: "Blue desk lamp, ceramic pencil cup and a charcoal notebook",
    sku: "DSK-001",
  },
  {
    name: "Everyday tote",
    category: "Everyday essentials",
    description: "For everything your day brings.",
    price: "64",
    image: everydayTote,
    alt: "Natural canvas tote bag with dark handles",
    sku: "TOT-001",
  },
  {
    name: "Studio headphones",
    category: "Audio essentials",
    description: "Find a little space to focus.",
    price: "249",
    image: studioHeadphones,
    alt: "Over-ear studio headphones on a neutral surface",
    sku: "AUD-001",
  },
] as const

export type DemoProduct = (typeof demoProducts)[number]

/** A product as the catalog island receives it: plain strings, image already optimized. */
export type CatalogProduct = Pick<
  DemoProduct,
  "name" | "sku" | "price" | "alt"
> & {
  image: string
}

import { getImage } from "astro:assets"

/**
 * A resized, fingerprinted WebP of a local image (astro:assets), for places that keep
 * the original markup: a plain <img> with its own width/height, or a React island prop.
 */
export async function optimizedImage(src: ImageMetadata, width: number) {
  const image = await getImage({ src, width, format: "webp" })
  return image.src
}

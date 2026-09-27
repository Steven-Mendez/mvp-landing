import { getContainerRenderer as reactContainerRenderer } from "@astrojs/react/container-renderer"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { loadRenderers } from "astro:container"
import { JSDOM } from "jsdom"

export const SITE = "https://landing.test"

/**
 * An Astro container that can also server-render the page's React islands. The
 * container does not read astro.config.mjs, so `site` (for absolute URLs) is set here.
 */
export async function createContainer() {
  const renderers = await loadRenderers([reactContainerRenderer()])
  return AstroContainer.create({ renderers, astroConfig: { site: SITE } })
}

/**
 * Parses rendered HTML so tests can query it like a page. Astro renders only in
 * node, so these tests parse with jsdom instead of running in its environment.
 */
export function parse(html: string) {
  return new JSDOM(html).window.document
}

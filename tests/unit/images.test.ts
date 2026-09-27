import { beforeEach, describe, expect, it, vi } from "vitest"

const { getImage } = vi.hoisted(() => ({ getImage: vi.fn() }))
vi.mock("astro:assets", () => ({ getImage }))

import { optimizedImage } from "@/lib/images"

const source = { src: "/photo.png", width: 1600, height: 1600, format: "png" } as ImageMetadata

beforeEach(() => {
  getImage.mockReset()
  getImage.mockResolvedValue({ src: "/_astro/photo.hash.webp" })
})

describe("optimizedImage", () => {
  it("asks astro:assets for a WebP at the given width and returns its URL", async () => {
    await expect(optimizedImage(source, 640)).resolves.toBe("/_astro/photo.hash.webp")
    expect(getImage).toHaveBeenCalledExactlyOnceWith({ src: source, width: 640, format: "webp" })
  })
})

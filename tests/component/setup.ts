import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"

// Unmount React trees between the jsdom tests; Astro tests run in node.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react")
  afterEach(cleanup)
}

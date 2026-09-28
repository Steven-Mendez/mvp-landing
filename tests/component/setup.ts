import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"

// Unmount React trees between the jsdom tests; Astro tests run in node.
if (typeof document !== "undefined") {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const { cleanup } = await import("@testing-library/react")
  afterEach(cleanup)
}

import { expect, it } from "vitest"

// Imported inside the test: a formatter the module cannot build then fails this test
// instead of the whole file, which the mutation runner would not count as a failure.
it("builds its US dollar formatter when the module loads", async () => {
  const { formatPrice } = await import("@/lib/format")

  expect(formatPrice("186")).toBe("$186.00")
})

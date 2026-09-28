import { describe, expect, it } from "vitest"
import {
  DISPLAY_CURRENCY,
  DISPLAY_LOCALE,
  formatPrice,
  MISSING
} from "@/lib/format"

describe("display settings", () => {
  it("formats in English, in US dollars, with an em dash for missing values", () => {
    expect(DISPLAY_LOCALE).toBe("en")
    expect(DISPLAY_CURRENCY).toBe("USD")
    expect(MISSING).toBe("—")
  })
})

describe("formatPrice", () => {
  it.each([
    ["186", "$186.00"],
    ["64.5", "$64.50"],
    [" 249 ", "$249.00"],
    ["0", "$0.00"],
    ["1234.567", "$1,234.57"],
    [" 12 ", "$12.00"],
    ["\t7\n", "$7.00"],
    ["-1.5", "-$1.50"],
    ["1e3", "$1,000.00"],
    ["0.005", "$0.01"],
    ["1000000", "$1,000,000.00"]
  ])("formats %j as %j", (amount, expected) => {
    expect(formatPrice(amount)).toBe(expected)
  })

  it.each([
    "",
    "   ",
    "\t\n",
    "abc",
    "12abc",
    "Infinity",
    "-Infinity",
    "NaN",
    "1e400"
  ])("shows the missing placeholder for %j", (amount) => {
    expect(formatPrice(amount)).toBe(MISSING)
  })
})

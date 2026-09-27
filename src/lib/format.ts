// Vendored from the shared formatters: only what the landing renders.
export const DISPLAY_LOCALE = "en"
export const DISPLAY_CURRENCY = "USD"

export const MISSING = "—"

const price = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: "currency",
  currency: DISPLAY_CURRENCY,
})

export function formatPrice(amount: string): string {
  const value = amount.trim() === "" ? Number.NaN : Number(amount)
  return Number.isFinite(value) ? price.format(value) : MISSING
}

// price is minor units (piastres — 1 EGP = 100), as returned by the API.
export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(price / 100);
}

/**
 * The same number without its currency, for the places that print the unit
 * separately — a large figure over an "EGP / mo" caption, which is how the
 * compact tier rows and the checkout totals compare two prices.
 *
 * Writing "EGP 1,900" over "EGP / mo" says EGP twice in two lines, and the
 * second one is the half that carries the actual information (that this is a
 * monthly rate rather than the term total). Anywhere the price stands alone,
 * formatPrice is still the right call — a bare "1,900" with no unit near it
 * is not a price.
 */
export function formatAmount(price: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price / 100);
}

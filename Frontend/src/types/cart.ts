import type { ProductSize } from "./product";

export type CartLineUnavailableReason =
  | "ok"
  | "invalid_product"
  | "not_found"
  | "inactive"
  | "out_of_stock";

// Mirrors the backend's ResolvedCartLine — every field here comes from
// re-pricing against the live Product record, never from anything the
// client sent. `unitPrice`/`name`/etc. are null only when `available` is
// false (the product vanished, deactivated, or sold out).
export interface ResolvedCartLine {
  productId: string;
  size: ProductSize;
  available: boolean;
  reason: CartLineUnavailableReason;
  requestedQuantity: number;
  quantity: number;
  availableStock: number;
  unitPrice: number | null;
  lineTotal: number;
  name: string | null;
  slug: string | null;
  color: string | null;
  image: string | null;
}

export interface ResolvedCart {
  items: ResolvedCartLine[];
  subtotal: number;
  // True when the server's view no longer matches what was requested —
  // a price changed, stock ran out, a quantity got clamped, a product was
  // deactivated. The UI should surface this rather than silently proceeding.
  hasChanges: boolean;
}

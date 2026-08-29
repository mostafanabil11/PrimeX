import { AlertTriangle } from "lucide-react";
import type { ResolvedCartLine } from "@/types/cart";

const REASON_COPY: Record<string, string> = {
  out_of_stock: "is out of stock",
  inactive: "is no longer available",
  not_found: "is no longer available",
  invalid_product: "is no longer available",
};

// Shown wherever a resolved cart's hasChanges flag is true — the client's
// view of the cart (what was in localStorage, or what was shown a moment
// ago) no longer matches what the server will actually charge. Never lets
// that discrepancy pass silently.
export function CartChangedBanner({ items }: { items: ResolvedCartLine[] }) {
  const unavailable = items.filter((i) => !i.available);
  const clamped = items.filter((i) => i.available && i.quantity !== i.requestedQuantity);

  if (unavailable.length === 0 && clamped.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 flex gap-3 border border-destructive/40 bg-destructive/10 p-4 text-[13px] text-foreground">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="font-semibold">Your bag has changed</p>
        {unavailable.map((item) => (
          <p key={`${item.productId}-${item.size}`} className="text-muted-foreground">
            {item.name ?? "An item"} ({item.size}) {REASON_COPY[item.reason] ?? "is no longer available"} and was removed.
          </p>
        ))}
        {clamped.map((item) => (
          <p key={`${item.productId}-${item.size}-qty`} className="text-muted-foreground">
            Only {item.availableStock} of {item.name} ({item.size}) {item.availableStock === 1 ? "is" : "are"} left — quantity updated.
          </p>
        ))}
      </div>
    </div>
  );
}

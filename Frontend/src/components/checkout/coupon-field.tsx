"use client";

import { useState } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { validateCoupon } from "@/lib/api/coupons";
import { useAppliedCoupon } from "@/hooks/use-applied-coupon";
import { formatPrice } from "@/lib/format";
import type { ResolvedCartLine } from "@/types/cart";
import { apiErrorMessage } from "@/lib/api-error";

// Cart and auth state arrive as props rather than via useCart(). This
// component renders inside screens that hide themselves while auth is
// resolving, so subscribing to that same query here would unmount and
// remount an observer on every state change — which re-triggers the query
// on mount and never lets it settle.
//
// guestEmail is only available on the checkout page, where a guest has
// entered one. On the cart page it's absent and the server previews the
// discount without the per-person check, which it repeats at checkout.
export function CouponField({
  items,
  isAuthenticated,
  guestEmail,
}: {
  items: ResolvedCartLine[];
  isAuthenticated: boolean;
  guestEmail?: string | null;
}) {
  const { coupon, setCoupon } = useAppliedCoupon();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      validateCoupon(
        code.trim(),
        isAuthenticated
          ? undefined
          : {
              email: guestEmail,
              items: items.map((i) => ({
                productId: i.productId,
                size: i.size,
                quantity: i.quantity,
              })),
            },
      ),
    onSuccess: (applied) => {
      setCoupon(applied);
      setError(null);
      setCode("");
    },
    onError: (err: unknown) => {
      setError(apiErrorMessage(err, "That coupon code isn't valid"));
    },
  });

  if (coupon) {
    return (
      <div className="flex items-center justify-between border border-foreground bg-muted px-4 py-3 text-[13px]">
        <span className="flex items-center gap-2 text-foreground">
          <Tag className="size-3.5" strokeWidth={1.75} />
          <span className="font-semibold tracking-[0.03em]">{coupon.code}</span>
          <span className="text-muted-foreground">
            {coupon.freeShipping ? "Free shipping applied" : `−${formatPrice(coupon.discountAmount)} applied`}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setCoupon(null)}
          aria-label="Remove coupon"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) mutation.mutate();
        }}
        className="flex items-stretch border border-border"
      >
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          placeholder="Coupon code"
          disabled={mutation.isPending}
          className="min-w-0 flex-1 bg-background px-4 py-3 text-[13px] tracking-[0.03em] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={!code.trim() || mutation.isPending}
          className="flex items-center gap-1.5 border-l border-border px-5 font-mono text-[12px] font-medium tracking-[0.05em] text-foreground uppercase transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mutation.isPending && <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />}
          Apply
        </button>
      </form>
      {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

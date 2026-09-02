"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAppliedCoupon } from "@/hooks/use-applied-coupon";
import { formatPrice } from "@/lib/format";
import { CartChangedBanner } from "@/components/products/cart-changed-banner";
import { CouponField } from "@/components/checkout/coupon-field";
import { requireShop } from "@/lib/features";

export default function CartPage() {
  requireShop();

  const { cart, isLoading, isAuthenticated, updateQuantity, removeItem } = useCart();
  const { coupon } = useAppliedCoupon();
  const items = cart.items;

  if (!isLoading && items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center px-margin-mobile py-stack-xl text-center md:px-margin-desktop">
        <h1 className="mb-4 font-heading text-headline-md font-bold text-foreground">
          Your Bag is Empty
        </h1>
        <p className="mb-8 text-body-md text-muted-foreground">
          Explore the collection and find something you love.
        </p>
        <Link
          href="/"
          className="ui-action inline-flex bg-primary px-8 py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const hasUnavailable = items.some((i) => !i.available);
  // Mirrors the backend's own checkout gate exactly (see OrdersService.checkout)
  // — hasChanges stays true until the stored quantity is corrected via
  // updateQuantity below, so a clamped-but-still-"available" line still
  // blocks checkout rather than clicking through to a guaranteed 409.
  const canCheckout = !isLoading && items.length > 0 && !hasUnavailable && !cart.hasChanges;

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <h1 className="mb-12 font-heading text-headline-sm font-bold text-foreground md:text-headline-md">
        Shopping Bag
      </h1>

      <CartChangedBanner items={items} />

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        {/* Items */}
        <div className="md:col-span-2">
          <div className="divide-y divide-border border-t border-b border-border">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size}`}
                className={`flex gap-6 py-6 ${!item.available ? "opacity-50" : ""}`}
              >
                <Link
                  href={item.slug ? `/products/${item.slug}` : "#"}
                  className="relative aspect-3/4 w-24 shrink-0 bg-muted"
                >
                  {item.image && (
                    <Image src={item.image} alt={item.name ?? ""} fill className="object-cover" sizes="96px" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={item.slug ? `/products/${item.slug}` : "#"}>
                        <h3 className="text-body-md text-foreground">{item.name ?? "Unavailable item"}</h3>
                      </Link>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {item.color} · Size {item.size}
                      </p>
                      {!item.available && (
                        <p className="mt-1 font-mono text-[12px] font-semibold text-destructive uppercase">No longer available</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.size)}
                      aria-label="Remove item"
                      className="ui-action ui-action--icon ui-action--ghost inline-flex text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 border border-border">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                        disabled={!item.available}
                        aria-label="Decrease quantity"
                        className="ui-action ui-action--icon ui-action--ghost inline-flex p-2 text-foreground transition-opacity hover:opacity-70 disabled:opacity-30"
                      >
                        <Minus className="size-3.5" strokeWidth={1.5} />
                      </button>
                      <span className="min-w-4 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                        disabled={!item.available || item.quantity >= item.availableStock}
                        aria-label="Increase quantity"
                        className="ui-action ui-action--icon ui-action--ghost inline-flex p-2 text-foreground transition-opacity hover:opacity-70 disabled:opacity-30"
                      >
                        <Plus className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground">
                      {item.available ? formatPrice(item.lineTotal) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="h-fit bg-muted p-8">
          <h2 className="mb-6 font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase">
            Order Summary
          </h2>
          <div className="mb-3 flex items-center justify-between text-body-md">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatPrice(cart.subtotal)}</span>
          </div>
          {coupon && (
            <div className="mb-3 flex items-center justify-between text-body-md">
              <span className="text-muted-foreground">Discount ({coupon.code})</span>
              <span className="text-foreground">
                {coupon.freeShipping ? "Free shipping" : `−${formatPrice(coupon.discountAmount)}`}
              </span>
            </div>
          )}
          <p className="mb-6 text-[12px] text-muted-foreground">
            Shipping and taxes calculated at checkout.
          </p>
          {/* Shown to guests too — they can hold a coupon just as easily as a
              member. The per-person cap is checked against their email at
              checkout, which is the first point we know one. */}
          <div className="mb-6">
            <CouponField items={items} isAuthenticated={isAuthenticated} />
          </div>
          {/* One button for everyone. Checkout takes an email and address
              inline, so there is nothing to sign in *for* — the option to do
              so lives on the checkout page itself, next to the email field. */}
          <Link
            href="/checkout"
            aria-disabled={!canCheckout}
            className={`ui-action block w-full py-4 text-center text-button font-medium tracking-[0.05em] uppercase transition-colors ${
              canCheckout
                ? "bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                : "pointer-events-none bg-primary/40 text-primary-foreground/70"
            }`}
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

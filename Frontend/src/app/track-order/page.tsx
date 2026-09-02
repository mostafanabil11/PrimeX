"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useMutation } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { lookupOrder, getOrderToken } from "@/lib/api/orders";
import { OrderDetail } from "@/components/orders/order-detail";
import type { Order } from "@/types/order";
import { requireShop } from "@/lib/features";
import { apiErrorStatus } from "@/lib/api-error";
import { fieldInput, fieldLabel } from "@/components/ui/form-classes";

// Shared with every other form on the site — see ui/form-classes.ts. The
// label keeps its own block layout; only the type treatment is shared.
const inputClass = fieldInput;
const labelClass = `mb-2 block ${fieldLabel}`;

// Lets anyone who ordered — guest or member — reach an order with the pair of
// things only they should have: the order number and the email it was placed
// with. This is the fallback for a guest whose one-time checkout token is
// gone (new tab, new device, next week).
export default function TrackOrderPage() {
  requireShop();

  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => lookupOrder(orderNumber.trim(), email.trim()),
    onSuccess: (found) => {
      setOrder(found);
      setError(null);
    },
    onError: (err: unknown) => {
      setOrder(null);
      // The server deliberately can't distinguish "no such order" from "not
      // yours", so neither can this message.
      setError(
        apiErrorStatus(err) === 429
          ? "Too many attempts — please wait a minute and try again."
          : "We couldn't find an order with that number and email address.",
      );
    },
  });

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 font-heading text-headline-md font-bold text-foreground">Track Your Order</h1>
        <p className="mb-8 text-body-md text-muted-foreground">
          Enter your order number and the email address you used at checkout.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (orderNumber.trim() && email.trim()) mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className={labelClass} htmlFor="track-orderNumber">
              Order Number
            </label>
            <input
              id="track-orderNumber"
              required
              placeholder="VLT-20260819-0001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              disabled={mutation.isPending}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="track-email">
              Email
            </label>
            <input
              id="track-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mutation.isPending}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={!orderNumber.trim() || !email.trim() || mutation.isPending}
            className="ui-action flex w-full items-center justify-center gap-2 bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Search className="size-4" strokeWidth={1.75} />
            )}
            Find Order
          </button>
        </form>

        {error && (
          <p className="mt-4 border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
            {error}
          </p>
        )}
      </div>

      {order && (
        <div className="mt-12">
          {/* Cancelling needs the checkout token (or an account), not just the
              number-and-email pair that got us this far — see OrderDetail. */}
          <OrderDetail order={order} canCancel={!!getOrderToken(order.orderNumber)} />
          <div className="mx-auto mt-8 max-w-xl">
            <Link
              href="/"
              className="ui-action block w-full bg-primary py-4 text-center text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

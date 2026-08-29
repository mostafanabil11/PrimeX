"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cancelOrder } from "@/lib/api/orders";
import type { Order } from "@/types/order";
import { apiErrorMessage } from "@/lib/api-error";

// A customer can only back out before any money has actually moved — see
// OrdersService.cancelOrder on the backend for why paymentStatus is the
// deciding factor rather than fulfillmentStatus alone.
function isCancellable(order: Order) {
  return order.paymentStatus === "pending" && ["unfulfilled", "processing"].includes(order.fulfillmentStatus);
}

// canCancel is passed in rather than inferred, because being able to *see* an
// order isn't the same as being entitled to cancel it. An order reached by
// order-number-plus-email alone is read-only: that pair is knowable by other
// people, and cancelling is destructive.
export function OrderDetail({ order, canCancel = true }: { order: Order; canCancel?: boolean }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(order.orderNumber),
    onSuccess: (updated) => {
      queryClient.setQueryData(["orders", order.orderNumber], updated);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
      setConfirming(false);
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Could not cancel this order"));
      setConfirming(false);
    },
  });

  return (
    <div className="mx-auto max-w-xl">
      <div className="divide-y divide-border border-t border-b border-border">
        {order.items.map((item) => (
          <div key={`${item.product}-${item.size}`} className="flex items-center gap-4 py-4">
            <div className="relative aspect-3/4 w-16 shrink-0 bg-muted">
              {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">{item.name}</p>
              <p className="text-[12px] text-muted-foreground">
                {item.color} · Size {item.size} · Qty {item.quantity}
              </p>
            </div>
            <p className="text-[13px] text-foreground">{formatPrice(item.lineTotal)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">{formatPrice(order.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-foreground">{order.shippingCost === 0 ? "Free" : formatPrice(order.shippingCost)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-foreground">−{formatPrice(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2 text-[15px] font-semibold">
          <span className="text-foreground">Total</span>
          <span className="text-foreground">{formatPrice(order.total)}</span>
        </div>
      </div>

      {order.trackingNumber && (
        <div className="mt-6 flex items-center justify-between border border-foreground p-4 text-[13px]">
          <span className="flex items-center gap-3 text-foreground">
            <Truck className="size-4" strokeWidth={1.5} />
            Tracking Number
          </span>
          <span className="font-medium text-foreground">{order.trackingNumber}</span>
        </div>
      )}

      <div className="mt-8 border border-border bg-muted p-6 text-[13px]">
        <p className="mb-2 font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase">Shipping To</p>
        <p className="text-foreground">
          {order.shippingAddress.firstName} {order.shippingAddress.lastName}
        </p>
        <p className="text-muted-foreground">{order.shippingAddress.addressLine}</p>
        <p className="text-muted-foreground">
          {order.shippingAddress.city}, {order.shippingAddress.governorate}
        </p>
        <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
        <p className="mt-2 text-foreground">
          Payment:{" "}
          {order.paymentMethod === "cod"
            ? "Cash on Delivery"
            : order.paymentStatus === "paid"
              ? "Paid by card"
              : order.paymentStatus === "refunded"
                ? "Refunded"
                : order.paymentStatus === "failed"
                  ? "Card payment failed"
                  : "Card — awaiting payment"}
        </p>
      </div>

      {canCancel && isCancellable(order) && (
        <div className="mt-8 text-center">
          {confirming ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[13px] text-foreground">Cancel this order? This can&apos;t be undone.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="border border-destructive px-6 py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] text-destructive uppercase transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel Order"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={cancelMutation.isPending}
                  className="border border-border px-6 py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] text-foreground uppercase transition-colors hover:bg-muted"
                >
                  Never Mind
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-[13px] text-muted-foreground underline hover:text-foreground"
            >
              Cancel this order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

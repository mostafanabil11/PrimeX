"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAdminOrder, updateOrderStatus } from "@/lib/api/orders";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { requireShop } from "@/lib/features";
import { apiErrorMessage } from "@/lib/api-error";

export default function AdminOrderDetailPage() {
  requireShop();

  const params = useParams<{ orderNumber: string }>();
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin", "orders", params.orderNumber],
    queryFn: () => getAdminOrder(params.orderNumber),
  });

  const statusMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateOrderStatus>[1]) => updateOrderStatus(params.orderNumber, data),
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update order")),
  });

  if (isLoading || !order) {
    return <div className="h-64 animate-pulse bg-muted" />;
  }

  const canShip =
    ["unfulfilled", "processing"].includes(order.fulfillmentStatus) &&
    (order.paymentMethod === "cod" || order.paymentStatus === "paid");
  const canDeliver = order.fulfillmentStatus === "shipped";
  const canRefund = order.paymentStatus === "paid";

  return (
    <div>
      <Link href="/admin/orders" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to orders
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-headline-sm font-bold text-foreground">{order.orderNumber}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {order.user ? `${order.user.firstName} ${order.user.lastName} · ${order.user.email}` : "—"}
          </p>
        </div>
        <OrderStatusBadge fulfillmentStatus={order.fulfillmentStatus} paymentStatus={order.paymentStatus} />
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="divide-y divide-border border-t border-b border-border">
            {order.items.map((item) => (
              <div key={`${item.product}-${item.size}`} className="flex items-center gap-4 py-3">
                <div className="relative aspect-3/4 w-14 shrink-0 bg-muted">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />}
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
                <span className="text-muted-foreground">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span className="text-foreground">−{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2 text-[15px] font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">{formatPrice(order.total)}</span>
            </div>
          </div>

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
            <p className="mt-2 text-foreground">Payment method: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Card"}</p>
            {order.trackingNumber && <p className="text-foreground">Tracking: {order.trackingNumber}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-border p-5">
            <h2 className="mb-4 font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase">Actions</h2>

            {canShip && (
              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] text-muted-foreground">Tracking number (optional)</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mb-2 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                />
                <button
                  type="button"
                  onClick={() =>
                    statusMutation.mutate({
                      fulfillmentStatus: "shipped",
                      ...(trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
                    })
                  }
                  disabled={statusMutation.isPending}
                  className="w-full bg-primary py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] text-primary-foreground uppercase hover:bg-primary/90 disabled:opacity-50"
                >
                  Mark as Shipped
                </button>
              </div>
            )}

            {canDeliver && (
              <button
                type="button"
                onClick={() => statusMutation.mutate({ fulfillmentStatus: "delivered" })}
                disabled={statusMutation.isPending}
                className="mb-3 w-full bg-primary py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] text-primary-foreground uppercase hover:bg-primary/90 disabled:opacity-50"
              >
                Mark as Delivered
              </button>
            )}

            {canRefund && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Mark this order as refunded? This only records the status — process the actual refund through Paymob separately.")) {
                    statusMutation.mutate({ paymentStatus: "refunded" });
                  }
                }}
                disabled={statusMutation.isPending}
                className="w-full border border-destructive py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] text-destructive uppercase hover:bg-destructive/10 disabled:opacity-50"
              >
                Mark as Refunded
              </button>
            )}

            {!canShip && !canDeliver && !canRefund && (
              <p className="text-[12px] text-muted-foreground">No actions available for this order&apos;s current status.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

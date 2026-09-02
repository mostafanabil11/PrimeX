"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAdminOrders } from "@/lib/api/orders";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { FulfillmentStatus, PaymentStatus } from "@/types/order";
import { requireShop } from "@/lib/features";

const FULFILLMENT_OPTIONS: FulfillmentStatus[] = ["unfulfilled", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_OPTIONS: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

export default function AdminOrdersPage() {
  requireShop();

  const [page, setPage] = useState(1);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", page, fulfillmentStatus, paymentStatus],
    queryFn: () =>
      getAdminOrders({
        page,
        limit: 20,
        fulfillmentStatus: fulfillmentStatus || undefined,
        paymentStatus: paymentStatus || undefined,
      }),
  });

  const selectClass = "border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground";

  return (
    <div>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">Orders</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={fulfillmentStatus}
          onChange={(e) => {
            setFulfillmentStatus(e.target.value as FulfillmentStatus | "");
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All fulfillment statuses</option>
          {FULFILLMENT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as PaymentStatus | "");
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All payment statuses</option>
          {PAYMENT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : data.items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No orders match these filters.</p>
      ) : (
        <>
          <div className="divide-y divide-border border-t border-b border-border">
            {data.items.map((order) => (
              <Link
                key={order._id}
                href={`/admin/orders/${order.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{order.orderNumber}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {order.user ? `${order.user.firstName} ${order.user.lastName} · ${order.user.email}` : "—"}
                  </p>
                </div>
                <OrderStatusBadge fulfillmentStatus={order.fulfillmentStatus} paymentStatus={order.paymentStatus} />
                <p className="shrink-0 text-[13px] text-foreground">{formatPrice(order.total)}</p>
              </Link>
            ))}
          </div>

          {data.pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 text-[13px]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="ui-action ui-action--ghost ui-action--sm inline-flex text-muted-foreground underline disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="ui-action ui-action--ghost ui-action--sm inline-flex text-muted-foreground underline disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

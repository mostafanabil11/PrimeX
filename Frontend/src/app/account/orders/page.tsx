"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getOrders } from "@/lib/api/orders";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { requireShop } from "@/lib/features";

export default function OrderHistoryPage() {
  requireShop();

  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/account/orders");
    }
  }, [userLoading, user, router]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    enabled: !!user,
  });

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <h1 className="mb-12 font-heading text-headline-sm font-bold text-foreground md:text-headline-md">
        Order History
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-muted" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="mb-8 text-body-lg text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/"
            className="bg-primary px-8 py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border border-t border-b border-border">
          {orders.map((order) => (
            <Link
              key={order.orderNumber}
              href={`/account/orders/${order.orderNumber}`}
              className="flex flex-col gap-3 py-6 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-body-md font-medium text-foreground">{order.orderNumber}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {" · "}
                  {order.items.reduce((sum, i) => sum + i.quantity, 0)} item
                  {order.items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <OrderStatusBadge fulfillmentStatus={order.fulfillmentStatus} paymentStatus={order.paymentStatus} />
                <p className="text-body-md font-semibold text-foreground">{formatPrice(order.total)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

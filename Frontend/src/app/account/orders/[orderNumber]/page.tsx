"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getOrder } from "@/lib/api/orders";
import { OrderDetail } from "@/components/orders/order-detail";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { requireShop } from "@/lib/features";

export default function AccountOrderDetailPage() {
  requireShop();

  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace(`/login?next=/account/orders/${params.orderNumber}`);
    }
  }, [userLoading, user, router, params.orderNumber]);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["orders", params.orderNumber],
    queryFn: () => getOrder(params.orderNumber),
    enabled: !!user,
  });

  if (userLoading || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
        <div className="h-40 animate-pulse bg-muted" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center px-margin-mobile py-stack-xl text-center md:px-margin-desktop">
        <h1 className="mb-4 font-heading text-headline-md font-bold text-foreground">Order Not Found</h1>
        <Link href="/account/orders" className="text-[13px] text-muted-foreground underline">
          Back to order history
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <Link href="/account/orders" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to order history
      </Link>

      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-headline-sm font-bold text-foreground md:text-headline-md">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge fulfillmentStatus={order.fulfillmentStatus} paymentStatus={order.paymentStatus} />
      </div>

      <OrderDetail order={order} />
    </div>
  );
}

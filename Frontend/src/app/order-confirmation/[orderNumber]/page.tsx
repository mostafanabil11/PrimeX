"use client";

import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { getOrder } from "@/lib/api/orders";
import { OrderDetail } from "@/components/orders/order-detail";
import { requireShop } from "@/lib/features";

export default function OrderConfirmationPage() {
  requireShop();

  const params = useParams<{ orderNumber: string }>();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["orders", params.orderNumber],
    queryFn: () => getOrder(params.orderNumber),
  });

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
        {/* The most likely cause for a guest is a reopened link in a new tab:
            the one-time token lives in sessionStorage and doesn't survive
            that. The email lookup is the way back in. */}
        <p className="mb-6 max-w-md text-body-md text-muted-foreground">
          If you checked out as a guest, look your order up with your order number and the email address you
          used.
        </p>
        <Link
          href="/track-order"
          className="ui-action inline-flex bg-primary px-8 py-3 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
        >
          Track Your Order
        </Link>
        <Link href="/" className="mt-6 text-[13px] text-muted-foreground underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <div className="mb-12 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-foreground" strokeWidth={1} />
        <h1 className="mb-2 font-heading text-headline-md font-bold text-foreground">Order Confirmed</h1>
        <p className="text-body-md text-muted-foreground">
          Thank you — your order <strong className="text-foreground">{order.orderNumber}</strong> has been placed.
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          A confirmation email is on its way. Keep your order number — you can{" "}
          <Link href="/track-order" className="underline underline-offset-2 hover:text-foreground">
            track this order
          </Link>{" "}
          with it any time.
        </p>
      </div>

      <OrderDetail order={order} />

      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="ui-action mt-8 block w-full bg-primary py-4 text-center text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

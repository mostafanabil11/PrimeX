"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";

// Landing point for the payment provider's browser redirect. The webhook is
// what actually settles the order, so this page's only job is to route the
// customer somewhere sensible — it never decides the outcome itself.
export function CheckoutResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const status = params.get("status");
  const orderNumber = params.get("order");

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["cart", "server"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });

    if (status === "success" && orderNumber) {
      router.replace(`/order-confirmation/${orderNumber}`);
    }
  }, [status, orderNumber, router, queryClient]);

  if (status === "success") {
    return (
      <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center px-margin-mobile py-stack-xl text-center md:px-margin-desktop">
        <Loader2 className="mb-4 size-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
        <p className="text-body-md text-muted-foreground">Confirming your payment…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center px-margin-mobile py-stack-xl text-center md:px-margin-desktop">
      <XCircle className="mb-4 size-12 text-destructive" strokeWidth={1} />
      <h1 className="mb-3 font-heading text-headline-md font-bold text-foreground">Payment Not Completed</h1>
      <p className="mb-2 max-w-md text-body-md text-muted-foreground">
        Your payment wasn&apos;t completed, so we haven&apos;t charged you and your order hasn&apos;t been placed.
      </p>
      <p className="mb-8 max-w-md text-[13px] text-muted-foreground">
        Your bag is still saved — you can try again with the same card or choose cash on delivery.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/checkout"
          className="bg-primary px-8 py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
        >
          Try Again
        </Link>
        <Link
          href="/cart"
          className="border border-border px-8 py-4 text-button font-medium tracking-[0.05em] text-foreground uppercase transition-colors hover:bg-muted"
        >
          Back to Bag
        </Link>
      </div>
    </div>
  );
}

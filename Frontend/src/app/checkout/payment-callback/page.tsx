import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentCallbackContent } from "./payment-callback-content";
import { requireShop } from "@/lib/features";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Processing Payment"),
  robots: { index: false, follow: false },
};

export default function PaymentCallbackPage() {
  requireShop();

  return (
    <Suspense>
      <PaymentCallbackContent />
    </Suspense>
  );
}

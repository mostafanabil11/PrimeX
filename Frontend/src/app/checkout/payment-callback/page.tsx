import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentCallbackContent } from "./payment-callback-content";
import { requireShop } from "@/lib/features";

export const metadata: Metadata = {
  title: "Processing Payment — Valiant",
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

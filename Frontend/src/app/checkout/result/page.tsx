import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutResultContent } from "./result-content";
import { requireShop } from "@/lib/features";

export const metadata: Metadata = {
  title: "Payment Result — Valiant",
  robots: { index: false, follow: false },
};

export default function CheckoutResultPage() {
  requireShop();

  return (
    <Suspense>
      <CheckoutResultContent />
    </Suspense>
  );
}

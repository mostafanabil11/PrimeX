import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutResultContent } from "./result-content";
import { requireShop } from "@/lib/features";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Payment Result"),
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

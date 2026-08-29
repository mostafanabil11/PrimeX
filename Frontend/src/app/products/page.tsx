import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductsContent } from "./products-content";
import { requireShop } from "@/lib/features";

export const metadata: Metadata = {
  title: "Shop All Products — Valiant",
  description: "Browse the full Valiant collection — modern essentials, made to last.",
};

export default function ProductsPage() {
  requireShop();

  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}

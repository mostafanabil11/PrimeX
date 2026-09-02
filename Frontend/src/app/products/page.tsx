import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductsContent } from "./products-content";
import { requireShop } from "@/lib/features";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Shop All Products"),
  description: `Browse the full ${BRAND.name} collection — modern essentials, made to last.`,
};

export default function ProductsPage() {
  requireShop();

  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}

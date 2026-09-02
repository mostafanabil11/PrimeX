"use client";

import { Link } from "@/i18n/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { requireShop } from "@/lib/features";

export default function NewProductPage() {
  requireShop();

  return (
    <div>
      <Link href="/admin/products" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to products
      </Link>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">New Product</h1>
      <ProductForm />
    </div>
  );
}

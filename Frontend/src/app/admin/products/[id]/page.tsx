"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminProduct, getStockMovements } from "@/lib/api/products";
import { ProductForm } from "@/components/admin/product-form";
import { requireShop } from "@/lib/features";

export default function EditProductPage() {
  requireShop();

  const params = useParams<{ id: string }>();

  const productQuery = useQuery({
    queryKey: ["admin", "products", params.id],
    queryFn: () => getAdminProduct(params.id),
  });

  const movementsQuery = useQuery({
    queryKey: ["admin", "products", params.id, "movements"],
    queryFn: () => getStockMovements(params.id),
    enabled: !!productQuery.data,
  });

  return (
    <div>
      <Link href="/admin/products" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to products
      </Link>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">
        {productQuery.data?.name ?? "Edit Product"}
      </h1>

      {productQuery.isLoading ? (
        <div className="h-96 max-w-2xl animate-pulse bg-muted" />
      ) : !productQuery.data ? (
        <p className="text-[13px] text-muted-foreground">Product not found.</p>
      ) : (
        <div className="space-y-12">
          <ProductForm product={productQuery.data} />

          <section className="max-w-2xl">
            <h2 className="mb-4 font-heading text-headline-sm font-bold text-foreground">Stock Movement History</h2>
            {!movementsQuery.data || movementsQuery.data.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No stock movements recorded yet.</p>
            ) : (
              <div className="divide-y divide-border border-t border-b border-border text-[13px]">
                {movementsQuery.data.map((m) => (
                  <div key={m._id} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-foreground">Size {m.size}</span>
                    <span className={m.quantityChange > 0 ? "text-foreground" : "text-destructive"}>
                      {m.quantityChange > 0 ? "+" : ""}
                      {m.quantityChange}
                    </span>
                    <span className="text-muted-foreground">→ {m.resultingStock}</span>
                    <span className="text-muted-foreground capitalize">{m.reason.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

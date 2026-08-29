"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getAdminProducts } from "@/lib/api/products";
import { formatPrice } from "@/lib/format";
import { requireShop } from "@/lib/features";

export default function AdminProductsPage() {
  requireShop();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", page, q],
    queryFn: () => getAdminProducts({ page, limit: 20, q: q.trim() || undefined }),
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-headline-sm font-bold text-foreground">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-primary px-5 py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] text-primary-foreground uppercase hover:bg-primary/90"
        >
          <Plus className="size-4" strokeWidth={2} />
          New Product
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Search products…"
        className="mb-6 w-full max-w-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground"
      />

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : data.items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No products found.</p>
      ) : (
        <>
          <div className="divide-y divide-border border-t border-b border-border">
            {data.items.map((product) => (
              <Link
                key={product._id}
                href={`/admin/products/${product._id}`}
                className={`flex items-center gap-4 py-3 hover:bg-muted ${!product.isActive ? "opacity-50" : ""}`}
              >
                <div className="relative aspect-3/4 w-12 shrink-0 bg-muted">
                  {product.images[0] && (
                    <Image src={product.images[0]} alt="" fill className="object-cover" sizes="48px" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{product.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {product.color} · {typeof product.category === "object" ? product.category.name : ""}
                    {!product.isActive && " · Inactive"}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] text-foreground">{formatPrice(product.price)}</p>
                <p className="w-24 shrink-0 text-right text-[12px] text-muted-foreground">
                  {product.sizes.reduce((sum, s) => sum + s.stock, 0)} in stock
                </p>
              </Link>
            ))}
          </div>

          {data.pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 text-[13px]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-muted-foreground underline disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="text-muted-foreground underline disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

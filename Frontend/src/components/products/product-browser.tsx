"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getProductColors } from "@/lib/api/products";
import { ProductCard } from "@/components/products/product-card";
import type { ProductSize } from "@/types/product";

type Sort = "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function ProductBrowser({
  categoryId,
  size,
  q,
  onSale,
}: {
  categoryId?: string;
  size?: ProductSize;
  q?: string;
  onSale?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort>("newest");
  const [color, setColor] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: colors } = useQuery({ queryKey: ["products", "colors"], queryFn: getProductColors });

  // Resets to page 1 whenever a filter changes, without an effect — an
  // effect here would run after the stale page had already fetched once,
  // producing a visible flash of the wrong page before it corrects itself.
  // This is React's own documented pattern for "adjust state when a prop
  // changes": compare against the previous filters during render, and call
  // setState conditionally in the render body. React re-renders immediately
  // with the corrected state before anything is painted, so there is no
  // extra frame and no infinite loop — the branch only runs when something
  // actually changed.
  const filters = { categoryId, size, sort, q, color, minPrice, maxPrice, onSale };
  const [prevFilters, setPrevFilters] = useState(filters);
  const filtersChanged = (Object.keys(filters) as (keyof typeof filters)[]).some(
    key => filters[key] !== prevFilters[key],
  );
  if (filtersChanged) {
    setPrevFilters(filters);
    setPage(1);
  }

  const minPriceMinor = minPrice.trim() ? Math.round(parseFloat(minPrice) * 100) : undefined;
  const maxPriceMinor = maxPrice.trim() ? Math.round(parseFloat(maxPrice) * 100) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["products", { categoryId, size, sort, page, q, color, minPriceMinor, maxPriceMinor, onSale }],
    queryFn: () =>
      getProducts({
        category: categoryId,
        size,
        sort,
        page,
        limit: 12,
        q,
        color: color || undefined,
        minPrice: minPriceMinor,
        maxPrice: maxPriceMinor,
        onSale,
      }),
  });

  const hasActiveFilters = !!color || !!minPrice || !!maxPrice;

  function clearFilters() {
    setColor("");
    setMinPrice("");
    setMaxPrice("");
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {isLoading ? "Loading…" : `${data?.pagination.total ?? 0} products`}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`ui-control flex items-center gap-2 border px-3 py-2 font-mono text-[12px] font-medium tracking-[0.05em] uppercase transition-colors ${
              hasActiveFilters ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
            Filters
            {hasActiveFilters && <span className="size-1.5 rounded-full bg-primary" />}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="border border-input bg-background px-3 py-2 font-mono text-base md:text-[12px] font-medium tracking-[0.05em] text-foreground uppercase outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtersOpen && (
        <div className="mb-8 flex flex-wrap items-end gap-4 border border-border p-4">
          <div>
            <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Color
            </label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="border border-input bg-background px-3 py-2 text-base md:text-[13px] text-foreground outline-none focus:border-foreground"
            >
              <option value="">Any color</option>
              {(colors ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Min Price (EGP)
            </label>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-28 border border-input bg-background px-3 py-2 text-base md:text-[13px] text-foreground outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Max Price (EGP)
            </label>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-28 border border-input bg-background px-3 py-2 text-base md:text-[13px] text-foreground outline-none focus:border-foreground"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ui-action ui-action--ghost flex items-center gap-1.5 text-[12px] text-muted-foreground underline hover:text-foreground"
            >
              <X className="size-3.5" strokeWidth={1.75} />
              Clear filters
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-3/4 animate-pulse bg-muted" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-body-lg text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
            {data.items.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          {data.pagination.pages > 1 && (
            <div className="mt-16 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="ui-action ui-action--icon ui-action--ghost inline-flex -m-2 p-2 text-foreground transition-opacity hover:opacity-70 disabled:opacity-30"
              >
                <ChevronLeft className="size-5" strokeWidth={1.5} />
              </button>
              <p className="font-mono text-[12px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                Page {data.pagination.page} of {data.pagination.pages}
              </p>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page >= data.pagination.pages}
                aria-label="Next page"
                className="ui-action ui-action--icon ui-action--ghost inline-flex -m-2 p-2 text-foreground transition-opacity hover:opacity-70 disabled:opacity-30"
              >
                <ChevronRight className="size-5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

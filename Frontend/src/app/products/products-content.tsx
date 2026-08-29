"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api/products";
import { ProductBrowser } from "@/components/products/product-browser";
import { CategoryPageHeader } from "@/components/products/category-page-header";

export function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category") ?? undefined;

  // Pull the category name from the first result's populated category field —
  // avoids needing a separate "get category by id" endpoint just for a heading.
  const { data } = useQuery({
    queryKey: ["products", { categoryId, page: 1, headingLookup: true }],
    queryFn: () => getProducts({ category: categoryId, page: 1, limit: 1 }),
    enabled: Boolean(categoryId),
  });

  const firstProductCategory = data?.items[0]?.category;
  const heading =
    categoryId && firstProductCategory && typeof firstProductCategory !== "string"
      ? firstProductCategory.name
      : "All Products";

  return (
    <div>
      <CategoryPageHeader title={heading} />
      <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
        <ProductBrowser categoryId={categoryId} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChildCategoryBySlugServer } from "@/lib/api/categories";
import { ProductBrowser } from "@/components/products/product-browser";
import { CategoryPageHeader } from "@/components/products/category-page-header";
import { requireShop } from "@/lib/features";

type Params = Promise<{ slug: string; childSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, childSlug } = await params;
  const category = await getChildCategoryBySlugServer(slug, childSlug);

  if (!category) {
    return { title: "Category Not Found — Valiant" };
  }

  const description = category.description ?? `Shop ${category.name} at Valiant — modern essentials, made to last.`;

  return {
    title: `${category.name} — Valiant`,
    description,
    openGraph: {
      title: `${category.name} — Valiant`,
      description,
      images: category.image ? [{ url: category.image }] : undefined,
      type: "website",
    },
  };
}

export default async function ChildCategoryPage({ params }: { params: Params }) {
  requireShop();

  const { slug, childSlug } = await params;
  const category = await getChildCategoryBySlugServer(slug, childSlug);

  if (!category) {
    notFound();
  }

  return (
    <div>
      <CategoryPageHeader title={category.name} description={category.description} />

      <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-8 md:py-12 md:px-margin-desktop">
        <ProductBrowser categoryId={category._id} />
      </div>
    </div>
  );
}

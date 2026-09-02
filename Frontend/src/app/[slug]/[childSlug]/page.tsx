import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChildCategoryBySlugServer } from "@/lib/api/categories";
import { ProductBrowser } from "@/components/products/product-browser";
import { CategoryPageHeader } from "@/components/products/category-page-header";
import { requireShop, SHOP_ENABLED } from "@/lib/features";
import { BRAND, pageTitle } from "@/lib/brand";

type Params = Promise<{ slug: string; childSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, childSlug } = await params;

  // This route is the site-wide catch-all: it answers EVERY unrecognised URL,
  // not just category ones. With the shop switched off it therefore stands in
  // for the 404 page, and it must say so — a mistyped address used to put
  // "Category Not Found" in the browser tab of a gym website, which describes
  // a concept the visitor has never been shown. Short-circuiting before the
  // fetch also saves an API round trip on every bad URL and every bot probe.
  if (!SHOP_ENABLED) {
    return { title: pageTitle("Page Not Found"), robots: { index: false, follow: false } };
  }
  const category = await getChildCategoryBySlugServer(slug, childSlug);

  if (!category) {
    return { title: pageTitle("Category Not Found") };
  }

  const description = category.description ?? `Shop ${category.name} at ${BRAND.name} — modern essentials, made to last.`;

  return {
    title: `${category.name} — ${BRAND.name}`,
    description,
    openGraph: {
      title: `${category.name} — ${BRAND.name}`,
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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlugServer, getTopLevelCategorySlugsServer } from "@/lib/api/categories";
import { ProductBrowser } from "@/components/products/product-browser";
import { CategoryPageHeader } from "@/components/products/category-page-header";
import { requireShop } from "@/lib/features";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getTopLevelCategorySlugsServer();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlugServer(slug);

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

export default async function CategoryPage({ params }: { params: Params }) {
  requireShop();

  const { slug } = await params;
  const category = await getCategoryBySlugServer(slug);

  if (!category) {
    notFound();
  }

  return (
    <div>
      <CategoryPageHeader title={category.name} description={category.description} />

      <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-8 md:py-12 md:px-margin-desktop">
        {/* Subcategory pills */}
        {category.children && category.children.length > 0 && (
          <div className="mb-12 flex flex-wrap justify-center gap-3">
            {category.children.map((child) => (
              <Link
                key={child._id}
                href={`/products?category=${child._id}`}
                className="border border-border px-5 py-2 font-mono text-[12px] font-semibold tracking-[0.05em] text-foreground uppercase transition-colors hover:border-primary hover:bg-primary/10"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}

        <ProductBrowser categoryId={category._id} />
      </div>
    </div>
  );
}

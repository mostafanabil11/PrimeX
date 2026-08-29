import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlugServer, getAllProductSlugsServer } from "@/lib/api/products";
import { getStoreSettings } from "@/lib/api/settings";
import { ProductDetailView } from "@/components/products/product-detail-view";
import { RelatedProducts } from "@/components/products/related-products";
import { RecentlyViewed } from "@/components/products/recently-viewed";
import { formatPrice } from "@/lib/format";
import { requireShop } from "@/lib/features";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugsServer();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugServer(slug);

  if (!product) {
    return { title: "Product Not Found — Valiant" };
  }

  const price = formatPrice(product.discountPrice ?? product.price);
  const description = product.description
    ? product.description
    : `${product.name} in ${product.color} — ${price}. Shop the collection at Valiant.`;

  return {
    title: `${product.name} — Valiant`,
    description,
    openGraph: {
      title: `${product.name} — Valiant`,
      description,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  requireShop();

  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlugServer(slug), getStoreSettings()]);

  if (!product) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
  const priceMinorUnits = product.discountPrice ?? product.price;

  // Product structured data — this is what lets a Google search result show
  // price and availability directly instead of just a plain blue link.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description ?? `${product.name} in ${product.color}`,
    sku: product._id,
    color: product.color,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: settings.currency,
      price: (priceMinorUnits / 100).toFixed(2),
      availability: totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.averageRating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailView product={product} />
      <RelatedProducts products={product.relatedProducts} />
      <RecentlyViewed excludeId={product._id} />
    </>
  );
}

import type { MetadataRoute } from "next";
import { getAllProductSlugsServer } from "@/lib/api/products";
import { getTopLevelCategorySlugsServer } from "@/lib/api/categories";
import {
  getClassTypesServer,
  getTrainersServer,
} from "@/lib/api/gym-server";
import { SHOP_ENABLED } from "@/lib/features";
import { siteUrl as canonicalSiteUrl } from "@/lib/brand";

const STATIC_ROUTES: Array<[string, number]> = [
  ["/membership", 0.9],
  ["/classes", 0.8],
  ["/trainers", 0.7],
  ["/contact", 0.6],
  ["/faq", 0.5],
  ["/privacy", 0.3],
  ["/terms", 0.3],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Via the shared helper, not process.env directly. NEXT_PUBLIC_SITE_URL is
  // typed into a dashboard by hand and a trailing slash is the natural way to
  // paste a URL — which turned every entry below into a double slash
  // (…app//classes/fitness), and a crawler reads that as a different URL from
  // the canonical tag on the page itself. brand.ts already strips it; this
  // file was the one place reading the variable raw.
  const siteUrl = canonicalSiteUrl();

  const [classTypes, trainers] = await Promise.all([
    getClassTypesServer(),
    getTrainersServer(),
  ]);

  const routes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },

    ...STATIC_ROUTES.map(([path, priority]) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "weekly" as const,
      priority,
    })),

    ...classTypes.map((c) => ({
      url: `${siteUrl}/classes/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),

    ...trainers.map((t) => ({
      url: `${siteUrl}/trainers/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // Listing the catalogue while the shop is switched off would advertise URLs
  // that answer 404 — a direct way to lose crawl budget and rankings.
  if (!SHOP_ENABLED) {
    return routes;
  }

  const [productSlugs, categorySlugs] = await Promise.all([
    getAllProductSlugsServer(),
    getTopLevelCategorySlugsServer(),
  ]);

  return [
    ...routes,
    { url: `${siteUrl}/products`, changeFrequency: "daily", priority: 0.9 },
    ...categorySlugs.map((slug) => ({
      url: `${siteUrl}/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...productSlugs.map((slug) => ({
      url: `${siteUrl}/products/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

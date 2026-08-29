import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

  // Signed-in surfaces and the checkout funnel, always disallowed.
  const disallow = ["/account", "/admin", "/login", "/signup", "/search", "/cart", "/checkout"];

  // Showcase mode: /join and /schedule redirect elsewhere while these flags
  // are off (next.config.ts) — disallow them so a crawler that ignores the
  // redirect doesn't index a dead end. See lib/features.ts.
  // /join/result is a payment-return page and is never worth indexing. /join
  // itself is where people sign up, so it stays crawlable unless nothing lives
  // there at all.
  disallow.push("/join/result");
  if (
    process.env.NEXT_PUBLIC_MEMBERSHIP_SALES_ENABLED !== "true" &&
    process.env.NEXT_PUBLIC_MEMBERSHIP_TRACKING_ENABLED !== "true"
  ) {
    disallow.push("/join");
  }
  if (process.env.NEXT_PUBLIC_CLASS_BOOKING_ENABLED !== "true") {
    disallow.push("/schedule");
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

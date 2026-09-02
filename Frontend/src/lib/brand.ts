// Single source of truth for the customer-facing brand, mirroring
// ConfigService.brandName on the backend. Page metadata, email-facing copy and
// layout chrome all read from here, so renaming the gym is one edit plus an
// environment variable rather than a find-and-replace across the app.
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "PrimeX",
  // Straight off the logo lockup. Kept in that sentence case deliberately —
  // it is set uppercase wherever the design calls for caps, but the canonical
  // string stays readable for page titles, share cards and email subjects.
  tagline: "Commit to be fit",
  description:
    "Industrial strength discipline in Fayoum. Strength, conditioning and coaching for people who refuse to settle.",

  // The gym-wide support line and the InstaPay account money is transferred
  // to. Deliberately separate from the per-branch phone/whatsappNumber on a
  // branch record: those route to a specific reception desk, these reach the
  // business itself and stay the same whichever branch a member trains at.
  //
  // Kept as two variables even though one number currently answers both, so
  // splitting them later is an environment change rather than a code change.
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "01020598691",
  instapay: process.env.NEXT_PUBLIC_INSTAPAY_NUMBER ?? "01020598691",
} as const;

// "Classes — PrimeX". Pages spell out their own titles rather than
// relying on a Next.js title template, because several already include the
// brand and a template would append it twice.
export function pageTitle(page: string): string {
  return `${page} — ${BRAND.name}`;
}

/**
 * The site's own origin, no trailing slash.
 *
 * Structured data needs absolute URLs — a relative one is silently ignored by
 * search engines rather than resolved — so this is the single place that
 * decides what "this site" means, matching metadataBase in layout.tsx.
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

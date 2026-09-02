"use client";

import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "@/i18n/config";

/**
 * The routes that replace the site shell with their own checkout chrome.
 *
 * `/join` only, and deliberately not `/join/result` — once the payment has
 * been attempted the visitor is finished with the funnel and wants the site
 * back, so the header returns on the page that tells them what happened.
 */
const CHECKOUT_ROUTES = ["/join"];

function isCheckout(pathname: string): boolean {
  return CHECKOUT_ROUTES.includes(stripLocalePrefix(pathname));
}

/**
 * Hides the site header, marquee, footer and floating action bar while
 * somebody is inside the join funnel.
 *
 * WHY: the funnel was wrapped in the full site shell, which put six ways to
 * leave in front of a page whose entire job is to be finished — a nav bar with
 * seven links, a scrolling strip of marketing claims, a floating WhatsApp
 * button, and a footer with another eleven. That is a lot of exits to offer
 * somebody halfway through paying, and the marquee in particular is a moving
 * object competing for attention with a form asking for a date of birth.
 *
 * What replaces it is CheckoutHeader: a back arrow, the title, and a padlock.
 * The exit is still there — it is just one exit, and it goes back rather than
 * sideways.
 *
 * ---------------------------------------------------------------------------
 * A CLIENT COMPONENT WRAPPING SERVER CHILDREN, which is the point of taking
 * them as `children` rather than importing them here. SiteHeader and SiteFooter
 * are async server components that fetch the branch record; they stay server
 * components and are rendered by the layout as always. This only decides
 * whether the finished output is placed in the tree.
 *
 * The cost is that their data is fetched on a route that discards them — but
 * it is the same cached server fetch the layout already makes for the action
 * bar's phone number, so it is not an extra round trip.
 */
export function HideOnCheckout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isCheckout(pathname)) return null;
  return <>{children}</>;
}

/**
 * The inverse: chrome that appears ONLY inside the funnel.
 *
 * Kept here rather than in the join page so the two halves of the decision —
 * what goes away and what arrives — are one file and cannot drift into a route
 * with neither or both.
 */
export function ShowOnCheckout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (!isCheckout(pathname)) return null;
  return <>{children}</>;
}

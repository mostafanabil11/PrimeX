import { notFound } from "next/navigation";

// The retail storefront this codebase started life as — products, cart,
// checkout, orders, wishlist. It is fully built and tested, so it is switched
// off rather than deleted: reviving it later is a flag flip plus real
// inventory, while rebuilding it from scratch would be weeks.
//
// While this is false the routes 404 and nothing links to them. The backend
// modules stay registered; they are unreachable from the UI and their tests
// keep running, which is what stops them silently rotting.
export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === "true";

// Call at the top of any page that only makes sense with the shop switched on.
// Returning a 404 rather than redirecting is deliberate: to the outside world
// these routes genuinely do not exist yet.
export function requireShop(): void {
  if (!SHOP_ENABLED) {
    notFound();
  }
}

// Showcase mode, 2026: the site displays what the gym offers, but membership
// activation and class booking both happen offline over WhatsApp with the
// gym team rather than on this site. These flags are what would flip when
// that changes — the join funnel, the timetable, invoices, subscriptions and
// bookings are all still here, just unreachable from the UI, exactly like
// the shop above. Each one mirrors a backend env var of the same name; see
// Backend/src/config/env.validation.ts.
//
// MEMBER_ACCOUNTS_ENABLED gates registration and the member-facing account
// pages ONLY. It must never be read as "can anyone sign in" — /login stays
// reachable regardless, because staff use it to reach /admin.
// MEMBERSHIP_SALES_ENABLED means online CARD CHECKOUT — the Paymob funnel.
// MEMBERSHIP_TRACKING_ENABLED means membership records exist and staff work
// them: website reservations, the admin invoice table, cash at the desk. The
// gym does the second without the first, which is why these are two flags.
export const MEMBERSHIP_SALES_ENABLED =
  process.env.NEXT_PUBLIC_MEMBERSHIP_SALES_ENABLED === "true";
export const MEMBERSHIP_TRACKING_ENABLED =
  process.env.NEXT_PUBLIC_MEMBERSHIP_TRACKING_ENABLED === "true";
export const CLASS_BOOKING_ENABLED = process.env.NEXT_PUBLIC_CLASS_BOOKING_ENABLED === "true";
export const MEMBER_ACCOUNTS_ENABLED = process.env.NEXT_PUBLIC_MEMBER_ACCOUNTS_ENABLED === "true";

export function requireMembershipSales(): void {
  if (!MEMBERSHIP_SALES_ENABLED) {
    notFound();
  }
}

export function requireMembershipTracking(): void {
  if (!MEMBERSHIP_TRACKING_ENABLED) {
    notFound();
  }
}

export function requireClassBooking(): void {
  if (!CLASS_BOOKING_ENABLED) {
    notFound();
  }
}

export function requireMemberAccounts(): void {
  if (!MEMBER_ACCOUNTS_ENABLED) {
    notFound();
  }
}

import { CLASS_BOOKING_ENABLED } from "./features";

// The public navigation, in the order the design puts it. Kept here rather
// than inline in the header so the desktop bar, the mobile sheet and the
// footer cannot drift apart.
//
// No Locations entry: the gym runs from one site, and a list of one is a
// worse answer than an address. Where to find us lives on Contact, and
// /locations redirects there — see next.config.ts.
//
// Timetable / Class Schedule only appear once CLASS_BOOKING_ENABLED is on —
// there is no fixed timetable in showcase mode, and /schedule redirects to
// /classes (next.config.ts) while the flag is off.
const ALL_PRIMARY_NAV = [
  // The wordmark links home too, as every site's does, but an explicit Home
  // link is what a lot of people actually look for — and it costs one slot.
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Classes", href: "/classes" },
  { label: "Timetable", href: "/schedule" },
  { label: "Personal Training", href: "/trainers" },
  { label: "Contact", href: "/contact" },
] as const;

const ALL_FOOTER_NAV = [
  { label: "Membership", href: "/membership" },
  { label: "Class Schedule", href: "/schedule" },
  { label: "Personal Training", href: "/trainers" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
] as const;

export const PRIMARY_NAV = CLASS_BOOKING_ENABLED
  ? ALL_PRIMARY_NAV
  : ALL_PRIMARY_NAV.filter((item) => item.href !== "/schedule");

export const FOOTER_NAV = CLASS_BOOKING_ENABLED
  ? ALL_FOOTER_NAV
  : ALL_FOOTER_NAV.filter((item) => item.href !== "/schedule");

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SHOP_ENABLED, MEMBERSHIP_TRACKING_ENABLED, CLASS_BOOKING_ENABLED } from "@/lib/features";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  Tag,
  Users,
  Settings,
  ScrollText,
  Star,
  MapPin,
  CreditCard,
  Dumbbell,
  UserSquare,
  FileText,
  Inbox,
  Wallet,
  CalendarClock,
  BadgePercent,
  ShieldCheck,
} from "lucide-react";

// The gym sections, in the order the sidebar shows them.
//
// Front-desk staff see all of these: at a single gym the desk runs the whole
// operation, including applying an offer and settling a payment, so splitting
// the nav by role mostly got in their way. The backend grants staff the same
// routes — this list is not the security boundary, @Roles is, and every
// mutation lands in the audit log with a name against it.
const STAFF_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/class-types", label: "Class Types", icon: Dumbbell },
  { href: "/admin/trainers", label: "Trainers", icon: UserSquare },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/branches", label: "Branches", icon: MapPin },
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
  { href: "/admin/offers", label: "Offers", icon: BadgePercent },
  { href: "/admin/content", label: "Website Content", icon: FileText },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/customers", label: "Members", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

// The one section still owner-only. Staff run the gym but do not hire — and
// more to the point, cannot revoke each other. Cosmetic here; the real
// enforcement is @Roles('admin') on the /admin/staff routes.
const ADMIN_ONLY_NAV_ITEMS = [{ href: "/admin/staff", label: "Staff", icon: ShieldCheck }];

// Behind MEMBERSHIP_TRACKING_ENABLED — the invoice/payments table, not a
// member directory (that's /admin/customers). Staff get this one: taking
// payment at the desk is exactly their job.
const MEMBERSHIP_TRACKING_NAV_ITEMS = [
  { href: "/admin/memberships", label: "Memberships", icon: Wallet },
];

// Behind CLASS_BOOKING_ENABLED — there is no timetable in showcase mode.
const CLASS_BOOKING_NAV_ITEMS = [
  { href: "/admin/schedule", label: "Schedule", icon: CalendarClock },
];

// Behind SHOP_ENABLED with their pages still in the tree, so turning the
// storefront back on restores them without rebuilding the nav.
const SHOP_NAV_ITEMS = [
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/coupons", label: "Promo Codes", icon: Tag },
];

export function AdminNav() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  // Dashboard first, then Memberships — the two screens the desk lives in —
  // and the rest after, with the flag-gated sections last. The dormant shop
  // stays admin-only; it is not front-desk work.
  const items = [
    STAFF_NAV_ITEMS[0],
    ...(MEMBERSHIP_TRACKING_ENABLED ? MEMBERSHIP_TRACKING_NAV_ITEMS : []),
    ...STAFF_NAV_ITEMS.slice(1),
    ...(isAdmin ? ADMIN_ONLY_NAV_ITEMS : []),
    ...(CLASS_BOOKING_ENABLED ? CLASS_BOOKING_NAV_ITEMS : []),
    ...(SHOP_ENABLED && isAdmin ? SHOP_NAV_ITEMS : []),
  ];

  // The active row is marked with a red bar down its leading edge, not a
  // filled block. The old treatment was `bg-foreground text-background`, an
  // inverted slab — which worked when the foreground was a neutral off-white
  // but in this palette paints a saturated pink panel across the sidebar and
  // becomes the loudest thing on an admin screen. A 2px rule says "you are
  // here" just as clearly and spends almost no colour doing it.
  //
  // Every row reserves the bar as transparent so switching pages repaints
  // rather than reflows the label 2px sideways.
  return (
    <nav className="flex flex-col">
      {items.map((item) => {
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 border-l-2 px-4 py-2.5 font-mono text-[12px] font-medium tracking-[0.06em] uppercase transition-colors ${
              isActive
                ? "border-primary bg-surface-2 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <Icon
              className={`size-4 shrink-0 ${isActive ? "text-primary" : ""}`}
              strokeWidth={1.5}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

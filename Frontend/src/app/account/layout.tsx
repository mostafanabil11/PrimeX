"use client";

import { useEffect } from "react";
import Link from "next/link";
import { notFound, usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, CreditCard, Receipt, User } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SHOP_ENABLED, MEMBER_ACCOUNTS_ENABLED } from "@/lib/features";

const NAV = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/membership", label: "My Membership", icon: CreditCard },
  { href: "/account/classes", label: "My Classes", icon: CalendarDays },
  { href: "/account/payments", label: "Payments", icon: Receipt },
  { href: "/account/settings", label: "Profile & Settings", icon: User },
];

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  if (!MEMBER_ACCOUNTS_ENABLED) {
    notFound();
  }

  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      // Carries the current path so signing in returns here rather than
      // dumping the member on the homepage.
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) {
    return null;
  }

  const nav = SHOP_ENABLED
    ? [...NAV, { href: "/account/orders", label: "Orders", icon: Receipt }]
    : NAV;

  return (
    <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col gap-stack-sm px-margin-mobile pt-stack-md pb-stack-lg md:flex-row md:gap-gutter md:px-margin-desktop">
      <aside className="shrink-0 md:w-56">
        <p className="mb-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Your account
        </p>
        <p className="mb-6 font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
          {user.firstName}
        </p>

        {/* Horizontal and scrollable on a phone, a sidebar from md up. A
            stacked nav would push the actual content below the fold. */}
        <nav className="-mx-margin-mobile flex gap-1 overflow-x-auto px-margin-mobile md:mx-0 md:flex-col md:overflow-visible md:px-0">
          {nav.map((item) => {
            const isActive =
              item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

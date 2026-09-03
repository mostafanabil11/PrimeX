"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Wordmark } from "@/components/layout/wordmark";
import { AdminNav, useAdminNavItems, isAdminNavItemActive } from "./admin-nav";
import { useLocale } from "next-intl";

/**
 * The admin navigation on a phone.
 *
 * The sidebar is `hidden md:block`, and until now nothing replaced it below
 * that breakpoint — so on a phone the admin panel had no navigation at all.
 * Every screen was reachable only by typing its URL, which meant the whole
 * back office was desktop-only in practice even though every page in it
 * renders perfectly well at 375px.
 *
 * A drawer rather than a scrolling tab strip. The account area uses a strip
 * (`overflow-x-auto`) and that is right for its five items; this list runs to
 * sixteen once memberships and the timetable are switched on, and a strip that
 * long hides most of itself off the right edge with no indication of what is
 * there. A drawer shows the whole thing at once, and it is the same gesture —
 * and the same component — as the public site's menu, so there is one thing to
 * learn rather than two.
 *
 * The trigger names the page you are on rather than just saying "Menu". On a
 * phone the sidebar was also the only thing telling you where you were
 * standing; losing that to a hamburger would trade one problem for another.
 */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const items = useAdminNavItems();

  // The longest matching href wins, so /admin/schedule/sessions/x reports
  // "Schedule" rather than falling back to the "/admin" prefix that also
  // matches. Dashboard is exact-matched inside the helper.
  const current = items
    .filter((item) => isAdminNavItemActive(item.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const Icon = current?.icon ?? Menu;

  return (
    <div className="mb-6 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <button
              type="button"
              aria-label="Admin menu"
              className="ui-action ui-action--outline ui-action--sm flex min-h-12 w-full items-center gap-3 border border-border bg-surface-1 px-4 text-left transition-colors hover:border-foreground"
            />
          }
        >
          <Menu className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
            <span className="truncate font-mono text-[12px] font-semibold tracking-[0.08em] text-foreground uppercase">
              {current?.label ?? "Admin"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </SheetTrigger>

        <SheetContent
          side={locale === "ar" ? "right" : "left"}
          className="flex flex-col p-0 data-[side=left]:w-[86vw] data-[side=left]:max-w-[320px] data-[side=left]:sm:w-[320px] data-[side=left]:sm:max-w-none"
        >
          <div className="border-b border-border px-4 pt-16 pb-5">
            <Link href="/" onClick={() => setOpen(false)} className="inline-block">
              <Wordmark className="h-14 w-auto" width={112} />
            </Link>
            {/* Red chip rather than grey caps — this is the one label that says
                which side of the site you are standing on. Same treatment as
                the desktop sidebar. */}
            <p className="mt-4 inline-block bg-primary px-2 py-1 text-[11px] font-bold tracking-[0.16em] text-primary-foreground uppercase">
              {locale === "ar" ? "الإدارة" : "Admin"}
            </p>
          </div>

          {/* Scrolls, because sixteen rows at 44px is taller than a phone. */}
          <div className="flex-1 overflow-y-auto py-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <AdminNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

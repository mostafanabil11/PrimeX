"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TrackedWhatsAppLink } from "@/components/public/tracked-cta";
import { joinEnquiry } from "@/lib/whatsapp-messages";
import { PRIMARY_NAV } from "@/lib/nav";
import { Wordmark } from "./wordmark";
import { SocialLinks } from "@/components/public/floating-contact";
import { SHOP_ENABLED } from "@/lib/features";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // A flat list, not the drill-down the clothing catalogue needed: a handful
  // of destinations with no children, so a nested sheet would be motion for
  // its own sake.
  const links = SHOP_ENABLED
    ? [...PRIMARY_NAV, { label: "Shop", href: "/products" } as const]
    : PRIMARY_NAV;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        // Paired with the header's nav, which appears at xl — below that the
        // eight links do not fit on one bar, so this sheet carries them.
        render={<Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu" />}
      >
        <Menu className="size-5" />
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex flex-col p-0 data-[side=left]:w-[88vw] data-[side=left]:sm:w-[380px] data-[side=left]:sm:max-w-none"
      >
        <div className="border-b border-border px-margin-mobile pt-16 pb-6">
          {/* The mark, not the name set in the headline face. This panel is the
              first thing a phone visitor sees after tapping the menu, and a
              typographic stand-in next to a real logo everywhere else reads as
              an oversight. */}
          <Link href="/" onClick={() => setOpen(false)} className="inline-block">
            <Wordmark className="h-20 w-auto" />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-margin-mobile py-6">
          {links.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`py-3 text-[15px] font-semibold tracking-[0.08em] uppercase transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-4 border-t border-border px-margin-mobile py-6">
          <TrackedWhatsAppLink
            message={joinEnquiry()}
            onClick={() => setOpen(false)}
            className="bg-primary px-4 py-3 text-center font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase"
          >
            Join Now
          </TrackedWhatsAppLink>
          {/* These were bare glyphs with no href — decoration that looked like
              controls. Now the same component the footer uses, so there is one
              definition of where "our Instagram" points. Nudged left so the
              circles align optically with the button above rather than with
              their own padding box. */}
          <SocialLinks className="-ml-3" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

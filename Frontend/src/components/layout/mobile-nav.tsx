"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { InstagramIcon, FacebookIcon } from "@/components/icons/social-icons";
import { TrackedWhatsAppLink } from "@/components/public/tracked-cta";
import { joinEnquiry } from "@/lib/whatsapp-messages";
import { BRAND } from "@/lib/brand";
import { PRIMARY_NAV } from "@/lib/nav";
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
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="font-display text-2xl tracking-[-0.02em] text-foreground uppercase"
          >
            {BRAND.name}
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
          <div className="flex items-center gap-4">
            <InstagramIcon className="size-5 text-muted-foreground" />
            <FacebookIcon className="size-5 text-muted-foreground" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

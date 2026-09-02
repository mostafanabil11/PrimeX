"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { Menu, MapPin, Phone, Clock } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PRIMARY_NAV } from "@/lib/nav";
import { Wordmark } from "./wordmark";
import { SocialLinks } from "@/components/public/floating-contact";
import { SHOP_ENABLED } from "@/lib/features";
import { LanguageSwitcher } from "./language-switcher";
import { stripLocalePrefix } from "@/i18n/config";
import { useLocale, useTranslations } from "next-intl";

/** What the sheet shows under the links. Passed down from the server layout so
 *  this stays the same address the footer and /contact print. */
export type MobileNavContact = {
  address: string;
  mapsUrl: string;
  phone: string | null;
  hours: string;
};

export function MobileNav({ contact }: { contact?: MobileNavContact | null }) {
  const [open, setOpen] = useState(false);
  const pathname = stripLocalePrefix(usePathname());
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const common = useTranslations("Common");

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
        // size-11, not the primitive's default size-8: this is the only way
        // into navigation on a phone and it was a 32px target.
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 xl:hidden relative z-[60]"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="size-6" />
      </SheetTrigger>

      <SheetContent
        side={locale === "ar" ? "right" : "left"}
        // The dialog moves focus into the panel when it opens, and the first
        // focusable element used to be the logo link at the top of this file —
        // so :focus-visible drew an outline around the brand mark every time a
        // phone visitor opened the menu, which reads as a rendering fault
        // rather than as a focus state.
        //
        // The fix is in SheetContent, not here: the close button now comes
        // first in the panel's document order, so focus lands on a control.
        // Base UI's `initialFocus` was tried first and does not reliably
        // override the focus trap — see the note there.
        className="flex flex-col p-0 outline-none data-[side=left]:w-[86vw] data-[side=left]:max-w-[360px] data-[side=left]:sm:w-[380px] data-[side=left]:sm:max-w-none"
      >
        <div className="border-b border-border px-margin-mobile pt-16 pb-6">
          {/* The mark, not the name set in the headline face. This panel is the
              first thing a phone visitor sees after tapping the menu, and a
              typographic stand-in next to a real logo everywhere else reads as
              an oversight.
              `width` matches what h-20 actually renders — see Wordmark. */}
          <Link href="/" onClick={() => setOpen(false)} className="inline-block scale-[1.20] origin-left rtl:origin-right">
            <Wordmark className="h-20 w-auto" width={160} />
          </Link>
          
          {/* Live status indicator to fill the visual space and make the menu feel active */}
          <div className="mt-4 flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75"></span>
              <span className="relative inline-flex size-1.5 rounded-full bg-[#25D366]"></span>
            </span>
            <span>{common("openAlways")}</span>
          </div>
        </div>

        {/* Scrolls rather than stretching. The nav used to carry flex-1, which
            pushed the Join button to the bottom of the panel and left roughly
            220px of empty ground in the middle of the one screen where a
            visitor has explicitly asked "what can I do here". The contact block
            below now fills that space with the three facts most often wanted,
            and overflow-y handles the short-phone case that flex-1 was
            really guarding against. */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <nav className="flex flex-col px-margin-mobile py-4">
            {links.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  // The bar's voice, not a second one: mono at the nav's own
                  // 13px and tracking, so the sheet reads as the same
                  // navigation seen sideways rather than as another design.
                  // The active route gets a red rule like the desktop nav —
                  // vertical and to the left, because in a stacked list an
                  // underline is read as a divider between two items.
                  className={`relative flex min-h-12 items-center ps-4 font-mono text-[13px] font-medium tracking-[0.142em] uppercase transition-colors duration-150 ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-primary-soft"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 start-0 h-4 w-0.5 -translate-y-1/2 bg-primary"
                    />
                  )}
                  {item.href === "/" ? t("home") : item.href === "/about" ? t("about") : item.href === "/membership" ? t("membership") : item.href === "/classes" ? t("classes") : item.href === "/trainers" ? t("trainers") : item.href === "/contact" ? t("contact") : item.label}
                </Link>
              );
            })}
          </nav>

          {contact && (
            <div className="mt-2 flex flex-col gap-1 border-t border-border px-margin-mobile py-4">
              <a
                href={contact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                <span>{contact.address}</span>
              </a>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="flex min-h-11 items-center gap-3 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                  <span dir="ltr">{contact.phone}</span>
                </a>
              )}
              <p className="flex min-h-11 items-center gap-3 text-[14px] text-muted-foreground">
                <Clock aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                <span>{contact.hours}</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-border px-margin-mobile pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Link
            href="/membership"
            onClick={() => setOpen(false)}
            className="ui-action press flex min-h-12 items-center justify-center bg-primary px-4 text-center font-mono text-[12px] font-bold tracking-[0.167em] text-primary-foreground uppercase transition-colors duration-150 hover:bg-primary-hover"
          >
            {common("joinNow")}
          </Link>
          <LanguageSwitcher className="w-full border border-border text-muted-foreground" />
          {/* These were bare glyphs with no href — decoration that looked like
              controls. Now the same component the footer uses, so there is one
              definition of where "our Instagram" points. Nudged left so the
              circles align optically with the button above rather than with
              their own padding box. */}
          <SocialLinks className="-ms-3" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

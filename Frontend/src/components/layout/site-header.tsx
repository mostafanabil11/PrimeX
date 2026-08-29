import Link from "next/link";
import { Wordmark } from "./wordmark";
import { AccountMenu } from "@/components/layout/account-menu";
import { TrackedWhatsAppLink } from "@/components/public/tracked-cta";
import { joinEnquiry } from "@/lib/whatsapp-messages";
import { PRIMARY_NAV } from "@/lib/nav";
import { SHOP_ENABLED } from "@/lib/features";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-(--spacing-container-max) items-center justify-between gap-6 px-margin-mobile py-4 md:px-margin-desktop">
        {/* shrink-0 on both flanks: the nav is the only part that should give
            way. Without it a long nav crushes the wordmark to zero width and
            it silently vanishes rather than the bar wrapping or scrolling. */}
        <div className="flex shrink-0 items-center gap-3">
          <MobileNav />
          {/* Sized by height, width follows the viewBox ratio. Inline SVG
              rather than <Image>, so there is no second network request for
              the topmost element on every page and therefore no empty gap in
              the header while it loads. */}
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Wordmark priority className="site-header-logo h-14 w-auto md:h-20" />
          </Link>
        </div>

        {/* xl, not lg. At 1024 the bar has an 881px content box, which is
            tight once the wordmark and the join button are placed — PRIMARY_NAV
            drops "Timetable" in showcase mode (nav.ts), but the shop's "Shop"
            link can still add one back. Below xl the same links are in the
            sheet instead. */}
        <nav className="hidden items-center gap-6 xl:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative font-mono text-[13px] font-bold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              {item.label}
              <span className="absolute -bottom-1.5 left-0 h-[1.5px] w-0 bg-primary transition-all duration-300 ease-out group-hover:w-full" />
            </Link>
          ))}
          {SHOP_ENABLED && (
            <Link
              href="/products"
              className="group relative font-mono text-[13px] font-bold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Shop
              <span className="absolute -bottom-1.5 left-0 h-[1.5px] w-0 bg-primary transition-all duration-300 ease-out group-hover:w-full" />
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {/* -m-2 p-2 grows the tap area without moving anything: the label is
              small, and a touch target should clear 44px. The negative margin
              cancels the padding for layout, so only the hit box changes. */}
          <AccountMenu className="-m-2 hidden items-center gap-2 p-2 font-mono text-[13px] font-semibold tracking-[0.08em] text-foreground uppercase transition-opacity hover:opacity-70 sm:flex" />
          <AccountMenu
            iconOnly
            className="-m-2 p-2 text-foreground transition-opacity hover:opacity-70 sm:hidden"
          />
          <TrackedWhatsAppLink
            message={joinEnquiry()}
            className="press bg-primary px-4 py-2.5 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-all hover:bg-primary-hover"
          >
            Join Now
          </TrackedWhatsAppLink>
        </div>
      </div>
    </header>
  );
}

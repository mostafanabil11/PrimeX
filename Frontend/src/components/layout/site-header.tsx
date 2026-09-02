import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { Wordmark } from "./wordmark";
import { HeaderNav } from "./header-nav";
import { AccountMenu } from "@/components/layout/account-menu";
import { SHOP_ENABLED } from "@/lib/features";
import { BRAND } from "@/lib/brand";
import { getBranchesServer } from "@/lib/api/gym-server";
import { fullAddress, mapsUrl } from "@/lib/gym-format";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitcher } from "./language-switcher";
import { getTranslations } from "next-intl/server";
import styles from "./desktop-header.module.css";
import mobile from "./mobile-header.module.css";

/** One header row, with the full-size logo preserved on every screen. */
export async function SiteHeader() {
  const common = await getTranslations("Common");
  // Fetched here and handed down rather than looked up inside MobileNav,
  // which is a client component and has no business talking to the API. The
  // same server-fetch cache the footer and /contact read from, so this is not
  // a second round trip.
  //
  // "The first branch", matching the footer and /contact: the gym runs from
  // one site, and writing it this way rather than pinning a slug keeps it
  // working if the record is renamed or replaced.
  const branch = (await getBranchesServer())[0] ?? null;
  const contact = branch
    ? {
        address: fullAddress(branch),
        mapsUrl: mapsUrl(branch),
        phone: branch.phone,
        hours: common("openAlways"),
      }
    : null;

  return (
    <header className={`site-header sticky top-0 z-40 w-full border-b border-border bg-background ${styles.header} ${mobile.header}`}>
      {/* ---- Row 2: main bar --------------------------------------------
          px-4 below sm, not px-margin-mobile. At 320px the bar is 40px of
          padding away from fitting, and the gutter is the cheapest 8px to
          find — the logo and the button are both already at their floor. */}
      <div className={`mx-auto flex h-20 w-full max-w-(--spacing-container-max) items-center justify-between gap-2 px-4 sm:h-24 sm:gap-4 sm:px-margin-mobile md:gap-6 md:px-margin-desktop lg:h-24 ${styles.mainRow} ${mobile.mainRow}`}>
        {/* THE LOGO DOES NOT SHRINK, and that is a fix rather than an
            oversight. This side used to be min-w-0 + shrink with nothing
            holding the mark's width, on the reasoning that the logo giving way
            beat the join button falling off the screen. What actually happened
            is that an <img> with a fixed height and auto width does not scale
            in a flex row — it squashes. At 1280 the mark was rendering 97px
            wide at its full 104px tall: the wordmark visibly narrowed, which
            is the one thing a logo may never do. It is shrink-0 now, and the
            widths below are stepped so the bar fits without needing it. */}
        <div className={`flex min-w-0 shrink items-center gap-1 sm:gap-3 lg:gap-4 2xl:gap-5 ${styles.brand} ${mobile.brand}`}>
          <MobileNav contact={contact} />
          {/* THE MARK IS SIZED BY THE ROOM ACROSS, NOT THE ROOM DOWN, and on a
              phone that is the whole story. It is a wide lockup — about 1.93:1
              — so height is the cheap axis and width is the one that runs out:
              every 8px of height costs 15px of width, and at 375px the bar has
              roughly 50px of slack once the menu button, the account icon and
              the join button have taken theirs. Making the bar taller buys
              nothing on its own; the steps below are the widths at which
              another size actually fits, measured rather than guessed, each
              left with about 12px of slack so a longer join label or a wider
              system font does not push it over.

              320px keeps the old 48px mark — there is genuinely no room there,
              and it is the one width where something had to stay small.

              -mt-2 spends the overhang UPWARDS, into the utility strip, rather
              than letting items-center split it evenly. Two reasons: the header
              is sticky, so anything past the bottom border hangs over whatever
              is scrolling underneath, and the strip's own type sits high enough
              in its 32px that the mark's top corner passes behind empty ground.
              lg is the one step where the mark is SHORTER than the bar (88 in
              96), so it centres there instead — hence lg:mt-0. */}
          {/* We want the logo to be massive on desktop without expanding the nav height.
              By applying translate-y, we push the logo downwards so it never touches the
              utility strip above, allowing it to overhang the bottom of the nav bar instead. */}
          <Link
            href="/"
            aria-label={common("homeAriaLabel", { brand: BRAND.name })}
            className={`relative z-50 -ml-[35px] flex shrink-0 items-center transition-opacity hover:opacity-80 sm:-ml-7 lg:ml-0 ${styles.logoLink} ${mobile.logoLink}`}
          >
            {/* Logo increased to 104px to purposefully overhang the container */}
            <Wordmark
              priority
              width={216}
              className={`site-header-logo h-[104px] w-auto shrink-0 sm:h-28 lg:h-24 2xl:h-[112px] ${styles.logoImage} ${mobile.logoImage}`}
            />
          </Link>
        </div>

        <HeaderNav />

        <div className={`flex shrink-0 items-center gap-1 sm:gap-3 lg:gap-4 ${styles.actions} ${mobile.actions}`}>
          {/* Only with the shop on: /search is a product search and 404s
              otherwise (see lib/features.ts), so in showcase mode this square
              would be a control that leads nowhere. */}
          {SHOP_ENABLED && (
            <Link
              href="/search"
              aria-label="Search"
              className="ui-action ui-action--icon ui-action--ghost hidden size-[34px] shrink-0 items-center justify-center border border-input text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-foreground lg:flex"
            >
              <Search className="size-4" strokeWidth={1.5} />
            </Link>
          )}

          {/* Language is always visible; mobile account access stays in the drawer. */}
          <LanguageSwitcher segmented />
          <AccountMenu iconOnly className="hidden xl:flex size-11 items-center justify-center text-foreground" />
          <Link
            href="/membership"
            className={`ui-action ui-action--header press flex h-11 shrink-0 items-center bg-primary px-3 font-mono text-[11px] font-bold tracking-[0.06em] text-primary-foreground uppercase transition-colors duration-150 hover:bg-primary-hover sm:px-4 sm:text-[12px] sm:tracking-[0.167em] lg:px-[22px] ${styles.join} ${mobile.join}`}
          >
            {common("joinNow")}
            <ArrowUpRight aria-hidden className={styles.joinArrow} size={18} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </header>
  );
}

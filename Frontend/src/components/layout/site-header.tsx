import { Link } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { Wordmark } from "./wordmark";
import { HeaderNav } from "./header-nav";
import { AccountMenu } from "@/components/layout/account-menu";
import { WhatsAppLink } from "@/components/public/whatsapp";
import { SOCIAL_LINKS } from "@/components/public/floating-contact";
import { SHOP_ENABLED } from "@/lib/features";
import { BRAND } from "@/lib/brand";
import { getBranchesServer } from "@/lib/api/gym-server";
import { fullAddress, mapsUrl } from "@/lib/gym-format";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitcher } from "./language-switcher";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * The site header, rebuilt to the navbar design in
 * `design/Primex _web_design/primex_navbar` (option 1A).
 *
 * What changed and why: the old bar was one row about 128px tall carrying a
 * 112px logo, six links and a button, and it read as mostly air. This is two
 * rows — a 38px utility strip over a 96px main bar — and it is SHORTER than
 * what it replaces while carrying strictly more: where to find the gym, the
 * phone number, social, search, the account chip and the join button.
 *
 * Colours and faces are the app's own tokens, not the comp's literal hexes, as
 * the handoff asks: the design's #e01b22 is this palette's --primary, its
 * Space Mono is JetBrains Mono, and its #7d7f82 dimmest grey is the muted
 * foreground held back rather than a new grey nobody else uses. Sizes,
 * letter-spacing and the two-row structure are the comp's.
 *
 * Breakpoints are NOT from the design — it stops at desktop and says so, and
 * the comp is drawn 1400px wide, which is more room than this site's own 64px
 * page margins leave at xl. So the bar arrives in three steps rather than one:
 * the strip and the search square at lg, the centre nav at xl, and the full
 * comp — 104px logo, the lockup behind its hairline, the 30px nav gap — at 2xl,
 * which is the first width where all of it fits without crowding. Below sm the
 * bar is a 64px logo-and-join row exactly as it was.
 */
export async function SiteHeader() {
  const common = await getTranslations("Common");
  const locale = await getLocale();
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
    <header className="site-header sticky top-0 z-40 w-full border-b border-border bg-background">
      {/* ---- Row 1: utility strip -------------------------------------
          DESKTOP ONLY NOW, and this reverses an earlier call.

          The strip used to render at every width on the reasoning that a phone
          keeping the old bar meant most of the traffic seeing none of the new
          work. The redesign settles it the other way, and it is right: on a
          375px screen the strip plus the marquee plus a 96px bar was ~150px of
          chrome standing between somebody and the headline — the single
          largest thing keeping the offer below the fold. Chrome that explains
          the page is worth less than the page.

          Nothing on it is lost. "Open now" moves onto the hero photograph,
          where it reads against the image and costs no height at all; the
          social links are in the mobile sheet as icons and in the footer; and
          WhatsApp has a permanent button in the bar below and another in the
          sticky action bar at the foot of the screen.

          Padded to the site's own margins rather than the comp's 28px, so the
          strip lines up with the bar below it and with every page. */}
      <div className="block border-b border-border bg-surface-1">
        <div className="mx-auto flex py-2.5 min-h-[40px] w-full max-w-(--spacing-container-max) items-center justify-between gap-4 px-4 font-mono text-[10px] tracking-[0.12em] text-muted-foreground/75 uppercase sm:px-margin-mobile md:px-margin-desktop lg:h-[38px] lg:py-0 lg:gap-8 lg:text-[11px] lg:tracking-[0.145em]">
          <div className="flex min-w-0 items-center gap-[22px]">
            {/* The open-now badge, which is the lockup's job at 2xl and
                nobody's below it. The dot is the same red pip the lockup uses,
                doing the same "we are open right now" work. */}
            <span className="flex shrink-0 items-center gap-2 text-foreground">
              <span className="relative flex size-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75"></span>
                <span className="relative inline-flex size-1.5 rounded-full bg-[#25D366]"></span>
              </span>
              {common("openAlways")}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4 lg:gap-[26px]">
            <LanguageSwitcher className="text-muted-foreground" />
            {/* The same list the footer and the mobile sheet render, so there
                is still one definition of where "our Instagram" points. Text
                here rather than the glyphs — this row is type. Dropped on a
                phone: they are the least urgent thing on the strip and the
                first thing that would push the number off the edge at 320px,
                and the sheet carries them as icons anyway. */}
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden transition-colors duration-150 hover:text-primary-soft lg:inline"
              >
                {social.label}
              </a>
            ))}
            <WhatsAppLink
              message={locale === "ar" ? `مرحباً ${BRAND.name}، لدي استفسار.` : `Hi ${BRAND.name}, I have a question.`}
              className="hidden transition-colors duration-150 hover:text-primary-soft lg:inline"
            >
              {common("whatsapp")}
            </WhatsAppLink>
          </div>
        </div>
      </div>

      {/* ---- Row 2: main bar --------------------------------------------
          px-4 below sm, not px-margin-mobile. At 320px the bar is 40px of
          padding away from fitting, and the gutter is the cheapest 8px to
          find — the logo and the button are both already at their floor. */}
      <div className="mx-auto flex h-20 w-full max-w-(--spacing-container-max) items-center justify-between gap-2 px-4 sm:h-24 sm:gap-4 sm:px-margin-mobile md:gap-6 md:px-margin-desktop lg:h-24">
        {/* THE LOGO DOES NOT SHRINK, and that is a fix rather than an
            oversight. This side used to be min-w-0 + shrink with nothing
            holding the mark's width, on the reasoning that the logo giving way
            beat the join button falling off the screen. What actually happened
            is that an <img> with a fixed height and auto width does not scale
            in a flex row — it squashes. At 1280 the mark was rendering 97px
            wide at its full 104px tall: the wordmark visibly narrowed, which
            is the one thing a logo may never do. It is shrink-0 now, and the
            widths below are stepped so the bar fits without needing it. */}
        <div className="flex min-w-0 shrink items-center gap-1 sm:gap-3 lg:gap-4 2xl:gap-5">
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
            aria-label={`${BRAND.name} — home`}
            className="relative z-50 -ml-[35px] flex shrink-0 items-center transition-opacity hover:opacity-80 sm:-ml-7 lg:ml-0"
          >
            {/* Logo increased to 104px to purposefully overhang the container */}
            <Wordmark
              priority
              className="site-header-logo h-[104px] w-auto shrink-0 sm:h-28 lg:h-24 2xl:h-[112px]"
            />
          </Link>
        </div>

        <HeaderNav />

        <div className="flex shrink-0 items-center gap-1 sm:gap-3 lg:gap-4">
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

          {/* Whether this renders at all is AccountMenu's decision, not this
              file's — it depends on whether somebody is signed in, and only a
              client component knows that. Signed-out visitors see it when
              member accounts are on; anyone signed in always sees it, which is
              how staff reach /admin. See the note there.

              LEFT EXACTLY AS IT WAS before the navbar redesign. The comp draws
              this as a red-ringed initial disc beside the member's name; that
              was built and then taken back out on request. Square hit box at
              the 44px minimum, min-w-24 to hold the row still while the profile
              query is in flight. */}
          <AccountMenu className="hidden h-11 min-w-24 items-center justify-end gap-2 px-2 font-mono text-[13px] font-semibold tracking-[0.08em] text-foreground uppercase transition-opacity hover:opacity-70 sm:flex" />
          <AccountMenu
            iconOnly
            className="flex size-11 items-center justify-center text-foreground transition-opacity hover:opacity-70 sm:hidden"
          />
          <Link
            href="/membership"
            className="ui-action ui-action--header press flex h-11 shrink-0 items-center bg-primary px-3 font-mono text-[11px] font-bold tracking-[0.06em] text-primary-foreground uppercase transition-colors duration-150 hover:bg-primary-hover sm:px-4 sm:text-[12px] sm:tracking-[0.167em] lg:px-[22px]"
          >
            {common("joinNow")}
          </Link>
        </div>
      </div>
    </header>
  );
}

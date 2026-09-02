import { ActionButton } from "@/components/ui/action-button";
import { BRAND } from "@/lib/brand";
import { whatsappHref } from "@/lib/gym-format";
import { WhatsAppIcon, WhatsAppLink } from "./whatsapp";

/**
 * One floating button: WhatsApp, bottom-right, on every page.
 *
 * Instagram and Facebook used to float here too. They were removed because
 * three persistent buttons over the content read as clutter rather than as
 * service — and two of them were links that send people *off* the site, which
 * is a strange thing to keep permanently in front of someone. Social now lives
 * in the footer only, which is where people look for it anyway. See SocialLinks.
 *
 * What is left is the one thing that is genuinely an action. WhatsApp is how
 * this gym is actually contacted, ahead of the phone and well ahead of email,
 * so it earns a permanent affordance in a way a profile link does not.
 *
 * It wears WhatsApp's own #25D366 and does not change colour on hover. With
 * nothing beside it there is no cluster to stay consistent with, and the green
 * is doing the same job an app icon does: people find this button by colour
 * before they read anything. Hover is a small scale — motion, not colour — so
 * the mark itself never shifts.
 */

type Social = { href: string; label: string; icon: React.ReactNode };

const instagramIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="relative size-5"
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const facebookIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="relative size-5"
    aria-hidden="true"
  >
    <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2C11.54 2 9.68 3.66 9.68 6.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.05.28-1.73 1.76-1.73Z" />
  </svg>
);

const tiktokIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="relative size-5"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

/**
 * The gym's own profiles, from the environment.
 *
 * These were `https://www.instagram.com` and `https://www.facebook.com` — the
 * bare platform homepages. They are rendered in the footer of every page and in
 * the mobile menu, so every visitor who tapped one was dropped onto a generic
 * feed with no connection to PrimeX at all. A social link that goes nowhere is
 * worse than no social link, because it looks maintained.
 *
 * Read from env rather than hardcoded, matching how the WhatsApp and InstaPay
 * numbers are handled in lib/brand.ts: a new handle is a deploy variable, not a
 * code change. The defaults are the gym's real handles; set
 * NEXT_PUBLIC_INSTAGRAM_URL / NEXT_PUBLIC_FACEBOOK_URL / NEXT_PUBLIC_TIKTOK_URL to override.
 *
 * A link is dropped entirely rather than rendered as a dead end if its variable
 * is explicitly blanked — see the filter below.
 */
const SOCIAL_URLS = {
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/primex.fa?igsi=aDg5enljNDVrYmFx",
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://www.facebook.com/share/1EPXSPzjhL/?mibextid=wwXIfr",
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL ?? "https://www.tiktok.com/@primex.fa?_r=1&_t=ZS-99LNCv8sxvU",
};

export const SOCIAL_LINKS: Social[] = [
  { href: SOCIAL_URLS.instagram, label: "Instagram", icon: instagramIcon },
  { href: SOCIAL_URLS.facebook, label: "Facebook", icon: facebookIcon },
  { href: SOCIAL_URLS.tiktok, label: "TikTok", icon: tiktokIcon },
].filter((s) => s.href.trim().length > 0);

// Footer social hover. The disc is off-white, not red: these marks read as
// brand logos, so a red disc behind Instagram or Facebook put two competing
// brand colours in a 44px circle. Neutral lets each mark stay itself, and keeps
// red reserved for the CTAs, where it means "this is the thing to click".
//
// scale, not width/height: transform is compositor-only, so the disc cannot
// reflow its neighbours. Tailwind v4's scale-* writes to the standalone `scale`
// property rather than composing `transform`; transition-transform does cover
// it (v4 expands that to "transform, translate, scale, rotate") but a
// hand-written `transition: transform` would not — see the note in globals.css.
const discClasses =
  "absolute inset-0 scale-0 rounded-full bg-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:transition-none";

const baseClasses =
  "group relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300 hover:text-background focus-visible:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none";

// The dark fill sits a hair above the footer's own surface-1, which is what
// gives the glyphs an edge to read against without turning them into buttons.
const buttonClasses = `${baseClasses} bg-surface-2 text-foreground`;

export function FloatingContact({ locale = "en" }: { locale?: string }) {
  const isArabic = locale === "ar";
  return (
    <>
      {/* ---- Phones: one action, not two --------------------------------
          This bar used to carry "Join now" beside a WhatsApp button, and both
          halves were wrong.

          The Join half was a duplicate. SiteHeader is `sticky top-0` and its
          red JOIN NOW link has no responsive hiding, so on a phone that button
          is on screen permanently, roughly 700px above this one. Spending the
          most valuable strip on the display to repeat a control that never
          leaves the viewport buys nothing, and it pushed the action that ISN'T
          in the header into a 132px stub.

          The colour was the other half of the problem: a saturated #d12028
          panel hard against a saturated #25D366 panel, seam to seam. Two brands
          at full volume touching each other is what made the bar read as pasted
          on rather than designed, and no amount of restyling either button
          fixes it while both are shouting.

          So the bar now does the one job the header does not: talking to a
          human. Full width, a real label instead of a stub, and the green kept
          to the mark — which is what anyone actually scans for — while the
          panel stays on the site's own surface ramp. One loud control per zone:
          red at the top for the ask, this at the bottom for the conversation.

          The safe-area padding is on the bar rather than an offset from the
          bottom, so the fill runs into the home-indicator strip (a bar with a
          gap of page under it looks broken) while the tappable area stays
          clear of it. Requires viewportFit: "cover" in layout.tsx, without
          which every env() here reports zero. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-2 pb-[env(safe-area-inset-bottom)] sm:hidden">
        <ActionButton
          href={whatsappHref(
            BRAND.whatsapp,
            isArabic ? `مرحباً ${BRAND.name}، لدي استفسار.` : `Hi ${BRAND.name}, I have a question.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="lg"
          fullWidth
          // Flush to all four edges: the bar IS the button's chrome, so the
          // button drops its own border and squares off against the seam.
          className="ui-action--flush gap-3"
        >
          {/* The mark in a disc rather than loose on the panel. At 20px a bare
              glyph on a dark surface reads as an icon among icons; the disc is
              the shape people already know from their home screen, and it is
              the one place the green earns full saturation. */}
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-black">
            <WhatsAppIcon className="size-4" />
          </span>
          {isArabic ? "اسأل عن الاشتراك" : "Ask about membership"}
        </ActionButton>
      </div>

      {/* ---- sm and up: the circle, unchanged ---------------------------
          There is no bar here because there is no problem here. The redesign
          draws a phone, and a persistent full-width bar across a 1440px screen
          would be a far heavier piece of furniture than the one it replaced.
          Above sm the viewport is tall enough that the disc covers nothing
          anybody is reading, and the footer's reservation is enough to keep it
          off the copyright line. */}
      <WhatsAppLink
        message={isArabic ? `مرحباً ${BRAND.name}، لدي استفسار.` : `Hi ${BRAND.name}, I have a question.`}
        // The offsets are max() against the safe-area inset rather than flat
        // rem values. The same insets are non-zero in landscape on a notched
        // device, where the button would otherwise sit under the rounded
        // corner. Pinned to the opposite corner in Arabic — env() only takes
        // physical sides, so the side has to be picked in JS rather than with
        // a direction-aware Tailwind utility.
        className={`press fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 hidden size-13 items-center justify-center rounded-full bg-[#25D366] text-black transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:hover:scale-100 sm:flex ${
          isArabic
            ? "left-[max(1.5rem,env(safe-area-inset-left))]"
            : "right-[max(1.5rem,env(safe-area-inset-right))]"
        }`}
      >
        <WhatsAppIcon className="size-6" />
        <span className="sr-only">{isArabic ? `تواصل مع ${BRAND.name} عبر واتساب` : `Message ${BRAND.name} on WhatsApp`}</span>
      </WhatsAppLink>
    </>
  );
}

/**
 * The two social links, in the footer. This is now the site's only social
 * presence — the floating rail that used to carry them was removed.
 *
 * WhatsApp is deliberately not here. It has a permanent floating button of its
 * own a few hundred pixels away, and a second affordance for the same action in
 * the same viewport is noise rather than convenience.
 */
export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-row items-center gap-1 ${className}`}>
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses}
        >
          <span aria-hidden="true" className={discClasses} />
          {s.icon}
          <span className="sr-only">{s.label}</span>
        </a>
      ))}
    </div>
  );
}

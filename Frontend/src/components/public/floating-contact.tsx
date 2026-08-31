import { BRAND } from "@/lib/brand";
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

export function FloatingContact() {
  return (
    <WhatsAppLink
      message={`Hi ${BRAND.name}, I have a question.`}
      // The offsets are max() against the safe-area inset rather than flat
      // rem values, and both halves of that matter on a phone.
      //
      // bottom: on any iPhone with a home indicator, `bottom: 1rem` puts this
      // button inside the gesture strip — a swipe meant to leave the app lands
      // on it, and a tap meant for it sometimes goes to the OS instead.
      // env(safe-area-inset-bottom) is 34px there and 0 everywhere else, so
      // max() lifts it clear on the devices that need it and changes nothing
      // on the ones that do not. Requires viewportFit: "cover" in layout.tsx,
      // without which the env() values are all reported as zero.
      //
      // right: the same insets are non-zero in landscape on a notched device,
      // where the button would otherwise sit under the rounded corner.
      //
      // The footer reserves matching room at the bottom of every page (see
      // site-footer.tsx), so this never covers the copyright or the nav links
      // the way it used to.
      className="press fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-13 items-center justify-center rounded-full bg-[#25D366] text-black transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:hover:scale-100 sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <WhatsAppIcon className="size-6" />
      <span className="sr-only">Message {BRAND.name} on WhatsApp</span>
    </WhatsAppLink>
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

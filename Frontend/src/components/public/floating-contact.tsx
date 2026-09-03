/**
 * The site's social links.
 *
 * Nothing floats over the content any more. This file once held a rail of
 * Instagram, Facebook and WhatsApp buttons pinned to the viewport; the two
 * profile links went first, because a permanent affordance that sends people
 * OFF the site is a strange thing to keep in front of them, and the WhatsApp
 * circle that outlived them has now gone too.
 *
 * Losing it costs less than it sounds. WhatsApp is still how this gym is
 * contacted, but it is reached from the CTA that nearly every page already
 * ends on — each carrying a message written for its own context — rather than
 * from one green circle sitting on top of all of them.
 *
 * The filename is a leftover: what is left here is SOCIAL_LINKS and the footer
 * list that renders it.
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

/**
 * The two social links, in the footer. This is now the site's only social
 * presence — the floating rail that used to carry them was removed, and so was
 * the floating WhatsApp button that replaced it.
 *
 * WhatsApp is still not here, but the reason has changed. It used to be that a
 * permanent floating button sat a few hundred pixels away and a second
 * affordance for the same action was noise. Now it is that WhatsApp is the
 * action nearly every page already ends on — the homepage, membership,
 * contact, FAQ, the class and coach pages and both reservation forms all carry
 * their own CTA, each with a message written for its context. A bare footer
 * link would be the only one with nothing to say.
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

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

export const SOCIAL_LINKS: Social[] = [
  { href: "https://www.instagram.com", label: "Instagram", icon: instagramIcon },
  { href: "https://www.facebook.com", label: "Facebook", icon: facebookIcon },
];

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
      className="press fixed right-4 bottom-4 z-40 flex size-13 items-center justify-center rounded-full bg-[#25D366] text-black transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:hover:scale-100 sm:right-6 sm:bottom-6"
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

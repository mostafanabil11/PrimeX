import { BRAND } from "@/lib/brand";
import { WhatsAppIcon, WhatsAppLink } from "./whatsapp";

/**
 * The floating contact cluster: Instagram, Facebook, WhatsApp, in that order,
 * on one line at the bottom-right of every page.
 *
 * These used to be two separate fixtures at opposite corners — social bottom
 * left, WhatsApp bottom right. That is what a page looks like when two features
 * were added at different times rather than designed together: it framed the
 * content, and neither cluster explained the other.
 *
 * ONE SHAPE, ONE MOTION, ONE COLOUR.
 *
 * All three are the same circle at the same size with the same hover: an
 * off-white disc scales up from nothing and the glyph inverts to near-black
 * inside it. Consistent geometry and colour are what make them read as a single
 * control group rather than three unrelated widgets.
 *
 * WhatsApp used to keep its brand green here, on the argument that it is the
 * action rather than a link and that people find it by colour. That was a
 * considered call and it was overruled: one green circle in a row of neutral
 * ones read as an oversight rather than as a hierarchy, which is a fair reading
 * — a distinction only works if it looks deliberate. Hierarchy now comes from
 * position instead: WhatsApp is last, which is the rightmost slot and the
 * easiest place for a right thumb to reach.
 *
 * If it ever needs to stand out again, do it with size or an outline rather
 * than by reintroducing a second brand colour to the cluster.
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

// The disc is off-white, not red. Red was tried and lost: these marks read as
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

// One treatment for all three. The dark fill is not decoration, it is
// legibility: as bare glyphs these were unreadable the moment the cluster
// floated over body copy or a photograph, because the strokes had nothing to
// sit on. surface-2 is deliberately close to the page ground, so they still
// read as bare marks where the background is plain and only resolve into discs
// where they need to.
const buttonClasses = `${baseClasses} bg-surface-2 text-foreground`;

export function FloatingContact() {
  return (
    <div className="fixed right-3 bottom-3 z-40 flex flex-row items-center gap-1 sm:right-5 sm:bottom-5 sm:gap-1.5">
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

      <WhatsAppLink message={`Hi ${BRAND.name}, I have a question.`} className={buttonClasses}>
        <span aria-hidden="true" className={discClasses} />
        <WhatsAppIcon className="relative size-5" />
        <span className="sr-only">Message {BRAND.name} on WhatsApp</span>
      </WhatsAppLink>
    </div>
  );
}

/**
 * The two social links, inline, for the footer. WhatsApp is not included —
 * the footer already carries the number as a labelled link, and a second
 * WhatsApp affordance a few pixels away would be noise.
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

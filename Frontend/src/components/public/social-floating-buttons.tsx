/**
 * Instagram and Facebook.
 *
 * Bare glyphs, not buttons. They used to sit in outlined boxes, which gave two
 * secondary links the same visual weight as a control — and next to the
 * WhatsApp button, which IS a control, that read as competing calls to action
 * when only one of them is one.
 *
 * PLACEMENT. The rail sits on the left edge, vertically centred, and only from
 * md up. Three reasons it moved off the bottom-left corner:
 *
 *   - It was sharing the bottom of the screen with the WhatsApp button. Two
 *     floating clusters at opposite corners of the same edge read as a toolbar
 *     the site does not have, and it split attention between the one action
 *     that converts and two links that send people away.
 *   - On a phone the bottom corners are the thumb zone, and as the page scrolls
 *     these sat directly over body copy and, lower down, over the hero CTAs.
 *   - Centred on the left edge, the rail is beside the content rather than on
 *     top of it, and the WhatsApp button keeps the bottom-right corner to
 *     itself.
 *
 * Below md the rail is hidden entirely and the footer carries the same links —
 * see SocialLinks. A narrow screen has no spare edge to give up.
 *
 * Facebook is drawn solid and Instagram as an outline. That mismatch is
 * correct: it is how the two brands draw themselves, and normalising either
 * makes it look subtly wrong.
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

// The circle is off-white and the glyph inverts to the page black inside it.
// Red was tried and lost: the mark reads as a brand logo, and dropping a red
// disc behind it made two competing brand colours fight in a 44px square. A
// neutral disc lets Instagram and Facebook stay recognisably themselves while
// the red goes on meaning "this is the thing to click", which is the WhatsApp
// button and the CTAs — not these.
//
// scale, not width/height: transform is compositor-only, so the circle cannot
// reflow the icons beside it. Note that Tailwind v4's scale-* writes to the
// standalone `scale` property rather than composing `transform`; the
// transition-transform utility does cover it (it expands to
// "transform, translate, scale, rotate"), but a hand-written
// `transition: transform` would not — see the photo note in globals.css.
const orbClasses =
  "absolute inset-0 scale-0 rounded-full bg-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:transition-none";

// relative on the glyph, absolute on the circle: the circle paints first and
// the glyph after, so the icon stays on top without a negative z-index — which
// would need its own stacking context on the anchor to be safe.
const linkClasses =
  "group relative flex size-11 items-center justify-center text-foreground transition-colors duration-300 hover:text-background focus-visible:text-background focus-visible:outline-none motion-reduce:transition-none";

export function SocialFloatingButtons() {
  return (
    <div className="fixed top-1/2 left-2 z-40 hidden -translate-y-1/2 flex-col items-center gap-1 md:flex lg:left-4">
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
        >
          <span aria-hidden="true" className={orbClasses} />
          {s.icon}
          <span className="sr-only">{s.label}</span>
        </a>
      ))}
    </div>
  );
}

/**
 * The same links, inline. Used in the footer so that hiding the floating rail
 * below md does not take the gym's social presence off small screens entirely —
 * which, for a gym, would mean hiding its main marketing channel from the
 * devices most people browse on.
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
          className={linkClasses}
        >
          <span aria-hidden="true" className={orbClasses} />
          {s.icon}
          <span className="sr-only">{s.label}</span>
        </a>
      ))}
    </div>
  );
}

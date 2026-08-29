/**
 * Instagram and Facebook, bottom-left on every page.
 *
 * Bare glyphs, not buttons. They used to sit in outlined boxes, which gave two
 * secondary links the same visual weight as a control — and next to the
 * WhatsApp button opposite, which IS a control, that read as three equal calls
 * to action when only one of them is one. Stripping the container leaves the
 * hierarchy intact: the thing that starts a conversation looks like a button,
 * the things that are just links look like links.
 *
 * The hover is a filled circle scaling up behind the glyph. That circle is a
 * deliberate exception to the 0px shape language used everywhere else — it is
 * a hit-state on a floating utility, not a card or an input, and a square
 * growing behind an icon reads as a glitch rather than a target.
 *
 * Facebook is a solid mark and Instagram is an outline one. That mismatch is
 * correct: it is how the two brands actually draw themselves, and normalising
 * either makes it look subtly wrong.
 */

// scale, not width/height — transform is compositor-only, so the circle cannot
// drop a frame or reflow the two icons next to each other. Same easing as the
// rest of the app's entrance motion.
const orbClasses =
  "absolute inset-0 scale-0 rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:transition-none";

// relative on the glyph, absolute on the circle: the circle paints first and
// the glyph after, so the icon stays on top without a negative z-index — which
// would need a stacking context on the anchor to be safe.
const linkClasses =
  "group relative flex size-11 items-center justify-center text-foreground transition-colors duration-300 hover:text-primary-foreground focus-visible:text-primary-foreground focus-visible:outline-none motion-reduce:transition-none";

export function SocialFloatingButtons() {
  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-row items-center gap-1 sm:bottom-6 sm:left-6">
      <a
        href="https://www.instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        <span aria-hidden="true" className={orbClasses} />
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
        <span className="sr-only">Instagram</span>
      </a>

      <a
        href="https://www.facebook.com"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        <span aria-hidden="true" className={orbClasses} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="relative size-5"
          aria-hidden="true"
        >
          <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2C11.54 2 9.68 3.66 9.68 6.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.05.28-1.73 1.76-1.73Z" />
        </svg>
        <span className="sr-only">Facebook</span>
      </a>
    </div>
  );
}

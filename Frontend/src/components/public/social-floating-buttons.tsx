/**
 * Instagram and Facebook, bottom-left on every page.
 *
 * Deliberately NOT in their own brand colours any more. Three saturated
 * circles — Instagram pink, Facebook blue, WhatsApp green — used to sit at the
 * bottom of a page whose entire argument is that red is the only loud thing on
 * it, and they read as three competing calls to action when only one of them
 * is one.
 *
 * So these two drop to the card surface with a concrete outline and earn red
 * only on hover, while the WhatsApp button opposite keeps its green. That is a
 * hierarchy rather than a palette: the button that starts a conversation looks
 * like a button, and the two that are just links look like links.
 *
 * Square, like everything else in this design.
 */
const buttonClasses =
  "flex size-12 items-center justify-center border border-concrete bg-surface-2 text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function SocialFloatingButtons() {
  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-row items-center gap-2 sm:bottom-6 sm:left-6">
      <a
        href="https://www.instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
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
        className={buttonClasses}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
          aria-hidden="true"
        >
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
        <span className="sr-only">Facebook</span>
      </a>
    </div>
  );
}

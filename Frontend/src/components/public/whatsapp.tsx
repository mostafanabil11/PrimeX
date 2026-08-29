import { BRAND } from "@/lib/brand";
import { whatsappHref } from "@/lib/gym-format";
import { ctaClasses } from "./section";

/**
 * WhatsApp's brand mark, inlined.
 *
 * Not from lucide — that set is deliberately generic and carries no brand
 * logos, and a generic speech bubble does not read as "WhatsApp" to an
 * Egyptian member scanning the page. currentColor throughout so it inherits
 * whatever the surrounding text is using.
 */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14 0-.31-.01-.47-.01-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

/**
 * A link that opens a WhatsApp chat with the gym's support line, prefilled.
 *
 * The prefilled message matters more than it looks: it lands the member in a
 * thread that already says what they are asking about, so whoever picks it up
 * at the other end is not starting from "hi".
 */
export function WhatsAppLink({
  message,
  className,
  onClick,
  children,
}: {
  message?: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={whatsappHref(BRAND.whatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

/**
 * A WhatsAppLink wearing CtaButton's visual contract — for every place a
 * "Join" or "Book" button used to point at a page on this site and now opens
 * a prefilled chat instead. Shares ctaClasses with CtaButton (section.tsx) so
 * the two never drift into two different-looking buttons.
 *
 * No hooks, so this drops into server components the same as CtaButton does.
 */
export function WhatsAppCta({
  message,
  variant = "primary",
  className = "",
  withIcon = true,
  children,
}: {
  message?: string;
  variant?: "primary" | "outline";
  className?: string;
  withIcon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <WhatsAppLink message={message} className={ctaClasses(variant, className)}>
      {withIcon && <WhatsAppIcon className="mr-2 inline-block size-4 align-text-bottom" />}
      {children}
    </WhatsAppLink>
  );
}

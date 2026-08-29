"use client";

import Link from "next/link";
import { WhatsAppLink } from "./whatsapp";
import { trackCtaClick } from "@/lib/api/funnel";

/**
 * Client leaves for the two CTAs worth counting.
 *
 * The headers, hero and pricing grid these sit in are server components, which
 * cannot carry an onClick — so the tracking lives in the smallest possible
 * client boundary rather than pushing whole pages over to the client.
 *
 * Only the top-of-funnel buttons are tracked: the generic "Join now" ones, and
 * the per-plan CTA. Contact, FAQ, class and trainer links deliberately are
 * not — counting those would be page-level attribution, which was considered
 * and explicitly not wanted.
 */

export function TrackedWhatsAppLink({
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
    <WhatsAppLink
      message={message}
      className={className}
      onClick={() => {
        trackCtaClick("whatsapp");
        onClick?.();
      }}
    >
      {children}
    </WhatsAppLink>
  );
}

/**
 * The per-plan CTA: a normal link to the reservation form, counted on the way.
 *
 * The count is what makes the form reversible — reserve_start against the
 * reservations actually created is the abandonment rate, and if putting a form
 * in front of the WhatsApp handoff turns out to cost conversations, this is
 * the number that says so.
 */
export function TrackedPlanLink({
  planId,
  href,
  className,
  children,
}: {
  planId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackCtaClick("reserve_start", planId)}>
      {children}
    </Link>
  );
}

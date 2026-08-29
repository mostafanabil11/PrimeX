"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground";

// Contact collapses to a read-only line once we know who the customer is, and
// asks for an email when we don't. Signing in is offered, never required —
// the email typed here is all an order actually needs to be confirmable.
export function ContactSection({
  email,
  onEmailChange,
  signedInEmail,
  disabled = false,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  signedInEmail: string | null;
  disabled?: boolean;
}) {
  const pathname = usePathname();

  return (
    <section aria-labelledby="contact-heading">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="contact-heading" className="font-heading text-headline-sm font-bold text-foreground">
          Contact
        </h2>
        {!signedInEmail && (
          // Round-trips back to checkout so signing in mid-flow doesn't cost
          // the customer the basket they were about to pay for.
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="text-[13px] font-semibold text-foreground underline underline-offset-4 hover:opacity-70"
          >
            Sign in
          </Link>
        )}
      </div>

      {signedInEmail ? (
        <p className="border border-border bg-muted px-4 py-3 text-sm text-foreground">{signedInEmail}</p>
      ) : (
        <>
          <label className="sr-only" htmlFor="checkout-email">
            Email
          </label>
          <input
            id="checkout-email"
            type="email"
            required
            disabled={disabled}
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className={inputClass}
          />
          <p className="mt-2 text-[12px] text-muted-foreground">
            We&apos;ll send your order confirmation and delivery updates here.
          </p>
        </>
      )}
    </section>
  );
}

import Link from "next/link";
import { Reveal } from "./reveal";

// Layout primitives shared across the public pages. Extracted so the vertical
// rhythm is decided once — the fastest way to make a site feel unconsidered is
// for every section to pick its own padding.

export function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`w-full px-margin-mobile py-stack-lg md:px-margin-desktop ${className}`}>
      <div className="mx-auto w-full max-w-(--spacing-container-max)">{children}</div>
    </section>
  );
}

/**
 * The small uppercase line that sits above a heading.
 *
 * Mono rather than the body face, and preceded by a short red bar — that pair
 * is the design's "spec sheet" register, and it is what makes a label read as
 * an instrument reading rather than as more prose. Extracted because it had
 * been retyped as a bare <p className="text-[11px] …"> in a dozen places, and
 * the mono swap needed one edit rather than a dozen.
 *
 * The bar is aria-hidden: it is punctuation, and a screen reader announcing it
 * would put a stray character in front of every section title on the site.
 */
export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.16em] text-primary-soft uppercase ${className}`}
    >
      <span aria-hidden="true" className="inline-block h-0.5 w-6 shrink-0 bg-primary" />
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
  action,
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: { href: string; label: string };
  align?: "start" | "center";
}) {
  const centered = align === "center";

  // Reveal replaces the wrapper rather than adding one around it — it renders
  // a single div with whatever className it is handed, so the layout here is
  // untouched and no extra element lands between a flex parent and its items.
  return (
    <Reveal
      className={`mb-stack-sm flex flex-col gap-3 ${
        centered ? "items-center text-center" : "items-start"
      } ${action ? "md:flex-row md:items-end md:justify-between" : ""}`}
    >
      <div className={`flex flex-col gap-3 ${centered ? "items-center" : "items-start"}`}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {/* rule-accent draws the short red bar the comps put under every
            section title. It is a pseudo-element on the heading itself, so
            centred headers get a centred bar for free from text-align rather
            than needing a second variant. */}
        <h2
          className={`max-w-3xl font-display text-4xl leading-[0.95] tracking-[-0.02em] text-balance text-foreground uppercase md:text-5xl ${
            centered ? "rule-accent [&::after]:mx-auto" : "rule-accent"
          }`}
        >
          {title}
        </h2>
        {body && <p className="max-w-2xl text-body-md text-muted-foreground">{body}</p>}
      </div>

      {action && (
        <Link
          href={action.href}
          className="shrink-0 font-mono text-[12px] font-bold tracking-[0.1em] text-primary-soft uppercase hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </Reveal>
  );
}

export function PageHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="w-full border-b border-border px-margin-mobile pt-stack-md pb-stack-sm md:px-margin-desktop">
      <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col gap-4">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-[-0.02em] text-balance text-foreground uppercase md:text-7xl">
          {title}
        </h1>
        {body && <p className="max-w-2xl text-body-lg text-muted-foreground">{body}</p>}
      </div>
    </div>
  );
}

// The red is the only loud thing on the page, so it is reserved for the one
// action a section is actually asking for. Everything else is a quiet outline.
//
// Extracted so WhatsAppCta (components/public/whatsapp.tsx) can wear the same
// visual contract on an <a> instead of a <Link> — the class string is what
// matters, not which element renders it.
//
// Both variants carry a 2px border at rest, transparent on the primary. That
// is not decoration: the design's hover state is an inversion — the fill drops
// out and the border arrives — and a border that only appears on hover would
// grow the button by 4px at that moment and shove the buttons beside it
// sideways. Reserving the space up front makes the hover a pure repaint.
export function ctaClasses(variant: "primary" | "outline" = "primary", className = ""): string {
  const styles =
    variant === "primary"
      ? "border-transparent bg-primary text-primary-foreground hover:border-primary hover:bg-[#690000] hover:text-primary-soft"
      : "border-foreground text-foreground hover:border-primary hover:text-primary-soft";

  return `press inline-flex items-center justify-center border-2 px-6 py-3.5 font-mono text-[13px] font-bold tracking-[0.1em] uppercase transition-all ${styles} ${className}`;
}

export function CtaButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
}) {
  return (
    <Link href={href} className={ctaClasses(variant, className)}>
      {children}
    </Link>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-border px-6 py-12 text-center">
      <p className="text-[13px] text-muted-foreground">{message}</p>
    </div>
  );
}

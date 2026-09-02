import { actionButtonClasses } from "@/components/ui/action-button";
import { Link } from "@/i18n/navigation";
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
  /**
   * `shortLabel` is what a phone shows — see the note on the two spans
   * below. Falls back to `label` when a section has nothing shorter to say.
   */
  action?: { href: string; label: string; shortLabel?: string };
  align?: "start" | "center";
}) {
  const centered = align === "center";

  // Reveal replaces the wrapper rather than adding one around it — it renders
  // a single div with whatever className it is handed, so the layout here is
  // untouched and no extra element lands between a flex parent and its items.
  //
  // ---------------------------------------------------------------------
  // THE HEADER IS HALF ITS OLD HEIGHT ON A PHONE, and that is three separate
  // decisions rather than one:
  //
  //   1. The action link sits on the title's baseline from the smallest width,
  //      not from md. It used to stack under the body copy, which on a phone
  //      meant "All classes →" was the fourth line of a four-line header.
  //   2. `body` is dropped below md. It is a genuine sentence and it earns its
  //      place on desktop, where it sits in the empty half of the header row —
  //      but on a phone it is ~40px of explanation in front of the thing being
  //      explained, repeated at every section down the page.
  //   3. The red rule under the title goes with it. The Eyebrow directly above
  //      already carries a red bar; two of them 40px apart, on a header this
  //      compact, reads as a rendering fault rather than as structure.
  //
  // Together that is ~95px a section instead of ~190, across five sections on
  // the homepage alone.
  return (
    <Reveal
      className={`mb-4 flex gap-3 md:mb-stack-sm ${
        centered
          ? "flex-col items-center text-center"
          : action
            ? "flex-row items-end justify-between"
            : "flex-col items-start"
      }`}
    >
      <div className={`flex flex-col gap-2 md:gap-3 ${centered ? "items-center" : "items-start"}`}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {/* rule-accent draws the short red bar the comps put under every
            section title. It is a pseudo-element on the heading itself, so
            centred headers get a centred bar for free from text-align rather
            than needing a second variant. Suppressed below md — see (3). */}
        <h2
          className={`max-w-3xl font-display text-[32px] leading-[0.9] tracking-[-0.03em] text-balance text-foreground uppercase md:text-5xl md:leading-[0.95] md:tracking-[-0.02em] [&::after]:hidden md:[&::after]:block ${
            centered ? "rule-accent [&::after]:mx-auto" : "rule-accent"
          }`}
        >
          {title}
        </h2>
        {body && <p className="hidden max-w-2xl text-body-md text-muted-foreground md:block">{body}</p>}
      </div>

      {action && (
        // -my-3 cancels the padding for layout, so the link sits on the same
        // baseline it always did and only its hit box grows. It was 18px tall:
        // this is the link out of every section preview on the site — "All
        // classes", "Meet the team", "Compare all plans" — so it is the one
        // control that most often stands between somebody and the page they
        // actually want.
        <Link
          href={action.href}
          className="-my-3 inline-flex min-h-11 shrink-0 items-center py-3 font-mono text-[12px] font-bold tracking-[0.08em] text-primary-soft uppercase hover:underline md:tracking-[0.1em]"
        >
          {/* Two labels, one link. On a phone the count is the useful half —
              "All 10" says how much more there is, which is the question a
              rail with three cards in it provokes. On desktop the grid already
              shows the set, so the destination is what matters. */}
          <span className="md:hidden">{`${action.shortLabel ?? action.label} →`}</span>
          <span className="hidden md:inline">{`${action.label} →`}</span>
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
    <div className="w-full border-b border-border px-margin-mobile pt-6 pb-stack-sm md:px-margin-desktop md:pt-stack-md">
      <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col gap-3 md:gap-4">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-[-0.02em] text-balance text-foreground uppercase md:text-7xl">
          {title}
        </h1>
        {/* 16px on a phone, 18 from md. Unlike a SectionHeader's body this one
            is NOT dropped — it is the page's own introduction, and on /about or
            /membership it is the only prose there is. But 18px at 1.6 across
            335px is about six words a line, so a three-sentence intro became
            seven lines and pushed the content it introduces off the first
            screen. The body scale reads the same and costs two lines fewer. */}
        {body && (
          <p className="max-w-2xl text-body-md text-muted-foreground md:text-body-lg">{body}</p>
        )}
      </div>
    </div>
  );
}

// Preserve the existing CTA API while sharing the site's button skin.
export function ctaClasses(variant: "primary" | "outline" = "primary", className = ""): string {
  return actionButtonClasses({ variant, size: "md", className });
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

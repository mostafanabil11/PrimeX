import { Link } from "@/i18n/navigation";
import { CtaButton } from "@/components/public/section";

// Wears ctaClasses like every other primary action on the site.
//
// This used to carry its own button style — `px-8 py-4 text-button …
// hover:bg-primary-hover` — which meant no 2px border, no mono type, no press
// feedback, and a hover colour change that the design brief in section.tsx
// explicitly rules out for red buttons. A 404 is a page people already arrive
// at annoyed; it is a bad place for the one control on screen to look like it
// belongs to a different website.
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center px-margin-mobile py-stack-xl text-center md:px-margin-desktop">
      <h1 className="mb-4 font-display text-5xl leading-[0.95] tracking-[-0.02em] text-balance text-foreground uppercase md:text-6xl">
        Page not found
      </h1>
      <p className="mb-8 max-w-md text-body-md text-muted-foreground">
        That address does not exist, or it has moved. The links below go where
        most people are heading.
      </p>
      {/* Two ways out rather than one. "Back to home" is the polite answer and
          almost never what somebody who mistyped a URL actually wants — they
          were looking for a specific thing, and on this site that is nearly
          always the plans or the way to ask a question. */}
      <div className="flex flex-wrap justify-center gap-3">
        <CtaButton href="/membership">See plans and prices</CtaButton>
        <CtaButton href="/" variant="outline">
          Back to home
        </CtaButton>
      </div>
      <Link
        href="/contact"
        className="mt-5 inline-flex min-h-11 items-center py-3 font-mono text-[12px] font-bold tracking-[0.1em] text-primary-soft uppercase hover:underline"
      >
        Or talk to us →
      </Link>
    </div>
  );
}

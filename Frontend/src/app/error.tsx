"use client";

import { useEffect } from "react";
import { CtaButton, ctaClasses } from "@/components/public/section";

// Same reasoning as not-found.tsx: this used to wear a one-off button style
// with a hover colour change the design brief rules out. `ctaClasses` is the
// class string rather than the component, because "Try again" has to be a real
// <button> that calls reset() — CtaButton renders a Link.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col items-center px-margin-mobile py-stack-xl text-center md:px-margin-desktop">
      <h1 className="mb-4 font-display text-5xl leading-[0.95] tracking-[-0.02em] text-balance text-foreground uppercase md:text-6xl">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-body-md text-muted-foreground">
        This page failed to load. Trying again usually fixes it — if it does not,
        the gym is on WhatsApp.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={ctaClasses("primary")}>
          Try again
        </button>
        <CtaButton href="/contact" variant="outline">
          Contact us
        </CtaButton>
      </div>
      {/* The digest is the only handle support has on a specific failure, and
          it is otherwise only in the server logs. Quiet, but present. */}
      {error.digest && (
        <p className="mt-8 font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
          {`Reference ${error.digest}`}
        </p>
      )}
    </div>
  );
}

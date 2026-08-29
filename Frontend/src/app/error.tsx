"use client";

import { useEffect } from "react";

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
      <h1 className="mb-4 font-heading text-headline-md font-bold text-foreground">
        Something Went Wrong
      </h1>
      <p className="mb-8 text-body-md text-muted-foreground">
        We hit an unexpected error. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary px-8 py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

/**
 * Fades and lifts its children into place the first time they scroll into view.
 *
 * Marks the element with a data attribute rather than holding React state: the
 * CSS in globals.css does the actual work, so a reveal costs one attribute
 * write instead of a re-render, and a page with thirty of these re-renders
 * nothing at all as you scroll past them.
 *
 * Disconnects after the first intersection. These are entrances, not
 * scroll-linked effects — once something has arrived there is nothing left to
 * watch, and leaving observers attached is how a long page ends up doing work
 * for the whole session.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Milliseconds to hold back, for staggering siblings in a grid. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => el.setAttribute("data-revealed", "");

    // Fail open. These elements start hidden, so anything that stops the
    // observer existing has to end with the content shown rather than the
    // page quietly missing half its sections.
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    // Anything already on screen when the observer attaches fires immediately,
    // so above-the-fold content animates on load without a separate path.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal();
          observer.disconnect();
        }
      },
      // Held back until the element is a little way in, so things do not
      // finish animating while still clipped by the bottom edge.
      { rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  );
}

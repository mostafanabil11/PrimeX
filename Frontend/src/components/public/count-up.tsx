"use client";

import { useEffect, useRef } from "react";

/**
 * Counts a number up to its value the first time it scrolls into view.
 *
 * Writes straight to the DOM node on each frame rather than through state.
 * A stat ticking to 483 would otherwise be a few hundred React renders per
 * number, all to change one text node — and three of these on screen at once
 * would be doing it in parallel.
 *
 * The final value is what server-renders, so this reads correctly with no
 * JavaScript, before hydration, and to anything that does not run scripts at
 * all. The animation only ever replaces a number with the same number.
 */
export function CountUp({
  value,
  durationMs = 1100,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Counting to three is not an animation, it is a flicker.
    if (value < 5) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / durationMs);
      // Ease out: fast off the mark, settling onto the real figure rather than
      // stopping dead on it.
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          el.textContent = "0";
          frame = requestAnimationFrame(tick);
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Whatever happened, the node ends holding the real number — a unmount
      // mid-count must not leave a stat frozen at 47 of 60.
      el.textContent = String(value);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Marks the document once the page has scrolled away from the top, so the
 * header can lift off the content.
 *
 * Watches a zero-height sentinel at the very top rather than listening to
 * scroll. A scroll handler fires on every frame of every scroll for the whole
 * session and has to be throttled to stay honest; an observer fires twice in
 * total — once when the top leaves, once when it comes back.
 *
 * Sets the flag on <html> rather than passing state down, which keeps the
 * header a server component and leaves its markup untouched.
 */
export function HeaderScrollState() {
  useEffect(() => {
    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(([entry]) => {
      root.toggleAttribute("data-scrolled", !entry.isIntersecting);
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      root.removeAttribute("data-scrolled");
    };
  }, []);

  return null;
}

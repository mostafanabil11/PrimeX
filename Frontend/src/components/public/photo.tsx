"use client";

import { useEffect, useRef } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * next/image that fades in once the file has actually decoded.
 *
 * Photographs otherwise appear in the frame they finish loading, which on a
 * slow connection is a page of grey boxes snapping into pictures one at a
 * time. This is the only motion on the site tied to the network rather than to
 * the viewer, and it is worth it here because the photography is what sells
 * the gym.
 *
 * Priority images are left alone on purpose. They are the largest thing in the
 * viewport and therefore the LCP candidate, and an element at opacity 0 does
 * not count as painted — fading the hero would push the metric out by however
 * long the fade lasts, to make the hero look nicer arriving.
 */
// alt is pulled out of the spread rather than passed through it purely so the
// a11y lint rule can see it. ImageProps already makes it required, so this
// changes nothing at runtime.
export function Photo({ className, alt, ...props }: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const fades = !props.priority;

  useEffect(() => {
    const el = ref.current;
    if (!el || !fades) return;

    const reveal = () => el.setAttribute("data-loaded", "");

    // A cached image is already complete before any listener is attached, so
    // its load event fired long ago and nothing would ever mark it. Without
    // this check every image the visitor has seen before stays at opacity 0 —
    // the failure that only shows up on a second visit.
    if (el.complete) {
      reveal();
      return;
    }

    // A native listener rather than React's onLoad prop: next/image wraps that
    // prop for its own placeholder handling, so whether a given version passes
    // it through is not something worth depending on. This is also why `error`
    // is here — a photo that 404s must still end up visible, or the broken
    // image and its alt text are hidden behind opacity 0 and the page just has
    // a hole in it.
    el.addEventListener("load", reveal);
    el.addEventListener("error", reveal);

    return () => {
      el.removeEventListener("load", reveal);
      el.removeEventListener("error", reveal);
    };
  }, [fades]);

  return (
    <Image
      {...props}
      alt={alt}
      ref={ref}
      // TWO ATTRIBUTES, TWO JOBS. `data-photo` used to carry both and was only
      // written for non-priority images, which meant every hero on the site
      // quietly opted out of the brand's photography treatment as well as out
      // of the fade — see the note in globals.css.
      //
      // data-photo: this is a photograph on this site. Always. It is what
      //   applies the desaturation that keeps red the only saturated thing on
      //   the page.
      // data-fade: and it may fade in when it decodes. Withheld from priority
      //   images, because an element at opacity 0 does not count as painted
      //   and would push LCP out by however long the fade lasts.
      data-photo=""
      data-fade={fades ? "" : undefined}
      className={className}
    />
  );
}

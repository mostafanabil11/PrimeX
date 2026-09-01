"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

// A dark strip with red separators, not a red strip.
//
// This used to be a solid bg-primary band, which worked when the accent was
// the old lime — a light colour carrying dark text reads as a quiet rule. At
// #e60000 the same band becomes the loudest element on the page and sits
// directly above the hero, so the first thing the eye lands on is a ticker of
// secondary claims rather than the headline. The design's own rule is that red
// is for the one thing being asked of you.
//
// So the fill drops to the raised surface and red is spent only on the ticks
// between items, where it still reads as brand without competing. The red
// hairlines top and bottom are the design's "structural beam" motif and are
// what keep the strip from dissolving into the header above it.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A CLIENT COMPONENT
//
// It carries a pause button, and it has to. This is the only continuously
// moving thing on the site: it starts on its own, it runs for 92 seconds a
// lap, and it never stops. WCAG 2.2.2 asks for a mechanism to pause anything
// that does all three, and the previous mechanism was
// `hover:[animation-play-state:paused]` — which on a phone does not exist. So
// on the surface this site is most used on, a strip of text moved forever with
// no way to stop it.
//
// The button sits at the trailing edge on its own opaque ground with a short
// fade in front of it, so the scrolling text reads as passing behind it rather
// than being clipped by it. It is 44px square like every other control, and it
// is the only element in the bar that is not decoration.
//
// A visitor who has asked their OS for reduced motion never sees motion here
// at all — globals.css stops the animation outright for them — but the button
// stays, because "stopped" and "stoppable" are different promises.
export function AnnouncementBar({ items }: { items: string[] }) {
  const [paused, setPaused] = useState(false);

  if (items.length === 0) return null;

  const half = (
    // min-w-[100vw] is the whole trick, and it replaces a magic number.
    //
    // The animation translates the track by -50%, so a seamless loop needs two
    // things: the track must be exactly two identical halves (any other count
    // lands mid-sequence), and one half must be at least as wide as the
    // viewport (or the tail runs out before the loop point and a gap crosses
    // the screen).
    //
    // This used to be solved by repeating four claims TWENTY times and hoping
    // that covered the widest plausible monitor. It did — at a cost of 160 DOM
    // nodes on every single route, about a quarter of the homepage's entire
    // element count, every one of them inside a permanently running animation.
    // Pinning each half to 100vw satisfies the width requirement exactly, at
    // any viewport, with two copies instead of twenty.
    <div className="flex w-max min-w-[100vw] shrink-0 items-center justify-around gap-x-8 pe-8">
      {items.map((item, i) => (
        <span
          key={i}
          className="flex shrink-0 items-center gap-x-8 font-mono text-[11px] font-medium tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase"
        >
          {item}
          <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-primary" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      data-marquee-paused={paused}
      className="relative w-full overflow-hidden border-y border-primary/30 bg-surface-1"
    >
      <div className="animate-marquee flex w-max items-center py-2.5">
        {half}
        {/* The duplicate exists only to make the loop continuous. A screen
            reader that announced the claims twice would be reporting the
            implementation rather than the content. */}
        <div aria-hidden>{half}</div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center">
        <span aria-hidden className="h-full w-10 bg-linear-to-r from-transparent to-surface-1" />
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="pointer-events-auto flex size-11 shrink-0 items-center justify-center bg-surface-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
        >
          {paused ? (
            <Play aria-hidden className="size-3.5" strokeWidth={2} fill="currentColor" />
          ) : (
            <Pause aria-hidden className="size-3.5" strokeWidth={2} fill="currentColor" />
          )}
          <span className="sr-only">
            {paused ? "Resume the announcements" : "Pause the announcements"}
          </span>
        </button>
      </div>
    </div>
  );
}

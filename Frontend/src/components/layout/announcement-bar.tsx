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
export function AnnouncementBar({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  // Repeat items many times so that half of the total width is wider than any screen.
  // This guarantees a seamless loop when translating by -50%.
  const repeatedItems = Array(20).fill(items).flat();

  return (
    <div className="w-full overflow-hidden border-y border-primary/30 bg-surface-1">
      <div className="animate-marquee flex w-max items-center gap-x-8 py-2.5 hover:[animation-play-state:paused]">
        {repeatedItems.map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-x-8 font-mono text-[11px] font-medium tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase"
          >
            {item}
            <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-primary" />
          </span>
        ))}
      </div>
    </div>
  );
}

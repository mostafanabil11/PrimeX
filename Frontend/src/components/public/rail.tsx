import { Children } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

/**
 * A horizontal snap-scrolling rail that bleeds off the edge of the screen,
 * ending in a "see all" card. Becomes an ordinary grid at `lg`.
 *
 * This is the redesign's answer to the preview sections. What was here before
 * was a grid of four cards, CSS-clipped to two on a phone — which is not a
 * preview, it is a truncated index, and it cost roughly 1,600px of scroll
 * across the classes and trainers sections combined. Three cards in a rail
 * show the same amount of the catalogue in about 300px and, crucially, the
 * card cut off at the edge is what tells somebody there is more without a word
 * of copy doing it.
 *
 * ---------------------------------------------------------------------------
 * THE NEGATIVE MARGIN IS THE POINT, and it is why this is a component rather
 * than a handful of utilities repeated at each call site.
 *
 * Section applies the page's own horizontal margin. A rail that respects that
 * margin stops short of the screen edge, and a rail that stops short reads as
 * a row that merely overflows — the last card ends in whitespace and the
 * affordance is gone. So the rail cancels the page gutter with a negative
 * inline margin and pays it straight back as padding, which puts the first
 * card on the text margin where it belongs while letting the strip itself run
 * to the physical edge.
 *
 * Logical properties (`-ms`/`-me`, `ps`/`pe`) rather than left/right, so an
 * RTL locale mirrors this for free. Direction is the expensive half of an
 * Arabic port and it costs nothing to avoid now.
 *
 * ---------------------------------------------------------------------------
 * Above `lg` the rail stops scrolling and becomes a grid. A snap rail is a
 * touch affordance: on a mouse it is a row you have to shift-scroll, which is
 * worse than the grid it replaced. Dropping the overflow context there also
 * lets the cards' hover state (which scales the photo) escape the box instead
 * of being clipped by a scroller that no longer needs to exist.
 */
export function Rail({
  children,
  seeAll,
  item = "class",
  gridClassName = "lg:grid-cols-4",
}: {
  children: React.ReactNode;
  /** The trailing card. Omit when there is nothing more to show. */
  seeAll?: { href: string; label?: string };
  /**
   * Card width while the rail scrolls; ignored once it is a grid. A closed set
   * rather than a free string because Tailwind cannot see through an
   * interpolated class name — a `w-[${n}px]` here would compile to nothing.
   */
  item?: "class" | "trainer";
  /** Column count once the rail becomes a grid. */
  gridClassName?: string;
}) {
  // 232px for the landscape class cards, 172px for the portrait trainer ones —
  // both chosen so the third card is cut roughly in half at 375px, which is
  // what makes the rail read as continuing rather than as ending raggedly.
  const width = item === "trainer" ? "w-[172px]" : "w-[232px]";

  return (
    <div
      className={`rail -ms-margin-mobile -me-margin-mobile gap-3 ps-margin-mobile pe-margin-mobile pb-1 md:-ms-margin-desktop md:-me-margin-desktop md:ps-margin-desktop md:pe-margin-desktop lg:ms-0 lg:me-0 lg:grid lg:gap-gutter lg:p-0 ${gridClassName}`}
    >
      {/* Each child is sized by the rail rather than sizing itself, so a card
          stays a card and knows nothing about the strip it might be sitting
          in. The wrapper stretches in both the flex and the grid state, so the
          cards' own `h-full` still reaches a real height. */}
      {Children.map(children, (child, i) => (
        <div key={i} className={`flex shrink-0 ${width} lg:w-auto`}>
          {child}
        </div>
      ))}

      {seeAll && (
        // Dashed and narrower than a card: this is not another item in the
        // set, it is the end of it. Hidden once the rail becomes a grid — the
        // section header's own "All 10 →" link does this job on desktop, and
        // two links to the same page in one section is noise.
        <Link
          href={seeAll.href}
          className="press flex w-[110px] shrink-0 flex-col items-center justify-center gap-2.5 border border-dashed border-concrete text-center font-mono text-[12px] font-bold tracking-[0.1em] text-primary-soft uppercase transition-colors hover:border-primary-soft hover:text-foreground lg:hidden"
        >
          <ChevronRight aria-hidden className="size-5" strokeWidth={2} />
          {seeAll.label ?? "See all"}
        </Link>
      )}
    </div>
  );
}

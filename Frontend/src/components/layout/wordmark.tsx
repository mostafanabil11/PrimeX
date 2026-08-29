import { BRAND } from "@/lib/brand";

/**
 * The PrimeX lockup, traced from the master logo.
 *
 * Vector rather than an embedded bitmap: a few hundred bytes, sharp at every
 * size, recolours through currentColor, and it inherits the page's own font so
 * the wordmark and the headlines cannot drift apart the way an exported image
 * does the moment the type is retuned.
 *
 * GEOMETRY
 *
 * One bolt, not two marks. It enters bottom-left, passes behind the word, and
 * exits top-right; the two red shapes are the parts you can see either side of
 * the letters, which is why they are offset rather than mirrored.
 *
 * Each dart is a BARB, not a triangle — four points, with a notch cut into the
 * base so the tail reads as a swallowtail. Two earlier passes drew them as
 * plain triangles and the mark read as a word flanked by two arrows rather than
 * as a bolt behind a word. The notch is the whole character of it.
 *
 * The darts overshoot the word at both ends. That is faithful to the original,
 * and it also makes the mark tolerant of the type reflowing a few pixels
 * between the fallback font and Anybody arriving — the barbs never have to meet
 * a letterform at an exact point.
 *
 * The word is live <text>, so it stays selectable and readable to a screen
 * reader; the aria-label carries the accessible name and the visual text is
 * marked presentational so the name is not announced twice.
 *
 * KNOWN DIVERGENCE. The word is set in Anybody, which is not the logo's
 * typeface. The original is a wider, shorter face — at matching cap height it
 * runs about 10% wider than Anybody reaches without letter-spacing that would
 * look sprung. Cap height is matched and the width left slightly narrow, since
 * height is what the eye reads as "the right size". Swap this file out for the
 * real vector when it turns up; the props do not need to change.
 */
export function Wordmark({
  className = "",
  withTagline = false,
}: {
  className?: string;
  /** Adds the strapline. The master lockup always carries it, but at header
   *  height it would set at around 4px, so the header uses the word alone. */
  withTagline?: boolean;
}) {
  return (
    <svg viewBox="0 0 600 312" className={className} role="img" aria-label={BRAND.name}>
      {/* Painted before the text, so the letters sit on top and the bolt reads
          as passing behind them. Point order per dart: tip, far corner, near
          corner, notch. */}
      <path d="M0 312 L245 199 L94 197 L127 225 Z" fill="var(--primary)" />
      <path d="M600 1 L355 114 L506 115 L472 88 Z" fill="var(--primary)" />

      {/* currentColor so one instance serves the dark header, a light print
          stylesheet, and a one-colour export without needing a variant. */}
      <text
        x="123"
        y="184"
        aria-hidden="true"
        className="font-display"
        fontSize="76"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="1"
        fill="currentColor"
      >
        Primex
      </text>

      {withTagline && (
        <text
          x="474"
          y="207"
          aria-hidden="true"
          textAnchor="end"
          className="font-display"
          fontSize="17"
          fontWeight="500"
          fontStyle="italic"
          fill="currentColor"
        >
          {BRAND.tagline}
        </text>
      )}
    </svg>
  );
}

import { BRAND } from "@/lib/brand";

/**
 * The PrimeX lockup, redrawn from the illuminated sign in the gym.
 *
 * Traced rather than embedded. The reference is a photograph of a lit sign,
 * shot at an angle in a dark room with an air-conditioning unit in frame —
 * unusable as an asset at any size. As vector it is a few hundred bytes, sharp
 * at every size, recolours through currentColor, and inherits the page's own
 * font so the wordmark and the headlines cannot drift apart the way an exported
 * image does the moment the type is retuned.
 *
 * GEOMETRY, from the sign:
 *
 *   - One bolt, not two marks. It enters bottom-left, passes behind the word,
 *     and exits top-right. The two red shapes are the parts of it you can see
 *     either side of the letters, which is why they are offset rather than
 *     mirrored — a bolt steps sideways as it descends.
 *   - Both darts are long, thin and shallow-angled. An earlier version of this
 *     file guessed at short fat chevrons and it read as arrows, not lightning.
 *   - The bolt is BIG relative to the word — it spans the full width and
 *     overshoots the word at both ends. That overshoot is also what makes the
 *     mark tolerant of the type reflowing a few pixels between the fallback
 *     font and Anybody arriving: the darts never have to meet a letterform at
 *     an exact point.
 *   - "Commit to be fit" is right-aligned to the end of the word, not centred
 *     and not left-aligned under the P.
 *
 * The word is live <text>, so it stays selectable and readable to a screen
 * reader. <title> carries the accessible name and the visual text is marked
 * presentational, so the name is not announced twice.
 */
export function Wordmark({
  className = "",
  withTagline = false,
}: {
  className?: string;
  /** Adds the strapline. The sign always carries it, but at header height it
   *  would set at around 4px, so the header uses the word alone. */
  withTagline?: boolean;
}) {
  return (
    <svg viewBox="0 0 600 312" className={className} role="img" aria-label={BRAND.name}>
      {/* Painted before the text so the letters sit on top, exactly as the bolt
          passes behind the word on the sign. */}
      <path d="M2 309 L240 194 L98 194 Z" fill="var(--primary)" />
      <path d="M598 4 L375 108 L515 108 Z" fill="var(--primary)" />

      {/* currentColor so one instance serves the dark header, a light print
          stylesheet, and a one-colour export without needing a variant. */}
      <text
        x="124"
        y="172"
        aria-hidden="true"
        className="font-display"
        fontSize="80"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="-2"
        fill="currentColor"
      >
        Primex
      </text>

      {withTagline && (
        <text
          x="474"
          y="196"
          aria-hidden="true"
          textAnchor="end"
          className="font-display"
          fontSize="21"
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

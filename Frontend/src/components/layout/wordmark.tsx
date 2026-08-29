import { BRAND } from "@/lib/brand";

/**
 * The PrimeX lockup: the word, slashed through by the lightning bolt.
 *
 * Drawn rather than shipped as a bitmap. The supplied logo is a 1024px raster
 * on an opaque navy field, which cannot sit on this palette without a halo,
 * cannot recolour for the one-colour contexts below, and is soft on a retina
 * header at the 32px it actually renders at. As vector it is a couple of
 * hundred bytes, sharp at every size, and inherits the page's own font — so
 * the wordmark and the headlines can never drift apart the way an exported
 * image does the moment the type is retuned.
 *
 * The word is live <text>, not outlines, so it stays selectable and readable
 * to a screen reader — the <title> is the accessible name and the visual text
 * is marked presentational so the name is not announced twice.
 *
 * NOTE ON THE BOLT: the two darts deliberately overshoot the word on both
 * ends and are painted BEFORE the text, so they read as one bolt passing
 * behind it. That overshoot is also what makes the mark tolerant of the type
 * reflowing a few pixels between the fallback font and Anybody arriving —
 * the darts never need to meet the letterforms at an exact point.
 */
export function Wordmark({
  className = "",
  withTagline = false,
}: {
  className?: string;
  /** Adds the strapline beneath. For the footer and other roomy contexts —
   *  at header size it would set the tagline at about 6px and turn to mud. */
  withTagline?: boolean;
}) {
  return (
    <svg
      viewBox={withTagline ? "0 0 300 116" : "0 0 300 96"}
      className={className}
      role="img"
      aria-label={BRAND.name}
    >
      {/* Lower-left dart, trailing off before the P. */}
      <path d="M108 60 L2 96 L64 60 Z" fill="var(--primary)" />
      {/* Upper-right dart, leading away past the X. */}
      <path d="M192 36 L298 0 L236 36 Z" fill="var(--primary)" />

      {/* currentColor so a single instance serves the dark header, a light
          print stylesheet, and the one-colour favicon without a variant. */}
      <text
        x="26"
        y="66"
        aria-hidden="true"
        className="font-display"
        fontSize="58"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="-2.5"
        fill="currentColor"
      >
        PrimeX
      </text>

      {withTagline && (
        <text
          x="30"
          y="98"
          aria-hidden="true"
          className="font-mono"
          fontSize="13"
          fontWeight="500"
          letterSpacing="4.4"
          fill="currentColor"
          opacity="0.75"
        >
          {BRAND.tagline.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

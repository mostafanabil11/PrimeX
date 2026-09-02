import Image from "next/image";
import { BRAND } from "@/lib/brand";

/**
 * The PrimeX lockup — the real logo, not a redraw.
 *
 * This component used to draw the mark as inline SVG, traced by eye first from
 * a photograph of the illuminated sign and then from a flat export. Both traces
 * were close and neither was right: the word was set in Anybody rather than the
 * logo's own typeface, which is wider and shorter, and the barbs on the bolt
 * were drawn as straight cuts. A logo that is almost right is worse than one
 * that is right, so all of that is gone.
 *
 * What renders now is derived from the master artwork in
 * `design/Primex _web_design/logo/final logo.png` — RGBA, transparent ground,
 * type in pure white. `public/brand/primex-lockup.png` is produced from it by
 * `scripts/generate-logo-assets.mjs` rather than exported by hand, so the trim
 * cannot silently drift from the master. Re-run that script if the master
 * changes; do not edit the PNG.
 *
 * ONE MARK, WHOLE, EVERYWHERE. An earlier version generated a second file with
 * "Commit to be fit" erased, on the reasoning that at header height the
 * strapline renders around 4px and stops being legible as words. That was
 * overruled and the variant is gone: the strapline is part of the lockup, and
 * the brand is shown whole rather than quietly edited to suit a layout. Where
 * it is too small to read it still reads as part of the mark.
 *
 * The white type is baked into the pixels, so this only works on a dark ground.
 * That is fine — the app has one theme and it is dark. A light-background
 * placement would need its own export from the master.
 */
export function Wordmark({
  className = "",
  priority = false,
  width,
}: {
  className?: string;
  /** Set on the header, which is the topmost thing on every page — without it
   *  the logo lazy-loads and the header flashes empty on first paint. */
  priority?: boolean;
  /**
   * The widest this mark actually renders, in CSS pixels, at this call site.
   *
   * THIS IS NOT OPTIONAL WHEREVER THE MARK IS LARGER THAN THE HEADER'S, and
   * the reason is a bug that shipped: `sizes` used to be hardcoded to the
   * header's own widths for every placement. The footer draws this at h-24
   * (185px across) and the mobile menu at h-20 (154px), but both were handed
   * `sizes="…144px"`, so the browser picked the 144px-wide bitmap and stretched
   * it — the mark was visibly soft in precisely the two places it renders
   * largest and gets looked at longest, while the header it was tuned for was
   * the only one that looked right.
   *
   * Give this the rendered width and the browser picks a source that covers it
   * (and the 2x/3x variant on a phone). Leaving it out keeps the header's
   * value, which is correct only for the header.
   */
  width?: number;
}) {
  return (
    <Image
      src="/brand/primex-lockup.png"
      alt={BRAND.name}
      // The intrinsic size of the trimmed artwork. Passed so Next reserves the
      // right box and nothing shifts on load; the rendered size comes from the
      // height utility in className, with width following the ratio.
      width={942}
      height={488}
      // Without this Next has no idea how wide the logo actually renders and
      // fetches a variant sized for the viewport — it was pulling 1080px for a
      // mark that is never more than 224 CSS pixels across. The default is the
      // header's two real widths; anything bigger passes its own.
      sizes={width ? `${width}px` : "(min-width: 768px) 224px, 144px"}
      priority={priority}
      quality={90}
      className={className}
    />
  );
}

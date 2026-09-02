"use client";

import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";

/**
 * The two-line lockup that sits to the right of the logo, behind a hairline.
 *
 * The design is explicit that this is not decoration to be dropped: the main
 * bar is 96px with the nav centred, and without something on the left the
 * logo floats in a quarter of the bar of empty ground — which is the emptiness
 * the redesign set out to fix. It is context-dependent, though, so it says
 * where you are: on /admin it names the console, everywhere else it carries
 * the fact a gym visitor most wants off a header, which is that the place is
 * open now.
 *
 * IT DOES NOT NAME A BRANCH. The comp's second line is the branch ("NASR CITY
 * BRANCH") and this shipped that way for one revision, printing "MAADI BRANCH"
 * off the seeded data. There is one gym and it is not a branch of anything, so
 * that line was saying something untrue about the business in the most
 * prominent place on the site. The tagline goes there instead: it is the one
 * line that is always true, it is already the brand's own words (lib/brand.ts),
 * and at 10px it is the first time it is actually legible — inside the logo
 * artwork above it, the same words render at about a third of that and read as
 * a smudge rather than as copy.
 *
 * Client-side for the pathname, same as HeaderNav.
 */
export function HeaderLockup() {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <div className="hidden shrink-0 flex-col justify-center 2xl:flex">
      {isAdmin ? (
        <>
          <div className="flex items-center gap-2 mb-1.5">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="font-mono text-[11px] font-bold tracking-[0.2em] whitespace-nowrap text-foreground uppercase">
              Admin console
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.18em] whitespace-nowrap text-muted-foreground/70 uppercase">
            {BRAND.tagline}
          </span>
        </>
      ) : (
        <span className="font-mono text-[11px] font-bold tracking-[0.2em] whitespace-nowrap text-foreground uppercase">
          {BRAND.tagline}
        </span>
      )}
    </div>
  );
}

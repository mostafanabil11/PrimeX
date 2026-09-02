import { Link } from "@/i18n/navigation";
import { MapPin, Clock } from "lucide-react";
import { NewsletterForm } from "./newsletter-form";
import { Wordmark } from "./wordmark";
import { BRAND } from "@/lib/brand";
import { FOOTER_NAV } from "@/lib/nav";
import { SocialLinks } from "@/components/public/floating-contact";
import { getBranchesServer } from "@/lib/api/gym-server";
import { fullAddress, mapsUrl } from "@/lib/gym-format";

export async function SiteFooter() {
  // The gym's own address and phone, from the same source the contact page and
  // the structured data read. Fetched rather than hardcoded so a move or a new
  // reception line is a database edit, and cached by the same server-fetch
  // layer everything else uses — this costs nothing per page.
  //
  // "The first branch", matching /contact: the gym runs from one site, and
  // writing it this way rather than pinning a slug keeps it working if the
  // gym renames it or opens somewhere new.
  //
  // getBranchesServer never throws (see server-fetch.ts), so an unreachable API
  // loses the address block and keeps the rest of the footer.
  const branch = (await getBranchesServer())[0] ?? null;

  return (
    // The 2px red rule across the top is the design's "structural beam": it is
    // what separates the footer from the page without a section break, and it
    // is the one place a full-width red element is not competing with anything
    // because there is nothing below it.
    //
    // The bottom padding is deliberately large and safe-area aware. The
    // floating WhatsApp button is fixed 16px from the bottom of the viewport
    // and is 52px across, so anything within ~84px of the page's end sits
    // underneath it — which is exactly what used to happen to the copyright
    // line on every page, and to "Privacy Policy" on /contact. Reserving the
    // room here is the only fix that works, because the button cannot know how
    // tall the page is.
    <footer className="mt-stack-xl w-full border-t-2 border-primary bg-surface-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      {/* gap-6 on a phone rather than the 24px gutter, and the blocks below
          are tightened to match. The footer ran to 800px on a 375px screen —
          taller than the viewport, for four blocks of secondary material — and
          most of that was air rather than content: a 96px wordmark, a 32px
          margin before the newsletter, and full-gutter spacing between blocks
          that on one column are simply stacked. */}
      <div className="mx-auto grid w-full max-w-(--spacing-container-max) grid-cols-1 gap-6 px-margin-mobile py-stack-md md:gap-gutter md:grid-cols-12 md:px-margin-desktop">
        <div className="flex flex-col items-start md:col-span-3">
          {/* An inline-flex column that shrinks to the wordmark's own width, so
              items-center centres the social row under the lockup rather than
              under the whole footer column. The outer div stays items-start, so
              the block as a whole is still left-aligned with the rest of the
              footer — only the icons are centred, and only against the mark
              directly above them. */}
          <div className="inline-flex flex-col items-center">
            {/* The full lockup with its strapline, which the header has no room
                for — at 28px tall the tagline would set at about 6px.
                `width` is passed because this renders far larger than the
                header does, and Wordmark's default `sizes` is the header's —
                without it the browser is handed a 144px bitmap to fill a 185px
                box and the mark renders visibly soft. */}
            {/* 64px on a phone, 96 from md. This is a footer mark — it
                identifies the page rather than selling it, and at 96px it was
                the single largest element in a block whose job is to be
                skimmed past. */}
            <Wordmark className="h-16 w-auto md:h-24" width={192} />
            {/* Social lives here and nowhere else now. The floating rail was
                removed for reading as clutter, so this is the site's only
                social presence — which is the conventional home for it. */}
            <SocialLinks className="mt-1 md:mt-3" />
          </div>
        </div>

        {/* Where to find us, on every page.
            This block did not exist. For a single-location gym whose visitors
            are overwhelmingly on phones, the address, the phone number and
            "open 24 hours" are the three facts most often wanted — and the
            footer is where people look for them by reflex. Sending them to a
            separate contact page to read one line was a needless hop. */}
        {branch && (
          <div className="flex flex-col gap-2 md:col-span-3 md:gap-3">
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Where to find us
            </p>
            <a
              href={mapsUrl(branch)}
              target="_blank"
              rel="noopener noreferrer"
              className="-my-1 flex min-h-11 items-start gap-2.5 py-1 text-[14px] text-foreground transition-colors hover:text-primary-soft"
            >
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
              <span>{fullAddress(branch)}</span>
            </a>

            <p className="flex items-center gap-2.5 text-[14px] text-muted-foreground">
              <Clock aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
              <span>Open 24 hours, seven days a week</span>
            </p>
          </div>
        )}

        {/* py-3 on each link with a tightened column gap: the visual rhythm is
            what it was, but every link now clears 44px instead of standing at
            18px with a 16px gap either side — the shape that produces a tap on
            FAQ when the finger was aimed at Contact. */}
        <div className="grid grid-cols-2 gap-x-8 md:col-span-3">
          {[FOOTER_NAV.slice(0, 4), FOOTER_NAV.slice(4)].map((column, i) => (
            <div key={i} className="flex flex-col">
              {column.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 items-center font-mono text-[12px] font-medium tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-primary-soft"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start gap-4 md:col-span-3 md:items-end">
          <div className="w-full md:text-right">
            <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Train With Us
            </p>
            <div className="md:ml-auto md:flex md:justify-end">
              <NewsletterForm />
            </div>
          </div>
          <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            {`© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}

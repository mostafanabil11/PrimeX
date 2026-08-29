import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";
import { Wordmark } from "./wordmark";
import { BRAND } from "@/lib/brand";
import { FOOTER_NAV } from "@/lib/nav";
import { SocialLinks } from "@/components/public/floating-contact";

export function SiteFooter() {
  return (
    // The 2px red rule across the top is the design's "structural beam": it is
    // what separates the footer from the page without a section break, and it
    // is the one place a full-width red element is not competing with anything
    // because there is nothing below it.
    <footer className="mt-stack-xl w-full border-t-2 border-primary bg-surface-1">
      <div className="mx-auto grid w-full max-w-(--spacing-container-max) grid-cols-1 gap-gutter px-margin-mobile py-stack-md md:grid-cols-4 md:px-margin-desktop">
        <div className="flex flex-col items-start">
          {/* An inline-flex column that shrinks to the wordmark's own width, so
              items-center centres the social row under the lockup rather than
              under the whole footer column. The outer div stays items-start, so
              the block as a whole is still left-aligned with the rest of the
              footer — only the icons are centred, and only against the mark
              directly above them. */}
          <div className="inline-flex flex-col items-center">
            {/* The full lockup with its strapline, which the header has no room
                for — at 28px tall the tagline would set at about 6px. */}
            <Wordmark withTagline className="h-14 w-auto text-foreground" />
            {/* Social lives here and nowhere else now. The floating rail was
                removed for reading as clutter, so this is the site's only
                social presence — which is the conventional home for it. */}
            <SocialLinks className="mt-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:col-span-2">
          {[FOOTER_NAV.slice(0, 4), FOOTER_NAV.slice(4)].map((column, i) => (
            <div key={i} className="flex flex-col gap-4">
              {column.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-[12px] font-medium tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-primary-soft"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 md:mt-0 md:items-end">
          <div className="w-full md:text-right">
            <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Train With Us
            </p>
            <div className="md:ml-auto">
              <NewsletterForm />
            </div>
          </div>
          <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

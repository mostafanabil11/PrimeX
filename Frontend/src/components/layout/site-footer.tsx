import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";
import { Wordmark } from "./wordmark";
import { BRAND } from "@/lib/brand";
import { FOOTER_NAV } from "@/lib/nav";
import { formatEgyptianPhone } from "@/lib/gym-format";
import { WhatsAppIcon, WhatsAppLink } from "@/components/public/whatsapp";

export function SiteFooter() {
  return (
    // The 2px red rule across the top is the design's "structural beam": it is
    // what separates the footer from the page without a section break, and it
    // is the one place a full-width red element is not competing with anything
    // because there is nothing below it.
    <footer className="mt-stack-xl w-full border-t-2 border-primary bg-surface-1">
      <div className="mx-auto grid w-full max-w-(--spacing-container-max) grid-cols-1 gap-gutter px-margin-mobile py-stack-md md:grid-cols-4 md:px-margin-desktop">
        <div className="flex flex-col items-start">
          {/* The full lockup with its strapline, which the header has no room
              for — at 28px tall the tagline would set at about 6px. */}
          <Wordmark withTagline className="mb-5 h-14 w-auto text-foreground" />
          <WhatsAppLink
            message={`Hi ${BRAND.name}, I have a question.`}
            className="inline-flex items-center gap-2 font-mono text-[12px] font-bold tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-primary-soft"
          >
            <WhatsAppIcon className="size-4" />
            {formatEgyptianPhone(BRAND.whatsapp)}
          </WhatsAppLink>
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

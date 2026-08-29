import type { Metadata } from "next";
import { Suspense } from "react";
import { MapPin, Phone, Mail, ExternalLink, Check } from "lucide-react";
import { getBranchesServer, getContentServer } from "@/lib/api/gym-server";
import { contentText } from "@/types/gym";
import { BRAND, pageTitle } from "@/lib/brand";
import { fullAddress, mapsUrl, formatTime, DAY_LABELS } from "@/lib/gym-format";
import { PageHeader, Section, SectionHeader, CtaButton } from "@/components/public/section";
import { Reveal } from "@/components/public/reveal";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { WhatsAppIcon, WhatsAppLink, WhatsAppCta } from "@/components/public/whatsapp";
import { joinEnquiry } from "@/lib/whatsapp-messages";

export const metadata: Metadata = {
  title: pageTitle("Contact"),
  description: `Where to find ${BRAND.name} — address, phone and WhatsApp, and how to join. Open 24 hours, seven days a week.`,
  alternates: { canonical: "/contact" },
};

/**
 * Contact and where to find us, in one page.
 *
 * These used to be two — a Locations index, a branch page, and a thin contact
 * form — which made sense across three sites and stopped making sense at one.
 * A list of one location is a worse answer than the address itself, so the
 * branch's own details moved here and /locations now redirects (next.config.ts).
 */
export default async function ContactPage() {
  const [branches, content] = await Promise.all([getBranchesServer(), getContentServer()]);

  // The gym runs from one site. Written as "the first branch" rather than a
  // hardcoded slug so this keeps working if the gym renames it or opens
  // somewhere new — the schema still models several.
  const branch = branches[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to us"
        body={contentText(
          content,
          "contact.intro",
          "Questions about membership, classes or personal training? Send us a message and we will come back to you within one working day.",
        )}
      />

      <Section>
        <div className="grid gap-stack-sm lg:grid-cols-[3fr_2fr]">
          <div>
            <Suspense fallback={<div className="h-96 animate-pulse bg-muted" />}>
              <div className="fade-in">
                <EnquiryForm type="contact" submitLabel="Send message" />
              </div>
            </Suspense>
          </div>

          {branch && (
            <aside className="flex flex-col gap-6 border border-border bg-surface-1 p-6">
              <div className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Where to find us
                </h2>
                <p className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
                  {fullAddress(branch)}
                </p>
                <a
                  href={mapsUrl(branch)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-primary-soft uppercase hover:underline"
                >
                  Get directions
                  <ExternalLink className="size-3.5" strokeWidth={1.5} />
                </a>
              </div>

              <div className="flex flex-col gap-2.5 border-t border-border pt-5">
                <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Reach us
                </h2>
                <WhatsAppLink
                  message={`Hi ${BRAND.name}, I have a question.`}
                  className="flex items-center gap-2.5 text-[13px] text-foreground hover:text-primary-soft"
                >
                  <WhatsAppIcon className="size-4 shrink-0" />
                  WhatsApp
                </WhatsAppLink>
                {branch.phone && (
                  <a
                    href={`tel:${branch.phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-2.5 text-[13px] text-foreground hover:text-primary-soft"
                  >
                    <Phone className="size-4 shrink-0" strokeWidth={1.5} />
                    {branch.phone}
                  </a>
                )}
                {branch.email && (
                  <a
                    href={`mailto:${branch.email}`}
                    className="flex items-center gap-2.5 text-[13px] break-all text-foreground hover:text-primary-soft"
                  >
                    <Mail className="size-4 shrink-0" strokeWidth={1.5} />
                    {branch.email}
                  </a>
                )}
              </div>

              <div className="border-t border-border pt-5">
                <h2 className="mb-3 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Opening hours
                </h2>
                <p className="text-[13px] text-foreground">
                  Open 24 hours, seven days a week.
                </p>
              </div>

              {branch.womenOnlyWindows.length > 0 && (
                <div className="border-t border-border pt-5">
                  <h2 className="mb-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Women-only hours
                  </h2>
                  <ul className="flex flex-col gap-1 text-[13px] text-muted-foreground">
                    {branch.womenOnlyWindows.map((w) => (
                      <li
                        key={`${w.day}-${w.startsAt}`}
                        className="flex justify-between gap-4"
                      >
                        <span className="text-foreground">{DAY_LABELS[w.day]}</span>
                        <span className="tabular-nums">
                          {formatTime(w.startsAt)} – {formatTime(w.endsAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-5">
                <WhatsAppCta message={joinEnquiry()} className="w-full">
                  Join on WhatsApp
                </WhatsAppCta>
                <CtaButton href="/membership" variant="outline" className="w-full">
                  See plans and prices
                </CtaButton>
              </div>
            </aside>
          )}
        </div>
      </Section>

      {branch && branch.facilities.length > 0 && (
        <Section className="border-t border-border">
          <SectionHeader eyebrow="The floor" title="What is here" />
          <ul className="grid gap-x-gutter gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {branch.facilities.map((facility, i) => (
              <li key={facility}>
                <Reveal
                  delay={(i % 3) * 70}
                  className="flex items-start gap-2.5 text-[14px] text-muted-foreground"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
                  {facility}
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

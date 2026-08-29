import type { Metadata } from "next";
import { getPlansServer } from "@/lib/api/gym-server";
import { pageTitle } from "@/lib/brand";
import { PageHeader, Section, SectionHeader, CtaButton, EmptyState } from "@/components/public/section";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { joinEnquiry } from "@/lib/whatsapp-messages";
import { Reveal } from "@/components/public/reveal";
import { PricingGrid, PriceMatrix } from "@/components/public/pricing-grid";

export const metadata: Metadata = {
  title: pageTitle("Membership"),
  description:
    "Four membership tiers — Starter, Go Pro, Master and Elite — sold monthly, quarterly, half-yearly or annually. See what each includes and what it costs.",
  alternates: { canonical: "/membership" },
};

const FAQ = [
  {
    q: "What is the difference between the tiers?",
    a: "How often you can train, and what you can train in. Starter and Go Pro cover the gym floor or the studio timetable — you choose which. Master and Elite cover both, and add jacuzzi, sauna and InBody scans.",
  },
  {
    q: "Is there a joining fee?",
    a: "There is a one-off joining fee on most plans — we will tell you before you commit to anything. Every annual plan waives it.",
  },
  {
    q: "What does a session mean?",
    a: "One visit. A Go Pro membership at three days a week works out as twelve sessions a month, and the number on each card is the total across the whole term. Elite has no cap at all.",
  },
  {
    q: "Can I freeze my membership?",
    a: "The longer Master and Elite plans include a month of freeze time — the card says which. Ask us on WhatsApp or at the desk and we will set the date you choose.",
  },
  {
    q: "What happens when my plan runs out?",
    a: "Nothing renews automatically. Message us on WhatsApp or drop by the desk when you want to carry on, and we will set you up again.",
  },
  {
    q: "Do the offers stack?",
    a: "No. Where more than one promotion covers a plan you get the single best one, never both applied one after the other. The price on the card is always the price you pay.",
  },
];

export default async function MembershipPage() {
  const plans = await getPlansServer();

  return (
    <>
      <PageHeader
        eyebrow="Membership"
        title="Choose your path"
        body="Four tiers, each sold over four terms. Pick how often you intend to train and how long you are willing to commit — the longer the term, the lower the monthly rate. Prices are below; memberships are arranged with the team over WhatsApp, and there is no online payment on this site."
      />

      <Section>
        {plans.length === 0 ? (
          <EmptyState message="Plans are being updated. Please check back shortly, or get in touch and we will talk you through the options." />
        ) : (
          <PricingGrid plans={plans} />
        )}
      </Section>

      {plans.length > 0 && (
        <Section className="border-t border-border">
          <SectionHeader eyebrow="Every price" title="The full grid" />
          <PriceMatrix plans={plans} />
        </Section>
      )}

      <Section className="border-t border-border">
        <SectionHeader eyebrow="Questions" title="Before you join" />
        <div className="grid gap-x-gutter gap-y-8 md:grid-cols-2">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={(i % 2) * 70} className="flex flex-col gap-2">
              <h3 className="text-[15px] font-semibold text-foreground">{item.q}</h3>
              <p className="text-[14px] leading-relaxed text-muted-foreground">{item.a}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-t border-border">
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase md:text-4xl">
            Still deciding?
          </h2>
          <p className="max-w-xl text-body-md text-muted-foreground">
            Come in and talk it through. We would rather point you at the tier that fits how you
            actually train than sell you the biggest one.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <WhatsAppCta message={joinEnquiry()}>Ask on WhatsApp</WhatsAppCta>
            <CtaButton href="/contact" variant="outline">
              Talk to us first
            </CtaButton>
          </div>
        </div>
      </Section>
    </>
  );
}

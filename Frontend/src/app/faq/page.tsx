import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { BRAND, pageTitle } from "@/lib/brand";
import { PageHeader, Section, CtaButton } from "@/components/public/section";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { joinEnquiry } from "@/lib/whatsapp-messages";
import { Reveal } from "@/components/public/reveal";
import { FaqSchema } from "@/components/public/structured-data";

export const metadata: Metadata = {
  title: pageTitle("FAQ"),
  description: `Answers to common questions about membership, classes, billing and visiting ${BRAND.name}.`,
  alternates: { canonical: "/faq" },
};

interface Faq {
  question: string;
  answer: React.ReactNode;
  /**
   * Plain-text answer, for the FAQPage structured data only.
   *
   * Required wherever `answer` is JSX: schema.org needs a string, and a React
   * node containing a link has no meaningful string form — stringifying it
   * would put component internals in the page instead of the answer. Entries
   * whose answer is already a plain string do not need it.
   */
  plain?: string;
}

const GROUPS: { title: string; faqs: Faq[] }[] = [
  {
    title: "Joining",
    faqs: [
      {
        question: "Can I try before I join?",
        answer: (
          <>
            Come in and ask at the desk, or message us on WhatsApp — we would rather show you
            the place than sell you a plan over the internet. The shortest commitment we sell is
            one month, on any tier.{" "}
            <Link href="/membership" className="text-primary-soft underline">
              See the plans
            </Link>
            .
          </>
        ),
        plain:
          "Come in and ask at the desk, or message us on WhatsApp. The shortest commitment we sell is one month, on any tier.",
      },
      {
        question: "What do I need to bring on my first visit?",
        answer:
          "Trainers, something to train in, and a water bottle. Towels and lockers are included with every membership. If you are joining on the day, bring ID.",
      },
      {
        question: "Is there a joining fee?",
        answer:
          "There is a one-off joining fee on most plans — we will tell you before you commit to anything. The annual plan waives it entirely.",
      },
      {
        question: "Do you have a student rate?",
        answer:
          "Yes. Bring a valid student card to your first session and we will verify it at the desk.",
      },
      {
        question: "How old do I have to be?",
        answer:
          "Sixteen to train on the gym floor unsupervised. Fourteen and fifteen year olds can train with a parent present or in a coached session — talk to us first.",
      },
    ],
  },
  {
    title: "Membership and billing",
    faqs: [
      {
        question: "What payment methods do you accept?",
        answer:
          "Cash at the front desk, or an InstaPay transfer. There is no online payment on this site — memberships are arranged with the team directly.",
      },
      {
        question: "Will my membership renew automatically?",
        answer:
          "No. Nothing renews on its own and nothing is ever charged without you choosing to pay. Message us on WhatsApp or drop by the desk when you want to carry on.",
      },
      {
        question: "Can I freeze my membership?",
        answer: (
          <>
            Most plans include a set number of freeze days — the{" "}
            <Link href="/membership" className="text-primary-soft underline">
              plan card
            </Link>{" "}
            says how many. Ask us on WhatsApp or at the desk and we will set the date it starts.
          </>
        ),
        plain:
          "Most plans include a set number of freeze days — the plan card says how many. Ask us on WhatsApp or at the desk and we will set the date it starts.",
      },
      {
        question: "Can I upgrade partway through?",
        answer:
          "Yes. Talk to us on WhatsApp or at the desk and we will work out the difference for the time remaining.",
      },
      {
        question: "What if I want to cancel?",
        answer:
          "Get in touch and we will process it. Cancellation takes effect after the notice period set out in your membership agreement.",
      },
    ],
  },
  {
    title: "Classes and training",
    faqs: [
      {
        question: "Are classes included in my membership?",
        answer: (
          <>
            It depends on the plan — some include a set number of classes each month, some include
            unlimited, and the entry plan is gym floor only. Each{" "}
            <Link href="/membership" className="text-primary-soft underline">
              plan
            </Link>{" "}
            says which.
          </>
        ),
        plain:
          "It depends on the plan — some include a set number of classes each month, some include unlimited, and the entry plan is gym floor only. Each plan says which.",
      },
      {
        question: "Do I need to book classes in advance?",
        answer:
          "Message us on WhatsApp and we will put your name down. There is no online booking on this site.",
      },
      {
        question: "I have never done a class before. Where do I start?",
        answer: (
          <>
            Functional Circuit or Strength Foundations. Both are coached from the ground up and
            assume no experience. Every class also carries an{" "}
            <Link href="/classes" className="text-primary-soft underline">
              intensity rating
            </Link>
            .
          </>
        ),
        plain:
          "Functional Circuit or Strength Foundations. Both are coached from the ground up and assume no experience. Every class also carries an intensity rating.",
      },
      {
        question: "Do you have women-only hours?",
        answer: (
          <>
            Yes. The exact windows are on the{" "}
            <Link href="/contact" className="text-primary-soft underline">
              contact page
            </Link>
            , alongside the rest of the week.
          </>
        ),
        plain:
          "Yes. The exact windows are on the contact page, alongside the rest of the week.",
      },
    ],
  },
  {
    title: "At the gym",
    faqs: [
      {
        question: "What are your opening hours?",
        answer: "We are open 24 hours a day, seven days a week.",
      },
      {
        question: "Is there parking?",
        answer:
          "Yes. The contact page lists what is on site, parking included.",
      },
      {
        question: "Can I bring a guest?",
        answer:
          "Most plans include guest passes each month. Bring them to the front desk and we will sign them in.",
      },
      {
        question: "I have an injury. Can I still train?",
        answer:
          "Usually, and often it is exactly what helps. Tell the front desk when you join, or add it to your profile, and speak to a coach before your first session so they can work around it.",
      },
    ],
  },
];

export default function FaqPage() {
  // Flattened across groups, since FAQPage is one list — the group headings
  // are a reading aid on the page, not part of the schema. Anything without a
  // usable string answer is dropped rather than emitted empty.
  const schemaFaqs = GROUPS.flatMap((group) =>
    group.faqs
      .map((faq) => ({
        question: faq.question,
        answer: faq.plain ?? (typeof faq.answer === "string" ? faq.answer : ""),
      }))
      .filter((faq) => faq.answer.length > 0),
  );

  return (
    <>
      <FaqSchema faqs={schemaFaqs} />

      <PageHeader
        eyebrow="FAQ"
        title="Questions we get asked"
        body="If the answer you need is not here, call us or send a message — we would rather tell you properly than have you guess."
      />

      {GROUPS.map((group) => (
        <Section key={group.title} className="border-b border-border">
          <h2 className="mb-stack-sm font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
            {group.title}
          </h2>
          <div className="grid gap-x-gutter gap-y-8 md:grid-cols-2">
            {group.faqs.map((faq, i) => (
              <Reveal key={faq.question} delay={(i % 2) * 70} className="flex flex-col gap-2">
                <h3 className="text-[15px] font-semibold text-foreground">{faq.question}</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground">{faq.answer}</p>
              </Reveal>
            ))}
          </div>
        </Section>
      ))}

      <Section>
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
            Still not sure?
          </h2>
          <p className="max-w-xl text-body-md text-muted-foreground">
            Ask us anything. We will come back to you within one working day.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <WhatsAppCta message={joinEnquiry()}>Ask on WhatsApp</WhatsAppCta>
            <CtaButton href="/contact" variant="outline">
              Send a message
            </CtaButton>
            <CtaButton href="/membership" variant="outline">
              See plans and prices
            </CtaButton>
          </div>
        </div>
      </Section>
    </>
  );
}

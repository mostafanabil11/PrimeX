import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Privacy Policy"),
  description: `How ${BRAND.name} collects, uses and protects your personal information, including health information.`,
  alternates: { canonical: "/privacy" },
};

// Plain language on purpose. A privacy policy nobody can read is not consent,
// and the health-data section in particular has to be understandable by the
// person it is about.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-lg md:px-margin-desktop">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-display text-4xl tracking-[-0.02em] text-foreground uppercase md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mb-12 text-[13px] text-muted-foreground">Last updated August 2026</p>

        <div className="flex flex-col gap-10 text-[14px] leading-relaxed text-muted-foreground">
          <Section title="What we collect">
            <p>
              When you create an account we collect your name, email address and password. The
              password is stored as a one-way hash — we never see it, and we cannot recover it for
              you.
            </p>
            <p>
              When you join we also collect your phone number, date of birth and an emergency
              contact. If you sign in with Google we receive your name and email from Google instead
              of a password.
            </p>
            <p>
              If you send us a message, we keep what you told us so we can call you back.
            </p>
          </Section>

          <Section title="Health information">
            <p>
              Any injuries or conditions you tell us about, and notes a coach makes about training
              around them, are <strong>sensitive personal information</strong>, and we treat them
              differently from everything else.
            </p>
            <p>
              They are visible only to you and to the staff who need them to keep you safe — your
              coaches and the front desk team. They are never used for marketing, never shared with
              anyone outside the gym, and never sold.
            </p>
            <p>
              You do not have to tell us anything. Some of it we ask for because training with an
              unmentioned heart condition is genuinely dangerous, but the choice is yours, and you
              can remove it from your profile at any time.
            </p>
          </Section>

          <Section title="Payments">
            <p>
              There is no online payment on this site at the moment. Membership is arranged with
              the team over WhatsApp or at the front desk, paid by cash or InstaPay, and the staff
              member who takes it records it against your membership.
            </p>
          </Section>

          <Section title="How we use it">
            <p>
              To run your membership: taking payment, telling you when it is due to expire, letting
              you book classes, and knowing whether you are entitled to walk in.
            </p>
            <p>
              To contact you about your membership — receipts, expiry reminders, booking
              confirmations and anything that affects a class you booked. These are part of the
              service and are not marketing.
            </p>
            <p>
              To send you news and offers, only if you have not turned that off. You can turn it off
              at any time from your profile settings, and every marketing email has an unsubscribe
              link.
            </p>
          </Section>

          <Section title="Who we share it with">
            <p>
              Our email provider, to deliver the messages above. Nobody else, unless the law
              requires it.
            </p>
            <p>We do not sell your information. There is no version of this where we would.</p>
          </Section>

          <Section title="Cookies">
            <p>
              We use a small number of cookies to keep you signed in. They hold a session token, not
              your details, and they are set as httpOnly so no script on the page can read them.
            </p>
            <p>
              We do not use advertising cookies or third-party trackers.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p>
              While you are a member, and for as long afterwards as we are required to keep financial
              records. Health information is deleted when you ask us to, or when your membership has
              been closed for two years, whichever comes first.
            </p>
            <p>
              Enquiries that never became memberships are deleted after twelve months.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You can see everything we hold about you, correct anything that is wrong, ask us to
              delete it, or ask for a copy to take elsewhere. Ask us and we will do it.
            </p>
            <p>
              Deleting your account does not delete records we are legally required to keep, such as
              invoices. It does delete your health information.
            </p>
          </Section>

          <Section title="Getting in touch">
            <p>
              Questions about any of this, or a request you want us to action, go through our{" "}
              <Link href="/contact" className="text-primary-soft underline">
                contact page
              </Link>{" "}
              or the front desk at any branch.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

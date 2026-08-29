import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Terms of Service"),
  description: `The terms that apply to ${BRAND.name} memberships, class bookings and use of the gym.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-lg md:px-margin-desktop">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-display text-4xl tracking-[-0.02em] text-foreground uppercase md:text-5xl">
          Terms of Service
        </h1>
        <p className="mb-12 text-[13px] text-muted-foreground">Last updated August 2026</p>

        <div className="flex flex-col gap-10 text-[14px] leading-relaxed text-muted-foreground">
          <Section title="Who these apply to">
            <p>
              These terms cover anyone using {BRAND.name} — members, guests on a pass, and anyone
              using this website. Joining, booking a class or walking through the door means you
              accept them.
            </p>
            <p>
              Your membership agreement is a separate document you accept when you join. Where the
              two disagree, the membership agreement wins.
            </p>
          </Section>

          <Section title="Membership">
            <p>
              A membership is personal to you and cannot be lent, shared or transferred. We may ask
              for identification at the desk.
            </p>
            <p>
              Your plan runs for the term you bought and ends on the date agreed when you joined.
              Nothing renews automatically — ask us any time to check how long you have left, and
              renewing is something you choose to do.
            </p>
            <p>
              Prices are in Egyptian pounds and include any applicable tax. A joining fee applies to
              most plans and is shown before you pay.
            </p>
          </Section>

          <Section title="Freezing and cancelling">
            <p>
              Most plans include a number of freeze days. Freezing pauses your access and extends
              your end date by the same number of days, up to the allowance on your plan.
            </p>
            <p>
              You can cancel at any time by telling us. Cancellation takes effect after the notice
              period in your membership agreement, and you keep access until then.
            </p>
            <p>
              We do not refund unused time on a plan you chose to cancel. If we close the gym or
              materially change what you paid for, that is different and we will make it right.
            </p>
          </Section>

          <Section title="Booking classes">
            <p>
              Booking opens two weeks ahead and closes shortly before the class starts. A booked spot
              is held for you; it is not held for anyone else.
            </p>
            <p>
              Cancel within the window shown when you book and your class credit is returned. Cancel
              later and it is not, because by then the spot cannot be filled by someone else.
            </p>
            <p>
              Repeatedly booking and not turning up may result in booking being suspended for a
              short period. This is not a punishment — it is the only way to keep popular classes
              available to people who will attend.
            </p>
            <p>
              We may cancel a session — a coach falls ill, equipment fails. If we do, everyone booked
              is notified and any credit used is returned.
            </p>
          </Section>

          <Section title="Your health">
            <p>
              Exercise carries risk. You train at your own risk and are responsible for knowing
              whether you are well enough to do so. If you are unsure, speak to a doctor before you
              start.
            </p>
            <p>
              You must tell us about any condition or injury that affects your ability to train
              safely, and keep that up to date. Tell the front desk, or add it to your profile from
              your account.
            </p>
            <p>
              Our coaches are qualified fitness professionals, not medical practitioners. Nothing
              they tell you is medical advice.
            </p>
            <p>
              Stop and tell a member of staff if you feel unwell, dizzy or in pain while training.
            </p>
          </Section>

          <Section title="Using the gym">
            <p>
              Use equipment as it is intended and as you have been shown. Put weights back. Wipe
              equipment down after use. Wear appropriate footwear — no bare feet or open sandals on
              the gym floor.
            </p>
            <p>
              Photography and filming are not permitted where other members appear without their
              agreement.
            </p>
            <p>
              We may end a membership without refund for behaviour that puts others at risk, for
              harassment of members or staff, or for deliberate damage to equipment. This is rare
              and we do not do it lightly.
            </p>
          </Section>

          <Section title="Your belongings">
            <p>
              Lockers are provided for use during your session. Leave nothing overnight. We are not
              responsible for property lost, damaged or stolen on the premises, so please do not
              bring anything you would hate to lose.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may change the classes we run, the equipment on the floor, or these terms. Where a
              change materially affects what you are paying for, we will tell you before it takes
              effect.
            </p>
          </Section>

          <Section title="Getting in touch">
            <p>
              Anything unclear here, ask us through the{" "}
              <Link href="/contact" className="text-primary underline">
                contact page
              </Link>{" "}
              or at the front desk.
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

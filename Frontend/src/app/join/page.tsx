import type { Metadata } from "next";
import { Suspense } from "react";
import { getPlansServer, getBranchesServer } from "@/lib/api/gym-server";
import { pageTitle } from "@/lib/brand";
import { PageHeader, Section, EmptyState } from "@/components/public/section";
import { JoinFunnel } from "@/components/join/join-funnel";
import { ReserveForm } from "@/components/join/reserve-form";
import { MEMBERSHIP_SALES_ENABLED, MEMBERSHIP_TRACKING_ENABLED } from "@/lib/features";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: pageTitle("Join"),
  description:
    "Reserve your membership online and pay at the gym. Pick a plan, choose when you start, and we will confirm on WhatsApp.",
  alternates: { canonical: "/join" },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  // Two funnels share this route. With card checkout on it is the full
  // four-step JoinFunnel; with only tracking on it is the reservation form,
  // which creates the same pending subscription and invoice but hands off to
  // WhatsApp instead of Paymob. Neither and the route does not exist.
  if (!MEMBERSHIP_SALES_ENABLED && !MEMBERSHIP_TRACKING_ENABLED) {
    notFound();
  }

  // ?plan= is resolved here and handed down, rather than read in the form with
  // useSearchParams — that hook suspends the subtree and the boundary never
  // resolves on a hard load in this version of Next. See ReserveForm's comment.
  const [plans, branches, params] = await Promise.all([
    getPlansServer(),
    getBranchesServer(),
    searchParams,
  ]);

  const cardCheckout = MEMBERSHIP_SALES_ENABLED;

  return (
    <>
      <PageHeader
        eyebrow="Join"
        title="Start training"
        body={
          cardCheckout
            ? "Four short steps. Nothing renews automatically, and you can pay at the gym if you would rather."
            : "Tell us who you are and when you want to start. Nothing is charged online — we will confirm on WhatsApp and take payment at the gym."
        }
      />

      <Section>
        {plans.length === 0 || branches.length === 0 ? (
          <EmptyState message="Memberships are being updated. Please try again shortly, or get in touch and we will sign you up over the phone." />
        ) : (
          <div className="fade-in">
            {cardCheckout ? (
              // JoinFunnel reads ?plan with useSearchParams, so it needs this
              // boundary. ReserveForm deliberately does not — see its comment.
              <Suspense fallback={<div className="h-96 animate-pulse bg-muted" />}>
                <JoinFunnel plans={plans} branches={branches} />
              </Suspense>
            ) : (
              <ReserveForm plans={plans} initialPlanSlug={params.plan} />
            )}
          </div>
        )}
      </Section>
    </>
  );
}

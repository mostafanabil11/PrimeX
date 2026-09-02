import type { Metadata } from "next";
import { Suspense } from "react";
import { getPlansServer, getBranchesServer } from "@/lib/api/gym-server";
import { pageTitle, BRAND } from "@/lib/brand";
import { Section, EmptyState } from "@/components/public/section";
import { JoinFunnel } from "@/components/join/join-funnel";
import { ReserveForm } from "@/components/join/reserve-form";
import { MEMBERSHIP_SALES_ENABLED, MEMBERSHIP_TRACKING_ENABLED } from "@/lib/features";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: pageTitle("Join"),
  description:
    "Reserve your membership online. Pick a plan and start date, then the PrimeX team will confirm payment and activation manually on WhatsApp.",
  alternates: { canonical: "/join" },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const locale = await getLocale();
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
      {/* The reservation form supplies its own visible heading. */}
      {(cardCheckout || plans.length === 0 || branches.length === 0) && <h1 className="sr-only">
        {locale === "ar" ? `اشترك في ${BRAND.name}` : `Join ${BRAND.name}`}
        {cardCheckout
          ? locale === "ar" ? " — ثلاث خطوات قصيرة، بدون تجديد تلقائي." : " — three short steps. Nothing renews automatically."
          : locale === "ar" ? " — احجز عبر الموقع وانتظر تأكيد الفريق." : " — reserve online for staff confirmation."}
      </h1>}

      <Section className="pt-6 md:pt-stack-md">
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

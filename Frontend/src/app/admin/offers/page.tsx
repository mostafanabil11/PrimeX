"use client";

import { useQuery } from "@tanstack/react-query";
import { getOffers } from "@/lib/api/offers";
import { formatPrice } from "@/lib/format";
import { formatMembershipDateShort } from "@/lib/gym-format";
import { AdminPageHeader, ResourceList } from "@/components/admin/resource-list";
import { offerStatus, type Offer } from "@/types/offer";

const STATUS_LABELS = {
  live: "Live now",
  scheduled: "Scheduled",
  finished: "Finished",
  paused: "Paused",
} as const;

function describeDiscount(offer: Offer): string {
  return offer.type === "percentage"
    ? `${offer.value}% off`
    : `${formatPrice(offer.value)} off`;
}

// What the offer covers, in the same words the form uses. Empty on an axis
// means no restriction there, which reads as "everything" rather than as a
// missing value.
function describeTargeting(offer: Offer): string {
  const terms =
    offer.durationMonths.length === 0
      ? "all terms"
      : offer.durationMonths
          .slice()
          .sort((a, b) => a - b)
          .map((m) => (m === 1 ? "monthly" : m === 12 ? "annual" : `${m} months`))
          .join(", ");

  const tiers = offer.tiers.length === 0 ? "all tiers" : offer.tiers.join(", ");

  return `${terms} · ${tiers}`;
}

function describeWindow(offer: Offer): string {
  const from = offer.startsAt ? formatMembershipDateShort(offer.startsAt) : null;
  const to = offer.endsAt ? formatMembershipDateShort(offer.endsAt) : null;

  if (from && to) return `${from} – ${to}`;
  if (to) return `Until ${to}`;
  if (from) return `From ${from}`;
  return "No end date";
}

export default function AdminOffersPage() {
  const { data: offers, isLoading } = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: getOffers,
  });

  return (
    <div>
      <AdminPageHeader
        title="Offers"
        newHref="/admin/offers/new"
        newLabel="New offer"
        count={offers?.length}
      />

      <p className="mb-6 max-w-2xl text-[13px] text-muted-foreground">
        Offers discount part of the pricing grid automatically — no code for members to type. Target
        a term, a tier, or both. Where two offers overlap, members get the single better one; they
        are never applied on top of one another.
      </p>

      <ResourceList
        isLoading={isLoading}
        emptyMessage="No offers yet. Create one to run a promotion on part of the pricing grid."
        rows={offers?.map((o) => ({
          id: o._id,
          href: `/admin/offers/${o._id}`,
          title: `${o.name} — ${describeDiscount(o)}`,
          subtitle: `${describeTargeting(o)} · ${describeWindow(o)}`,
          // Drives the row's active styling. Scheduled and finished offers are
          // switched on but not discounting anything today, so they read as
          // inactive here — which is what an admin scanning the list means by
          // the question "what is running right now".
          isActive: offerStatus(o) === "live",
          tags: [STATUS_LABELS[offerStatus(o)]],
        }))}
      />
    </div>
  );
}

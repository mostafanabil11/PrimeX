"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getOffer } from "@/lib/api/offers";
import { OfferForm } from "@/components/admin/offer-form";

export default function EditOfferPage() {
  const params = useParams<{ id: string }>();
  const { data: offer, isLoading } = useQuery({
    queryKey: ["admin", "offers", params.id],
    queryFn: () => getOffer(params.id),
  });

  return (
    <div>
      <Link href="/admin/offers" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to offers
      </Link>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">
        {offer?.name ?? "Edit Offer"}
      </h1>
      {isLoading || !offer ? (
        <div className="h-96 max-w-2xl animate-pulse bg-muted" />
      ) : (
        <OfferForm offer={offer} />
      )}
    </div>
  );
}

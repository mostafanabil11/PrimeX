"use client";

import { Link } from "@/i18n/navigation";
import { OfferForm } from "@/components/admin/offer-form";

export default function NewOfferPage() {
  return (
    <div>
      <Link href="/admin/offers" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to offers
      </Link>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">New Offer</h1>
      <OfferForm />
    </div>
  );
}

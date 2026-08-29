import type { Metadata } from "next";
import { Suspense } from "react";
import { pageTitle } from "@/lib/brand";
import { Section } from "@/components/public/section";
import { JoinResultContent } from "./result-content";
import { requireMembershipSales } from "@/lib/features";

export const metadata: Metadata = {
  title: pageTitle("Membership"),
  robots: { index: false, follow: false },
};

export default function JoinResultPage() {
  requireMembershipSales();

  return (
    <Section>
      <Suspense fallback={<div className="mx-auto h-64 max-w-xl animate-pulse bg-muted" />}>
        <div className="fade-in">
          <JoinResultContent />
        </div>
      </Suspense>
    </Section>
  );
}

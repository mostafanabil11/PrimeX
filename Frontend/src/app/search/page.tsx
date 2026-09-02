import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchContent } from "./search-content";
import { requireShop } from "@/lib/features";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Search"),
  // Query-driven results pages aren't worth indexing individually.
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  requireShop();

  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}

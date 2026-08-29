import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchContent } from "./search-content";
import { requireShop } from "@/lib/features";

export const metadata: Metadata = {
  title: "Search — Valiant",
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

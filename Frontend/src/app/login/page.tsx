import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginContent } from "./login-content";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Sign In"),
  robots: { index: false, follow: true },
};

// Split page/content because LoginContent reads ?next= via useSearchParams,
// which suspends — without a boundary here the whole route fails to prerender.
// Same shape as /search and /checkout/result.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

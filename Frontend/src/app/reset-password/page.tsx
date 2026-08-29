import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordContent } from "./reset-password-content";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Reset Password"),
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";
import { resetPassword } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api-error";
import { AuthPanel } from "@/components/public/auth-panel";

export function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => resetPassword(token!, newPassword),
    onSuccess: () => {
      toast.success("Password reset — please sign in with your new password");
      router.push("/login");
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "That reset link is invalid or has expired"));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="grid min-h-[600px] grid-cols-1 md:grid-cols-2">
      <AuthPanel />

      <div className="flex flex-col items-center justify-center px-margin-mobile py-stack-xl md:px-margin-desktop">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 block text-center font-display text-3xl tracking-[-0.02em] text-foreground uppercase"
          >
            {BRAND.name}
          </Link>

          {!token ? (
            <>
              <h1 className="mb-2 text-center font-heading text-headline-sm font-bold text-foreground">
                Invalid Link
              </h1>
              <p className="mb-8 text-center text-body-md text-muted-foreground">
                This password reset link is missing its token. Request a new one below.
              </p>
              <Link
                href="/forgot-password"
                className="block w-full bg-primary py-4 text-center text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
              >
                Request New Link
              </Link>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-center font-heading text-headline-sm font-bold text-foreground">
                Reset Password
              </h1>
              <p className="mb-8 text-center text-body-md text-muted-foreground">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground"
                  />
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    At least 6 characters, with an uppercase letter, a lowercase letter, and a number.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {mutation.isPending ? "Resetting…" : "Reset Password"}
                </button>
              </form>

              <p className="mt-8 text-center text-[13px] text-muted-foreground">
                <Link href="/login" className="font-semibold text-foreground underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

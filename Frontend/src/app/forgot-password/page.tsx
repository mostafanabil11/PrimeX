"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/lib/api/auth";
import { BRAND } from "@/lib/brand";
import { AuthPanel } from "@/components/public/auth-panel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email),
    // Always shows the same success state, matching the backend's own
    // "if the email exists…" response — confirming or denying an account
    // exists for a given email is an account-enumeration leak either way.
    onSuccess: () => setSubmitted(true),
    onError: () => setSubmitted(true),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

          {submitted ? (
            <>
              <h1 className="mb-2 text-center font-heading text-headline-sm font-bold text-foreground">
                Check Your Email
              </h1>
              <p className="mb-8 text-center text-body-md text-muted-foreground">
                If an account exists for <span className="text-foreground">{email}</span>, we&apos;ve sent a link to
                reset your password. It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="block w-full bg-primary py-4 text-center text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
              >
                Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-center font-heading text-headline-sm font-bold text-foreground">
                Forgot Password?
              </h1>
              <p className="mb-8 text-center text-body-md text-muted-foreground">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {mutation.isPending ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p className="mt-8 text-center text-[13px] text-muted-foreground">
                Remembered it?{" "}
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

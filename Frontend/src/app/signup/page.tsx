"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";
import { registerUser, verifyEmail, resendOtp } from "@/lib/api/auth";
import { GoogleIcon } from "@/components/icons/social-icons";
import { API_BASE_PATH } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api-error";
import { AuthPanel } from "@/components/public/auth-panel";
import { MEMBER_ACCOUNTS_ENABLED } from "@/lib/features";

export default function SignupPage() {
  if (!MEMBER_ACCOUNTS_ENABLED) {
    notFound();
  }

  const router = useRouter();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      setStep("verify");
      toast.success("Check your email for a verification code");
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Registration failed"));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      toast.success("Email verified — you can now sign in");
      router.push("/login");
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Invalid or expired code"));
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendOtp,
    onSuccess: () => toast.success("A new code has been sent"),
    onError: (err) => toast.error(apiErrorMessage(err, "Could not resend code")),
  });

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    registerMutation.mutate({ email, password, firstName, lastName });
  }

  function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    verifyMutation.mutate({ email, otp });
  }

  return (
    <div className="grid min-h-[600px] grid-cols-1 md:grid-cols-2">
      <AuthPanel caption="Start where you are." />

      {/* Form */}
      <div className="flex flex-col items-center justify-center px-margin-mobile py-stack-xl md:px-margin-desktop">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 block text-center font-display text-3xl tracking-[-0.02em] text-foreground uppercase"
          >
            {BRAND.name}
          </Link>

          {step === "register" ? (
            <>
              <h1 className="mb-2 text-center font-heading text-headline-sm font-bold text-foreground">
                Create Account
              </h1>
              <p className="mb-8 text-center text-body-md text-muted-foreground">
                Join {BRAND.name} and start training.
              </p>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground"
                    />
                  </div>
                </div>

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

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {registerMutation.isPending ? "Creating Account…" : "Create Account"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[12px] text-muted-foreground uppercase">Or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <a
                href={`${API_BASE_PATH}/auth/google`}
                className="flex w-full items-center justify-center gap-3 border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <GoogleIcon className="size-4" />
                Continue with Google
              </a>

              <p className="mt-8 text-center text-[13px] text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-foreground underline">
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-center font-heading text-headline-sm font-bold text-foreground">
                Verify Your Email
              </h1>
              <p className="mb-8 text-center text-body-md text-muted-foreground">
                Enter the 6-digit code sent to <span className="text-foreground">{email}</span>.
              </p>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="otp"
                    className="mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                  >
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.3em] text-foreground outline-none focus:border-foreground"
                    placeholder="······"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyMutation.isPending || otp.length !== 6}
                  className="w-full bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {verifyMutation.isPending ? "Verifying…" : "Verify Email"}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-muted-foreground">
                Didn&apos;t get a code?{" "}
                <button
                  type="button"
                  onClick={() => resendMutation.mutate(email)}
                  disabled={resendMutation.isPending}
                  className="font-semibold text-foreground underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

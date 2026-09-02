"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";
import { loginUser } from "@/lib/api/auth";
import { GoogleIcon } from "@/components/icons/social-icons";
import { API_BASE_PATH } from "@/lib/api/client";
import { mergeLocalCartIntoServerCart } from "@/lib/cart-merge";
import { apiErrorMessage } from "@/lib/api-error";
import { AuthPanel } from "@/components/public/auth-panel";
import { MEMBER_ACCOUNTS_ENABLED } from "@/lib/features";
import { Wordmark } from "@/components/layout/wordmark";
import { fieldInput } from "@/components/ui/form-classes";

// Only same-origin paths are honoured. Taking ?next= at face value would let a
// crafted link bounce someone to another site immediately after they sign in,
// with the trust of having just landed there from a real login form.
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export function LoginContent() {
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: async (user) => {
      queryClient.setQueryData(["auth", "profile"], user);
      await mergeLocalCartIntoServerCart();
      queryClient.invalidateQueries({ queryKey: ["cart", "server"] });
      toast.success(`Welcome back, ${user.firstName}`);
      // Back to wherever the customer was — signing in from checkout must
      // return to checkout, not abandon the basket they were about to pay for.
      router.push(safeNextPath(searchParams.get("next")));
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Invalid email or password"));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ email, password });
  }

  return (
    <div className="grid min-h-[600px] grid-cols-1 md:grid-cols-2">
      <AuthPanel caption="Welcome back." />

      {/* Form */}
      <div className="flex flex-col items-center justify-center px-margin-mobile py-stack-xl md:px-margin-desktop">
        <div className="w-full max-w-sm">
          {/* The lockup, not the name set in the headline face.
              Every other surface in this app shows the real mark — the header,
              the footer, the mobile menu — and a typographic stand-in on the
              one screen where somebody is being asked to trust the site with a
              password reads as an oversight, because it is one. This is the
              same substitution that was removed from the mobile menu; it had
              simply survived over here. */}
          <Link
            href="/"
            aria-label={tCommon("homeAriaLabel", { brand: BRAND.name })}
            className="mb-10 flex justify-center"
          >
            <Wordmark className="h-16 w-auto" width={128} />
          </Link>

          <h1 className="mb-2 text-center font-heading text-headline-sm font-bold text-foreground">
            Welcome Back
          </h1>
          <p className="mb-8 text-center text-body-md text-muted-foreground">
            Sign in to access your account.
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
                className={fieldInput}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase"
                >
                  Password
                </label>
                {/* -my-3 cancels the padding for layout, so the link stays on
                    the label's baseline and only its hit box grows. It sat at
                    18px, in the corner of a form, next to a 12px label — the
                    exact spot a thumb overshoots into the password field. */}
                <Link
                  href="/forgot-password"
                  className="-my-3 inline-flex min-h-11 items-center py-3 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldInput}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="ui-action inline-flex w-full bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[12px] text-muted-foreground uppercase">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <a
            href={`${API_BASE_PATH}/auth/google`}
              className="ui-action ui-action--outline flex w-full items-center justify-center gap-3 border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </a>

          {MEMBER_ACCOUNTS_ENABLED && (
            <p className="mt-8 text-center text-[13px] text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-foreground underline">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

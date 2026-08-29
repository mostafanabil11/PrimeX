"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { previewJoin, reserveMembership, type ReserveResult } from "@/lib/api/membership";
import { apiErrorMessage } from "@/lib/api-error";
import { formatPrice } from "@/lib/format";
import { formatDuration } from "@/lib/gym-format";
import { CtaButton } from "@/components/public/section";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { reservationMessage, joinEnquiry } from "@/lib/whatsapp-messages";
import type { Plan } from "@/types/gym";

/**
 * Reserve a membership, pay at the gym.
 *
 * The counterpart to JoinFunnel, which takes a card. This asks the four things
 * staff need to finish the conversation — who you are, how to reach you, which
 * plan, when you start — and creates the same pending subscription and invoice
 * that a card join would, minus the payment.
 *
 * That ordering is the whole design: the record exists before the member ever
 * opens WhatsApp, so the chat that follows is a settlement rather than a
 * data-entry exercise, and nothing is lost if they never send the message.
 *
 * No account, no sign-in, no PAR-Q, no emergency contact. All of that is asked
 * at the desk on the first visit, where someone can explain why.
 */

const inputBase =
  "w-full border border-border bg-surface-1 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";
const labelBase = "font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

// Same reasoning as the join funnel's: generated inside the submit handler,
// not during render, so a retry after a dropped connection reuses the invoice
// instead of raising a second one.
function useIdempotencyKey(): () => string {
  const ref = useRef<string | null>(null);
  return useCallback(() => {
    if (!ref.current) {
      ref.current = `reserve-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return ref.current;
  }, []);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * `initialPlanSlug` comes down as a prop from the page rather than being read
 * here with useSearchParams.
 *
 * That is not a style preference. useSearchParams suspends this subtree, and
 * in this version of Next the boundary never resolves on a hard load — the
 * form renders into the DOM but stays behind `display: none` with the fallback
 * showing forever. Soft navigation hides it, which makes it a nasty one: the
 * page works when you click through from /membership and is blank when you
 * open the link directly. Read the query string on the server instead.
 */
export function ReserveForm({ plans, initialPlanSlug }: { plans: Plan[]; initialPlanSlug?: string }) {
  const getIdempotencyKey = useIdempotencyKey();

  const [planId, setPlanId] = useState(
    () => plans.find((p) => p.slug === initialPlanSlug)?._id ?? plans[0]?._id ?? ""
  );
  const [startsAt, setStartsAt] = useState(todayIso);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "instapay" | "wallet">("instapay");
  const [accepted, setAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<ReserveResult | null>(null);

  const plan = useMemo(() => plans.find((p) => p._id === planId) ?? null, [plans, planId]);

  // Quoted by the server, never computed here. Showing the member a number the
  // browser worked out would be a different number from the one on the invoice
  // the moment an offer changes.
  const { data: quote } = useQuery({
    queryKey: ["join", "preview", planId],
    queryFn: () => previewJoin(planId),
    enabled: Boolean(planId),
  });

  const reserve = useMutation({
    mutationFn: () =>
      reserveMembership({
        planId,
        startsAt,
        firstName,
        lastName,
        phone,
        email: email.trim() || null,
        paymentMethod,
        acceptedAgreement: true,
        website,
        idempotencyKey: getIdempotencyKey(),
      }),
    onSuccess: (data) => {
      setResult(data);
      // Survives a refresh, so the reference is not lost if the member comes
      // back to the tab after switching to WhatsApp.
      if (data.status === "reserved" && data.referenceCode) {
        window.history.replaceState(null, "", `?ref=${data.referenceCode}`);
      }
    },
  });

  if (result?.status === "already_active") {
    return <AlreadyActivePanel activeUntil={result.activeUntil} planName={result.planName} />;
  }

  if (result?.status === "reserved") {
    return <ReservedPanel result={result} />;
  }

  if (plans.length === 0) return null;

  return (
    <form
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        reserve.mutate();
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="plan" className={labelBase}>
          Plan
        </label>
        <select
          id="plan"
          className={inputBase}
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} — {formatDuration(p)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="firstName" className={labelBase}>
            First name
          </label>
          <input
            id="firstName"
            required
            maxLength={60}
            className={inputBase}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="lastName" className={labelBase}>
            Last name
          </label>
          <input
            id="lastName"
            required
            maxLength={60}
            className={inputBase}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className={labelBase}>
          Phone
        </label>
        <input
          id="phone"
          required
          type="tel"
          placeholder="010 0000 0000"
          className={inputBase}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-[12px] text-muted-foreground">
          This is how we will reach you on WhatsApp.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelBase}>
          Email <span className="normal-case opacity-70">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          className={inputBase}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-[12px] text-muted-foreground">
          Only if you want a receipt by email. We will not send you anything else.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="startsAt" className={labelBase}>
          Start date
        </label>
        <input
          id="startsAt"
          required
          type="date"
          min={todayIso()}
          className={inputBase}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelBase}>How you will pay</span>
        <div className="grid grid-cols-2 gap-2">
          {(["instapay", "wallet"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`flex items-center justify-center gap-3 border px-4 py-3 font-mono text-[13px] font-semibold tracking-[0.06em] uppercase transition-colors ${
                paymentMethod === method
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {method === "instapay" && (
                <img src="/brand/instapay.svg" alt="InstaPay" className="h-5 w-auto" />
              )}
              {method === "wallet" && (
                <img src="/brand/vodafone-cash.svg" alt="Vodafone Cash" className="h-5 w-auto" />
              )}
              {method === "instapay" ? "InstaPay" : "Wallet"}
            </button>
          ))}
        </div>
      </div>

      {quote && (
        <div className="flex flex-col gap-2 border border-border bg-surface-1 p-5">
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <span>{plan?.name}</span>
            <span className="tabular-nums">{formatPrice(quote.planPriceMinorUnits)}</span>
          </div>
          {quote.joiningFeeMinorUnits > 0 && (
            <div className="flex items-center justify-between text-[13px] text-muted-foreground">
              <span>Joining fee</span>
              <span className="tabular-nums">{formatPrice(quote.joiningFeeMinorUnits)}</span>
            </div>
          )}
          {quote.taxMinorUnits > 0 && (
            <div className="flex items-center justify-between text-[13px] text-muted-foreground">
              <span>Tax</span>
              <span className="tabular-nums">{formatPrice(quote.taxMinorUnits)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-[15px] font-semibold text-foreground">
            <span>Total to pay</span>
            <span className="tabular-nums">{formatPrice(quote.totalMinorUnits)}</span>
          </div>
        </div>
      )}

      {/* Hidden from people, visible to anything filling every field it finds.
          Not display:none — some bots skip those — but pushed out of the flow
          and out of the tab order. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-3 text-[13px] text-muted-foreground">
        <input
          type="checkbox"
          required
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>
          I accept the membership agreement and the gym rules.
        </span>
      </label>

      {reserve.isError && (
        <p className="border border-destructive px-4 py-3 text-[13px] text-destructive">
          {apiErrorMessage(reserve.error, "Could not reserve that — please try again")}
        </p>
      )}

      <button
        type="submit"
        disabled={reserve.isPending || !accepted}
        className="press bg-primary px-6 py-4 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-all hover:bg-primary-hover disabled:opacity-50"
      >
        {reserve.isPending ? "Reserving…" : "Reserve my membership"}
      </button>
    </form>
  );
}

/**
 * The reservation, done.
 *
 * Deliberately does not bounce straight to WhatsApp. The reference is the one
 * thing the member can quote back if the chat goes sideways, and navigating
 * away the instant it is issued is how they lose it.
 */
function ReservedPanel({ result }: { result: Extract<ReserveResult, { status: "reserved" }> }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 border border-border bg-surface-1 p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary">
        <Check className="size-6 text-primary-foreground" strokeWidth={2.5} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
          Reserved
        </h2>
        <p className="text-body-md text-muted-foreground">
          {result.planName} is held for you. Nothing has been charged — you pay{" "}
          {result.paymentMethod === "cash" ? "at the gym" : result.paymentMethod === "wallet" ? "by Wallet" : "by InstaPay"}.
        </p>
      </div>

      {result.referenceCode && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Your reference
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(result.referenceCode!);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
            className="mx-auto flex items-center gap-3 border border-border bg-background px-6 py-4 font-mono text-3xl font-bold tracking-[0.2em] text-foreground transition-colors hover:border-primary"
          >
            {result.referenceCode}
            {copied ? (
              <Check className="size-4 text-primary" strokeWidth={2} />
            ) : (
              <Copy className="size-4 text-muted-foreground" strokeWidth={1.5} />
            )}
          </button>
          <p className="text-[12px] text-muted-foreground">
            Quote this at the desk, or in the chat.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <p className="mb-2 text-[13px] text-muted-foreground">
          Send us a message and we will confirm everything and take payment.
        </p>
        <WhatsAppCta message={reservationMessage(result)}>Message us on WhatsApp</WhatsAppCta>
        <CtaButton href="/contact" variant="outline">
          Or find us
        </CtaButton>
      </div>
    </div>
  );
}

function AlreadyActivePanel({ activeUntil, planName }: { activeUntil: string; planName: string }) {
  const until = new Date(activeUntil).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 border border-border bg-surface-1 p-8 text-center">
      <h2 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
        You are already a member
      </h2>
      <p className="text-body-md text-muted-foreground">
        Your {planName} membership runs until {until}. Nothing has been changed.
      </p>
      <div className="flex flex-col gap-2">
        <WhatsAppCta message={joinEnquiry()}>Ask us about your membership</WhatsAppCta>
        <CtaButton href="/membership" variant="outline">
          See all plans
        </CtaButton>
      </div>
    </div>
  );
}

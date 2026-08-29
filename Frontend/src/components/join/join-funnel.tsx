"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ArrowLeft, CreditCard } from "lucide-react";
import { previewJoin, startJoin } from "@/lib/api/membership";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiErrorMessage } from "@/lib/api-error";
import { formatPrice } from "@/lib/format";
import { formatDuration } from "@/lib/gym-format";
import type { Branch, Plan } from "@/types/gym";
import type { JoinQuote } from "@/types/membership";
import { formatMembershipDate } from "@/lib/gym-format";
import { collectTerms, planMonths } from "@/components/public/pricing-grid";

const STEPS = ["Plan", "Start", "Account", "Pay"] as const;
type StepIndex = 0 | 1 | 2 | 3;

const inputBase =
  "w-full border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";
const labelBase = "font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

// Generated on the first submit and then reused, so a retry after a dropped
// connection reuses the invoice rather than raising a second one.
//
// Deliberately not created during render: Date.now() and Math.random() are
// impure, and calling them in a render body is exactly the pattern that breaks
// under concurrent rendering. A ref filled inside the submit handler is both
// stable and pure where it matters.
function useIdempotencyKey(): () => string {
  const ref = useRef<string | null>(null);
  return useCallback(() => {
    if (!ref.current) {
      ref.current = `join-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return ref.current;
  }, []);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function JoinFunnel({ plans, branches }: { plans: Plan[]; branches: Branch[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const getIdempotencyKey = useIdempotencyKey();

  const preselected = searchParams.get("plan");
  const [step, setStep] = useState<StepIndex>(0);

  // Which way the funnel last moved, so a step arriving after Back slides in
  // from the side it left towards. Without it every step enters from the right
  // and going back feels like going forward again.
  const [stepDir, setStepDir] = useState<"forward" | "back">("forward");

  const goToStep = (next: StepIndex) => {
    setStepDir(next > step ? "forward" : "back");
    setStep(next);
  };

  const preselectedPlan = plans.find((p) => p.slug === preselected) ?? null;

  const [planId, setPlanId] = useState<string>(() => preselectedPlan?._id ?? "");

  // The term shown on the plan step. Follows a ?plan= link when there is one,
  // so arriving from a specific card on the pricing page lands on that card's
  // term rather than resetting the visitor to monthly.
  const terms = useMemo(() => collectTerms(plans), [plans]);
  const [months, setMonths] = useState<number>(
    () => (preselectedPlan && planMonths(preselectedPlan)) ?? terms[0]?.months ?? 1,
  );

  const plansForTerm = useMemo(
    () => plans.filter((p) => planMonths(p) === months).sort((a, b) => a.sortOrder - b.sortOrder),
    [plans, months],
  );
  // The gym runs from one site, so there is nothing to choose — the only
  // branch is read once and sent with the join. Still a value rather than a
  // constant because the API requires one and the schema still models several.
  const branchId = branches[0]?._id ?? "";
  const [startsAt, setStartsAt] = useState<string>(todayIso);

  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);

  // No payment-method state any more: this funnel is the card funnel and card
  // is the only thing it does.
  //
  // It used to also offer InstaPay and cash, which was wrong in two ways. The
  // small one is that the three options duplicated ReserveForm. The real one
  // is that picking an offline method here posted it to POST /join — the
  // gateway route — which raised an invoice nobody had been asked to collect,
  // on a path whose success handler assumes a Paymob redirect. Offline
  // membership has exactly one home now, /join/reserve, and this component
  // reaches for the gateway or does nothing at all.

  // The quote refetches whenever the plan changes, so the number on the review
  // step is always the number that will be charged. Any live offer is applied
  // server-side inside this quote — the browser never computes a discount.
  const { data: quote, isFetching: quoting } = useQuery({
    queryKey: ["join", "quote", planId],
    queryFn: () => previewJoin(planId),
    enabled: Boolean(planId),
  });

  const submit = useMutation({
    mutationFn: () =>
      startJoin({
        planId,
        branchId,
        startsAt,
        phone,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        ...(emergencyRelationship ? { emergencyContactRelationship: emergencyRelationship } : {}),
        acceptedAgreement: true,
        paymentMethod: "card",
        idempotencyKey: getIdempotencyKey(),
      }),
    onSuccess: (result) => {
      // A full navigation rather than router.push: the iframe URL is on
      // Paymob's origin, and Next's router only moves within this app.
      if (result.iframeUrl) {
        window.location.assign(result.iframeUrl);
        return;
      }
      // No iframe on a card join means the gateway did not hand one back. The
      // invoice exists and is pending, so the member is sent somewhere that
      // says so rather than being left on a spinner — but this is a gateway
      // failure, not an offline reservation, and the result page says as much.
      router.push(`/join/result?status=pending-card&invoice=${result.invoiceNumber}`);
    },
  });

  const selectedPlan = plans.find((p) => p._id === planId);
  const selectedBranch = branches.find((b) => b._id === branchId);

  const canContinue: Record<StepIndex, boolean> = {
    0: Boolean(planId),
    1: Boolean(branchId && startsAt),
    2: Boolean(user && phone && emergencyName && emergencyPhone),
    3: acceptedAgreement,
  };

  return (
    <div className="grid gap-stack-sm lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-8">
        <Stepper current={step} onBack={goToStep} />

        {/* Keyed on the step so React remounts on every move, which replays
            the entrance animation. Cheaper than tracking enter/exit state, and
            the steps already mounted and unmounted anyway — form values live
            on the parent, so nothing is lost in the remount. */}
        <div key={step} data-step-dir={stepDir} className="step-enter">
          {step === 0 && (
          <Fieldset legend="Choose your plan">
            {/* Term first, then tier. Sixteen plans as one flat list is a wall
                of near-identical rows; splitting the two axes means each
                choice is between four things that genuinely differ. */}
            <div className="flex flex-col gap-2">
              <span className={labelBase}>How long for</span>
              <div className="flex flex-wrap gap-px bg-border">
                {terms.map((term) => {
                  const active = term.months === months;
                  return (
                    <button
                      key={term.months}
                      type="button"
                      onClick={() => setMonths(term.months)}
                      className={`flex-1 px-4 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-1 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {term.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <span className={labelBase}>Which tier</span>
              <div className="flex flex-col gap-3">
                {plansForTerm.map((plan) => {
                  const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
                  const list = plan.pricing?.listPriceMinorUnits ?? plan.priceMinorUnits;
                  const offer = plan.pricing?.appliedOffer ?? null;

                  return (
                    <label
                      key={plan._id}
                      className={`flex cursor-pointer items-start gap-4 border p-5 transition-colors ${
                        planId === plan._id
                          ? "border-primary bg-surface-2"
                          : "border-border bg-surface-1 hover:border-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        className="mt-1 size-4 shrink-0 accent-primary"
                        checked={planId === plan._id}
                        onChange={() => setPlanId(plan._id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
                            {plan.tier ?? plan.name}
                          </span>
                          <span className="flex items-baseline gap-2">
                            {price < list && (
                              <span className="text-[13px] text-muted-foreground line-through">
                                {formatPrice(list)}
                              </span>
                            )}
                            <span className="font-display text-xl text-foreground">
                              {formatPrice(price)}
                            </span>
                          </span>
                        </span>
                        <span className="mt-1 block text-[13px] text-muted-foreground">
                          {plan.sessionsIncluded === null
                            ? "Unlimited sessions"
                            : `${plan.sessionsIncluded} sessions`}
                          {" · "}
                          {plan.daysPerWeek === null
                            ? "every day"
                            : `${plan.daysPerWeek} days a week`}
                          {" · "}
                          {plan.accessScope === "gym_plus_fitness"
                            ? "Gym + Fitness"
                            : "Gym or Fitness"}
                        </span>
                        {offer && (
                          <span className="mt-2 inline-block bg-primary px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] text-primary-foreground uppercase">
                            {offer.name}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </Fieldset>
        )}

        {step === 1 && (
          <Fieldset legend="When you start">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-start" className={labelBase}>
                Start date
              </label>
              <input
                id="join-start"
                type="date"
                min={todayIso()}
                className={inputBase}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <p className="text-[12px] text-muted-foreground">
                Start today, or pick a date up to three months ahead.
              </p>
            </div>
          </Fieldset>
        )}

        {step === 2 && (
          <Fieldset legend="Your account">
            {userLoading ? (
              <div className="h-24 animate-pulse bg-muted" />
            ) : user ? (
              <div className="flex items-start gap-3 border border-primary bg-surface-1 p-5">
                <Check className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2} />
                <div>
                  <p className="text-[14px] font-semibold text-foreground">
                    Signed in as {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[13px] text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 border border-border bg-surface-1 p-6">
                <p className="text-[14px] text-muted-foreground">
                  You need an account to hold your membership. It takes a minute, and you will come
                  straight back here.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/signup?next=/join"
                    className="bg-primary px-5 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase"
                  >
                    Create an account
                  </Link>
                  <Link
                    href="/login?next=/join"
                    className="border border-border px-5 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-foreground uppercase"
                  >
                    I already have one
                  </Link>
                </div>
              </div>
            )}

            {/* Contact details, folded into this step rather than a step of
                their own — the dedicated health/emergency-contact page was
                removed by request. Still required by the backend (a real
                phone number and someone to call matter for any gym), just
                asked for alongside the account rather than as its own page. */}
            <div className="flex flex-col gap-5 border-t border-border pt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-phone" className={labelBase}>
                    Your phone <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="join-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+20 100 000 0000"
                    className={inputBase}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-dob" className={labelBase}>
                    Date of birth
                  </label>
                  <input
                    id="join-dob"
                    type="date"
                    className={inputBase}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-ename" className={labelBase}>
                    Emergency contact <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="join-ename"
                    required
                    className={inputBase}
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-ephone" className={labelBase}>
                    Their phone <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="join-ephone"
                    type="tel"
                    required
                    className={inputBase}
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="join-erel" className={labelBase}>
                  Relationship to you
                </label>
                <input
                  id="join-erel"
                  placeholder="Partner, parent, friend…"
                  className={inputBase}
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                />
              </div>
            </div>
          </Fieldset>
        )}

        {step === 3 && (
          <Fieldset legend="Review and pay">
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <span className={labelBase}>How you will pay</span>
              {/* A statement, not a choice. One option is not a radio group —
                  rendering it as one asks people to make a decision that has
                  already been made for them, and a single pre-ticked radio is
                  a well-known way to make a form feel broken. */}
              <div className="flex items-start gap-3 border border-primary bg-surface-2 p-4">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.5} />
                <span>
                  <span className="block text-[14px] font-semibold text-foreground">Card</span>
                  <span className="block text-[12px] text-muted-foreground">
                    Visa, Mastercard or Meeza, secured by Paymob. You will be taken to the
                    payment page when you continue.
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  checked={acceptedAgreement}
                  onChange={(e) => setAcceptedAgreement(e.target.checked)}
                />
                <span className="text-[13px] text-muted-foreground">
                  I have read and accept the{" "}
                  <Link href="/terms" className="text-primary underline" target="_blank">
                    membership agreement
                  </Link>{" "}
                  and the{" "}
                  <Link href="/privacy" className="text-primary underline" target="_blank">
                    privacy policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {submit.isError && (
              <p role="alert" className="text-[13px] text-destructive">
                {apiErrorMessage(submit.error, "We could not start your membership. Please try again.")}
              </p>
            )}
            </Fieldset>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-6">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goToStep((step - 1) as StepIndex)}
              className="flex items-center gap-1.5 px-4 py-3 font-mono text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
            >
              <ArrowLeft className="size-4" strokeWidth={1.5} />
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={!canContinue[step]}
              onClick={() => goToStep((step + 1) as StepIndex)}
              className="press ml-auto bg-primary px-7 py-3.5 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-all hover:bg-primary-hover disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!canContinue[3] || submit.isPending}
              onClick={() => submit.mutate()}
              className="press ml-auto bg-primary px-7 py-3.5 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-all hover:bg-primary-hover disabled:opacity-40"
            >
              {submit.isPending ? "Just a moment…" : "Pay and join"}
            </button>
          )}
        </div>
      </div>

      <OrderSummary
        plan={selectedPlan}
        branchName={selectedBranch?.name}
        startsAt={startsAt}
        quote={quote}
        quoting={quoting}
      />
    </div>
  );
}

function Stepper({ current, onBack }: { current: StepIndex; onBack: (i: StepIndex) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((label, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {/* Completed steps are clickable so people can go back and change
                something without losing what they typed after it. */}
            <button
              type="button"
              disabled={!isDone}
              onClick={() => onBack(i as StepIndex)}
              className={`flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.1em] uppercase ${
                isCurrent
                  ? "text-primary"
                  : isDone
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/50"
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center text-[11px] tabular-nums ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-surface-3 text-foreground"
                      : "border border-border"
                }`}
              >
                {isDone ? <Check className="size-3" strokeWidth={2.5} /> : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
        {legend}
      </h2>
      {children}
    </section>
  );
}

function OrderSummary({
  plan,
  branchName,
  startsAt,
  quote,
  quoting,
}: {
  plan?: Plan;
  branchName?: string;
  startsAt: string;
  quote?: JoinQuote;
  quoting: boolean;
}) {
  return (
    <aside className="flex h-fit flex-col gap-4 border border-border bg-surface-1 p-6 lg:sticky lg:top-24">
      <h2 className="font-display text-lg tracking-[-0.02em] text-foreground uppercase">
        Your membership
      </h2>

      {!plan ? (
        <p className="text-[13px] text-muted-foreground">Choose a plan to see the total.</p>
      ) : (
        <>
          <dl className="flex flex-col gap-2 text-[13px]">
            <Row label="Plan" value={plan.name} />
            <Row label="Term" value={formatDuration(plan)} />
            {branchName && <Row label="Branch" value={branchName} />}
            <Row
              label="Starts"
              value={formatMembershipDate(startsAt)}
            />
          </dl>

          <div className="flex flex-col gap-2 border-t border-border pt-4 text-[13px] tabular-nums">
            {quoting || !quote ? (
              <div className="h-24 animate-pulse bg-muted" />
            ) : (
              <>
                <Row label="Membership" value={formatPrice(quote.planPriceMinorUnits)} />
                {quote.joiningFeeMinorUnits > 0 && (
                  <Row label="Joining fee" value={formatPrice(quote.joiningFeeMinorUnits)} />
                )}
                {quote.discountMinorUnits > 0 && (
                  <Row
                    label={quote.offerName ? `Discount (${quote.offerName})` : "Discount"}
                    value={`− ${formatPrice(quote.discountMinorUnits)}`}
                    accent
                  />
                )}
                {quote.taxMinorUnits > 0 && (
                  <Row label="VAT" value={formatPrice(quote.taxMinorUnits)} />
                )}
                <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Total
                  </span>
                  {/* Keyed on the figure so changing plan replays the fade.
                      A total that swaps in one frame reads as a glitch; a
                      short fade reads as a recalculation. */}
                  <span
                    key={quote.totalMinorUnits}
                    className="fade-in font-display text-2xl text-foreground"
                  >
                    {formatPrice(quote.totalMinorUnits)}
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="text-[12px] text-muted-foreground">
            Nothing renews automatically. We will remind you before it ends.
          </p>
        </>
      )}
    </aside>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${accent ? "text-primary" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}

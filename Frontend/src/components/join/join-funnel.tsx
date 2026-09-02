"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ArrowLeft, CreditCard, Lock, ChevronRight } from "lucide-react";
import { previewJoin, startJoin } from "@/lib/api/membership";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiErrorMessage } from "@/lib/api-error";
import { formatPrice, formatAmount } from "@/lib/format";
import { formatDuration } from "@/lib/gym-format";
import type { Branch, Plan } from "@/types/gym";
import type { JoinQuote } from "@/types/membership";
import { formatMembershipDate } from "@/lib/gym-format";
import { collectTerms, planMonths, savingVsMonthly } from "@/components/public/pricing-grid";

// THREE STEPS, NOT FOUR, and the one that went was a screen for a single date
// field. "When do you start" now sits under the tier it belongs to as three
// buttons — today, the first of next month, or a date you pick — which is the
// whole of what that step ever asked. A step is a page transition, a progress
// bar that moves, and a decision the reader has to hold; none of that was
// worth one input.
//
// Nothing about how a membership is created changed with it. startsAt is the
// same piece of state, sent in the same field, on the same request.
const STEPS = ["Plan & start", "Account", "Pay"] as const;
type StepIndex = 0 | 1 | 2;
const LAST_STEP: StepIndex = 2;

const inputBase =
  "w-full border border-input bg-surface-2 px-3.5 py-3 text-base md:text-[14px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";
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

/** The first of next month, the other date most people actually want. */
function nextMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("en-CA");
}

/** "1 Oct" — the label on the middle start-date button. */
function shortMonthLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
  /** Whether the date input is showing, rather than one of the two presets. */
  const [pickingDate, setPickingDate] = useState(false);

  // What each term saves against paying month to month, so the 2x2 grid can
  // carry it on the button rather than hiding it behind a tab. Same helper the
  // pricing page uses, so the two can never disagree about a percentage.
  const termSavings = useMemo(() => {
    const map = new Map<number, number>();
    for (const term of terms) {
      const saving = Math.max(
        0,
        ...plans
          .filter((p) => planMonths(p) === term.months)
          .map(
            (p) =>
              savingVsMonthly(
                p,
                plans.find(
                  (m) => (m.tier ?? m.name) === (p.tier ?? p.name) && planMonths(m) === 1,
                ) ?? null,
              ) ?? 0,
          ),
      );
      map.set(term.months, saving);
    }
    return map;
  }, [plans, terms]);

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

  // The plan step now also owns the start date, which is why 0 checks both.
  // branchId is not a choice — there is one site — but the API requires it, so
  // it is verified here rather than assumed.
  const canContinue: Record<StepIndex, boolean> = {
    0: Boolean(planId && branchId && startsAt),
    1: Boolean(user && phone && emergencyName && emergencyPhone),
    2: acceptedAgreement,
  };

  return (
    // pb-32 below lg reserves the sticky total bar's height plus the home
    // indicator. Without it the last control on every step sits underneath the
    // bar, which is the exact failure the old floating WhatsApp button caused
    // on the footer.
    <div className="grid gap-stack-sm pb-32 lg:grid-cols-[3fr_2fr] lg:pb-0">
      <div className="flex flex-col gap-6 lg:gap-8">
        <Progress current={step} />

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
            <div className="flex flex-col gap-2.5">
              <span className={labelBase}>How long for</span>
              {/* A 2x2 grid carrying each term's saving, not a row of tabs.
                  Four tabs across 335px gave each one about 80px, which at
                  this tracking is barely "6 MONTHS" and left no room at all
                  for the discount — so the saving lived behind the tab and you
                  had to press each one to find the cheapest. Two columns give
                  every term a second line to say what it saves, which is the
                  only reason anyone picks a longer term. */}
              <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
                {terms.map((term) => {
                  const active = term.months === months;
                  const saving = termSavings.get(term.months) ?? 0;
                  const best = saving > 0 && saving === Math.max(...termSavings.values());
                  return (
                    <button
                      key={term.months}
                      type="button"
                      onClick={() => setMonths(term.months)}
                      aria-pressed={active}
                      className={`ui-control flex min-h-[60px] flex-col justify-center px-3.5 py-3 text-left transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-1 hover:bg-surface-2"
                      }`}
                    >
                      <span
                        className={`font-mono text-[13px] font-bold tracking-[0.06em] uppercase ${
                          active ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {term.label}
                      </span>
                      <span
                        className={`mt-1 font-mono text-[12px] tracking-[0.04em] uppercase ${
                          active
                            ? "font-bold text-primary-foreground"
                            : saving > 0
                              ? "text-primary-soft"
                              : "text-muted-foreground"
                        }`}
                      >
                        {saving > 0 ? `Save ${saving}%` : "Full price"}
                        {best && saving > 0 ? " · best" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <span className={labelBase}>Which tier</span>
              <div className="flex flex-col gap-2.5">
                {plansForTerm.map((plan) => {
                  const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
                  const list = plan.pricing?.listPriceMinorUnits ?? plan.priceMinorUnits;
                  const offer = plan.pricing?.appliedOffer ?? null;
                  const selected = planId === plan._id;
                  // PER MONTH IS THE HEADLINE, the term total the caption.
                  // A twelve-month Elite is 1,898 a month or 22,780 in one go,
                  // and only the first of those is comparable with the Pro
                  // sitting under it. Leading with the total made every long
                  // term look expensive next to a monthly and buried the
                  // saving the term grid above had just advertised.
                  const termMonths = planMonths(plan);
                  const perMonth =
                    termMonths && termMonths > 1 ? Math.round(price / termMonths) : price;

                  return (
                    <label
                      key={plan._id}
                      className={`relative flex cursor-pointer items-start gap-3.5 border p-4 transition-colors ${
                        selected
                          ? "border-2 border-primary bg-surface-2"
                          : "border-border bg-surface-1 hover:border-foreground"
                      }`}
                    >
                      {plan.isFeatured && (
                        <span className="absolute end-0 top-0 bg-primary px-2 py-1 font-mono text-[12px] font-bold tracking-[0.06em] text-primary-foreground uppercase">
                          Popular
                        </span>
                      )}
                      <input
                        type="radio"
                        name="plan"
                        className="mt-1 size-4.5 shrink-0 accent-primary"
                        checked={selected}
                        onChange={() => setPlanId(plan._id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl tracking-[-0.02em] text-foreground uppercase">
                          {plan.tier ?? plan.name}
                        </span>
                        <span className="mt-1.5 block text-[13px] leading-[1.45] text-muted-foreground">
                          <span className="text-foreground">
                            {plan.sessionsIncluded === null
                              ? "Unlimited sessions"
                              : `${plan.sessionsIncluded} sessions`}
                          </span>
                          {" · "}
                          {plan.daysPerWeek === null
                            ? "every day"
                            : `${plan.daysPerWeek} days a week`}
                          {" · "}
                          {plan.accessScope === "gym_plus_fitness"
                            ? "Gym + Fitness"
                            : "Gym or Fitness"}
                        </span>

                        <span className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border pt-3">
                          <span className="font-display text-2xl leading-none text-foreground tabular-nums">
                            {formatAmount(perMonth)}
                          </span>
                          <span className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground uppercase">
                            EGP / month
                          </span>
                          {/* The term total, but only when it differs from
                              the per-month figure. On a one-month plan the two
                              are the same number, and printing "1,800 EGP /
                              month · 1,800 total" reads as a mistake. The
                              struck-through list price still shows on a
                              monthly, because that one does differ. */}
                          <span className="ms-auto text-[13px] text-muted-foreground tabular-nums">
                            {price < list && (
                              <span className="me-2 line-through">{formatAmount(list)}</span>
                            )}
                            {termMonths && termMonths > 1 ? `${formatAmount(price)} total` : null}
                          </span>
                        </span>

                        {offer && (
                          <span className="mt-2 inline-block bg-primary px-2 py-1 font-mono text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase">
                            {offer.name}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* The old step 2, folded in. See the note on STEPS. */}
            <div className="mt-6 flex flex-col gap-2.5 border-t border-border pt-5">
              <span className={labelBase}>When you start</span>
              <div className="flex gap-px border border-border bg-border">
                {[
                  { label: "Today", value: todayIso(), custom: false },
                  { label: shortMonthLabel(nextMonthIso()), value: nextMonthIso(), custom: false },
                  { label: "Pick date", value: "", custom: true },
                ].map((option) => {
                  const active = option.custom
                    ? pickingDate
                    : !pickingDate && startsAt === option.value;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        if (option.custom) {
                          setPickingDate(true);
                          return;
                        }
                        setPickingDate(false);
                        setStartsAt(option.value);
                      }}
                      className={`ui-control flex-1 px-2.5 py-3.5 font-mono text-[12px] font-bold tracking-[0.06em] uppercase transition-colors ${
                        active
                          ? "bg-surface-3 text-foreground"
                          : "bg-surface-1 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Only once "Pick date" is pressed. The input is 48px of chrome
                  that two thirds of people never need, and leaving it on
                  screen next to three buttons that also set a date invites the
                  question of which one wins. */}
              {pickingDate && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-start" className="sr-only">
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
              )}
            </div>
          </Fieldset>
        )}

        {step === 1 && (
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
                    className="ui-action inline-flex bg-primary px-5 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase"
                  >
                    Create an account
                  </Link>
                  <Link
                    href="/login?next=/join"
                    className="ui-action ui-action--outline inline-flex border border-border px-5 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-foreground uppercase"
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

        {step === 2 && (
          <Fieldset legend="Review and pay">
            {/* The summary is an aside at lg and inline here below it. On a
                phone the aside stacks under the form, which put the figure
                being agreed to below the button agreeing to it — so on the one
                step where the breakdown IS the content, it moves to the top of
                the column. */}
            <OrderSummary
              plan={selectedPlan}
              branchName={selectedBranch?.name}
              startsAt={startsAt}
              quote={quote}
              quoting={quoting}
              onEdit={() => goToStep(0)}
              className="flex lg:hidden"
            />

            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <span className={labelBase}>How you will pay</span>
              {/* A statement, not a choice. One option is not a radio group —
                  rendering it as one asks people to make a decision that has
                  already been made for them, and a single pre-ticked radio is
                  a well-known way to make a form feel broken. */}
              <div className="flex items-start gap-3.5 border border-primary bg-surface-2 p-4">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.5} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-foreground">Card</span>
                  <span className="block text-[13px] leading-[1.4] text-muted-foreground">
                    Taken to Paymob when you continue.
                  </span>
                </span>
                {/* The scheme marks, as type rather than logos. Three
                    recognisable words are what make this read as a real
                    gateway instead of a placeholder, and they answer "will my
                    Meeza card work" without anyone having to ask. Set as
                    outlined labels because shipping the actual brand artwork
                    means licensing three logos to say something type already
                    says. */}
                <span aria-hidden className="flex shrink-0 gap-1.5">
                  {["VISA", "MC", "MEEZA"].map((mark) => (
                    <span
                      key={mark}
                      className="flex h-5 items-center border border-concrete px-1.5 font-mono text-[10px] font-bold tracking-[0.04em] text-muted-foreground"
                    >
                      {mark}
                    </span>
                  ))}
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
                  <Link href="/terms" className="text-primary-soft underline" target="_blank">
                    membership agreement
                  </Link>{" "}
                  and the{" "}
                  <Link href="/privacy" className="text-primary-soft underline" target="_blank">
                    privacy policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Three plain promises, on the screen where the decision is
                made rather than in the FAQ. Every one of them is a term of the
                membership the reader is about to agree to, and each is a
                reason somebody hesitates at exactly this point. */}
            <ul className="flex flex-col gap-2.5 border-t border-border pt-5">
              {[
                "Nothing renews automatically — we remind you before it ends",
                "Freeze your membership without losing the time",
                "Cancel in line with the membership agreement",
              ].map((promise) => (
                <li
                  key={promise}
                  className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-muted-foreground"
                >
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-[#25D366]"
                    strokeWidth={2.4}
                  />
                  {promise}
                </li>
              ))}
            </ul>

            {submit.isError && (
              <p role="alert" className="text-[13px] text-destructive">
                {apiErrorMessage(submit.error, "We could not start your membership. Please try again.")}
              </p>
            )}
            </Fieldset>
          )}
        </div>

        {/* The desktop control row. Below lg the sticky bar at the foot of the
            screen carries Continue and the total together — see StickyTotal —
            so this would be a second copy of the same button. */}
        <div className="hidden items-center gap-3 border-t border-border pt-6 lg:flex">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goToStep((step - 1) as StepIndex)}
              className="ui-action ui-action--ghost flex items-center gap-1.5 px-4 py-3 font-mono text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
            >
              <ArrowLeft className="size-4" strokeWidth={1.5} />
              Back
            </button>
          )}

          {step < LAST_STEP ? (
            <button
              type="button"
              disabled={!canContinue[step]}
              onClick={() => goToStep((step + 1) as StepIndex)}
              className="ui-action inline-flex press ml-auto bg-primary px-7 py-3.5 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-all hover:bg-primary-hover disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!canContinue[LAST_STEP] || submit.isPending}
              onClick={() => submit.mutate()}
              className="ui-action inline-flex press ml-auto bg-primary px-7 py-3.5 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-all hover:bg-primary-hover disabled:opacity-40"
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
        onEdit={() => goToStep(0)}
        className="hidden lg:flex"
      />

      <StickyTotal
        step={step}
        total={quote?.totalMinorUnits ?? null}
        hasPlan={Boolean(planId)}
        quoting={quoting}
        canContinue={canContinue[step]}
        submitting={submit.isPending}
        onBack={() => goToStep((step - 1) as StepIndex)}
        onContinue={() =>
          step < LAST_STEP ? goToStep((step + 1) as StepIndex) : submit.mutate()
        }
      />
    </div>
  );
}

/**
 * The bar pinned to the bottom of the screen through the whole funnel.
 *
 * IT EXISTS SO THE NUMBER IS NEVER OFF-SCREEN AT THE MOMENT OF THE TAP. The
 * order summary is an aside, which on a phone stacks below the form — so the
 * total sat underneath the button that agreed to it, and on the review step it
 * was several hundred pixels down. A figure you have to scroll to check is a
 * figure people stop checking.
 *
 * Back lives here too, as a 48px square rather than a labelled button: it is
 * the escape hatch, not an action, and on a bar this size a word for it would
 * come out of the space the total needs.
 *
 * Nothing here decides anything. It calls the same two handlers the desktop
 * row does — the mutation, the idempotency key and the Paymob redirect are all
 * exactly where they were.
 */
function StickyTotal({
  step,
  total,
  hasPlan,
  quoting,
  canContinue,
  submitting,
  onBack,
  onContinue,
}: {
  step: StepIndex;
  total: number | null;
  /** Whether a tier has been chosen at all — before that there is nothing to quote. */
  hasPlan: boolean;
  quoting: boolean;
  canContinue: boolean;
  submitting: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const last = step === LAST_STEP;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-primary bg-surface-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center gap-3 px-4 py-2.5">
        {step > 0 && (
          <button
            type="button"
            onClick={onBack}
            className="ui-action ui-action--icon ui-action--ghost -ms-2 flex size-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-5" strokeWidth={1.8} />
            <span className="sr-only">Back a step</span>
          </button>
        )}

        <div className="min-w-0">
          <p className="font-mono text-[12px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Total today
          </p>
          {/* FOUR STATES, NOT TWO, and the two that were missing both rendered
              as a skeleton that never resolved: nothing chosen yet, so there
              is no quote to wait for; and a quote that came back unusable, so
              there never will be one.

              THE LAST BRANCH KEYS ON `quoting`, NOT ON THE QUERY'S ERROR FLAG,
              and that is deliberate. A request that rejects is only one of the
              ways this ends without a number — the endpoint answering with an
              empty envelope is another, and that one reports as a SUCCESS with
              undefined data, so an isError check sails straight past it into
              the skeleton and stays there. "Not fetching and still no total"
              catches both without having to enumerate them.

              A pulsing placeholder is a promise that a number is coming. It
              has to stop the moment that stops being true, or the bar under a
              live Pay button says "loading" forever. */}
          {!hasPlan ? (
            <p className="mt-0.5 text-[14px] text-muted-foreground">Choose a tier</p>
          ) : quoting ? (
            <span className="mt-1 block h-6 w-28 animate-pulse bg-muted" />
          ) : total === null ? (
            <p className="mt-0.5 text-[14px] text-muted-foreground">Total at checkout</p>
          ) : (
            <p className="mt-0.5 flex items-baseline gap-2">
              {/* Keyed on the figure so changing plan replays the fade — a
                  total that swaps in one frame reads as a glitch. */}
              <span
                key={total}
                className="fade-in font-display text-2xl leading-none text-foreground tabular-nums"
              >
                {formatPrice(total)}
              </span>
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!canContinue || submitting}
          onClick={onContinue}
          className="ui-action press ms-auto flex min-h-13 shrink-0 items-center gap-2 bg-primary px-5 font-mono text-[13px] font-bold tracking-[0.08em] text-primary-foreground uppercase transition-all disabled:opacity-40"
        >
          {last ? (
            <>
              <Lock aria-hidden className="size-4" strokeWidth={2.2} />
              {submitting ? "Just a moment…" : "Pay"}
            </>
          ) : (
            <>
              Continue
              <ChevronRight aria-hidden className="size-4" strokeWidth={2.2} />
            </>
          )}
        </button>
      </div>

      {last && (
        <p className="pb-2 text-center font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
          Secured by Paymob &middot; 3-D Secure
        </p>
      )}
    </div>
  );
}

/**
 * "Step 2 of 3 · Account", and a three-segment rule under it.
 *
 * The four-item stepper this replaces was a flex-wrap list of numbered discs
 * and labels. At 375px it wrapped onto two lines, and it wrapped DIFFERENTLY
 * depending on which step you were on, so the content below it jumped by ~30px
 * as you moved through the form. About 70px of chrome to say something a line
 * of text says in one, and the line cannot reflow.
 *
 * The completed steps are no longer clickable. Back is one press away on the
 * sticky bar, and the summary carries its own Edit link straight to the plan —
 * which are the two jumps anybody actually made.
 */
function Progress({ current }: { current: StepIndex }) {
  return (
    <div>
      <p className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[12px] font-bold tracking-[0.12em] text-foreground uppercase">
          {`Step ${current + 1} of ${STEPS.length} · ${STEPS[current]}`}
        </span>
        <span className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
          {current === LAST_STEP ? "Last one" : "2 min"}
        </span>
      </p>
      <ol className="flex gap-[3px]">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === current ? "step" : undefined}
            className={`h-[3px] flex-1 ${i <= current ? "bg-primary" : "bg-border"}`}
          >
            <span className="sr-only">
              {label}
              {i < current ? " (done)" : i === current ? " (current)" : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The legend is announced but not drawn.
 *
 * Progress already prints "Step 1 of 3 · Plan & start" directly above it, so a
 * 32px display heading reading "Choose your plan" underneath was the same
 * sentence twice — and the three sub-labels inside each step ("How long for",
 * "Which tier", "When you start") are what actually orient somebody filling
 * the form in.
 *
 * It stays in the markup as a real heading because the section needs one: a
 * screen reader user navigating by heading gets the step name, which is
 * exactly the affordance the visible version was providing to everyone else.
 */
function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="sr-only">{legend}</h2>
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
  onEdit,
  className = "",
}: {
  plan?: Plan;
  branchName?: string;
  startsAt: string;
  quote?: JoinQuote;
  quoting: boolean;
  /** Jumps back to the plan step. Rendered as "Edit" beside the heading. */
  onEdit?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={`h-fit flex-col gap-4 border border-border bg-surface-1 p-5 md:p-6 lg:sticky lg:top-24 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg tracking-[-0.02em] text-foreground uppercase">
          Your membership
        </h2>
        {/* An edit affordance rather than making people press Back twice. The
            review step is where somebody notices they picked the wrong tier,
            and the stepper that used to let them jump is gone. */}
        {onEdit && plan && (
          <button
            type="button"
            onClick={onEdit}
            className="ui-action ui-action--ghost inline-flex -my-2 shrink-0 py-2 font-mono text-[12px] font-bold tracking-[0.08em] text-primary-soft uppercase hover:underline"
          >
            Edit
          </button>
        )}
      </div>

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

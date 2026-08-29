"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { TrackedPlanLink } from "@/components/public/tracked-cta";
import type { Plan } from "@/types/gym";

/**
 * Pricing as one collapsible section per term, tiers inside.
 *
 * Sixteen plans need a hierarchy, and this is the one buyers already have in
 * their heads: first decide how long to commit for, then how much gym you
 * want. Showing every tier of every term at once is a page nobody reaches the
 * bottom of on a phone — full-height cards stacked sixteen deep — so only the
 * open term renders its tiers, and those render as compact rows rather than
 * tall cards.
 *
 * The collapsed headers do real work too: each carries its cheapest price and
 * what it saves against paying monthly, so the ladder from monthly to annual
 * is readable without opening anything.
 */
export function PricingGrid({ plans }: { plans: Plan[] }) {
  const terms = useMemo(() => buildTerms(plans), [plans]);

  // The shortest term starts open. It is the lowest commitment and the natural
  // place to start reading; opening the annual first leads with the largest
  // number on the page.
  const [openMonths, setOpenMonths] = useState<number | null>(() => terms[0]?.months ?? null);

  // The term that is currently sliding shut. Its tiers have to stay in the DOM
  // until the transition finishes, or the panel would empty out in one frame
  // and collapse instantly instead of easing.
  const [closingMonths, setClosingMonths] = useState<number | null>(null);

  const toggle = (months: number, open: boolean) => {
    setClosingMonths(open ? months : openMonths);
    setOpenMonths(open ? null : months);
  };

  // Backstop for the unmount below. transitionend is the accurate signal and
  // usually gets there first, but it never fires at all when the visitor has
  // asked for reduced motion — there is no transition to end — which would
  // otherwise leave a closed panel holding its tiers for good.
  useEffect(() => {
    if (closingMonths === null) return;
    const timer = window.setTimeout(() => setClosingMonths(null), 600);
    return () => window.clearTimeout(timer);
  }, [closingMonths]);

  if (terms.length === 0) return null;

  return (
    <div className="flex flex-col gap-px bg-border">
      {terms.map((term) => {
        const open = term.months === openMonths;

        // Only the open panel and the one easing shut hold their tiers. The
        // other terms render an empty panel, which is what keeps this cheap on
        // a phone: animating grid-template-rows relayouts on every frame, and
        // before this the page carried all sixteen tier rows at once so that
        // twelve permanently shut panels could animate — work no one ever saw.
        const mounted = open || term.months === closingMonths;

        return (
          <div key={term.months} className="bg-surface-1">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`term-${term.months}`}
                onClick={() => toggle(term.months, open)}
                className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors md:px-7 ${
                  open ? "bg-surface-2" : "hover:bg-surface-2"
                }`}
              >
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-2xl leading-none tracking-[-0.02em] text-foreground uppercase md:text-3xl">
                    {term.label}
                  </span>
                  <span className="text-[12px] text-muted-foreground tabular-nums">
                    from {formatPrice(term.fromPrice)}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  {term.hasOffer && (
                    <span className="hidden bg-primary px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] text-primary-foreground uppercase sm:inline">
                      Offer on
                    </span>
                  )}
                  {term.saving > 0 && (
                    <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-primary-soft uppercase">
                      Save {term.saving}%
                    </span>
                  )}
                  <ChevronDown
                    className={`size-5 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none ${
                      open ? "rotate-180" : ""
                    }`}
                    strokeWidth={1.5}
                  />
                </span>
              </button>
            </h3>

            {/* Opens by moving a grid row between 0fr and 1fr, which animates
                to the content's real height — transitioning max-height instead
                needs a guessed ceiling, and the guess either clips the tallest
                tier or spends the tail easing through empty space.

                That easing is desktop-only, and the tiers carry the motion on a
                phone. See .term-panel in globals.css for why.

                The panel stays mounted so there is something to transition;
                `inert` is what keeps that honest, taking the collapsed links
                out of the tab order and the accessibility tree rather than
                just hiding them behind overflow. */}
            <div
              id={`term-${term.months}`}
              inert={!open}
              onTransitionEnd={(e) => {
                // Drop the closing panel's tiers once it has finished easing
                // shut. Guarded on the target because this bubbles from every
                // transition inside the panel, and on the month because a
                // quick second click can retarget which panel is closing.
                if (e.target === e.currentTarget && term.months === closingMonths) {
                  setClosingMonths(null);
                }
              }}
              data-open={open ? "" : undefined}
              className="term-panel"
            >
              {/* min-h-0 is what lets the row collapse at all — without it a
                  grid item floors at its min-content height and 0fr does
                  nothing.

                  contain:layout_paint tells the browser this subtree cannot
                  affect anything outside it, so each frame of the height
                  change re-lays-out the panel rather than reconsidering the
                  rest of the page below it. */}
              <div className="min-h-0 overflow-hidden [contain:layout_paint]">
                {mounted && (
                  <div className="grid gap-px border-t border-border bg-border md:grid-cols-2 xl:grid-cols-4">
                    {term.tiers.map(({ plan, monthlyPlan }) => (
                      <TierRow key={plan._id} plan={plan} monthlyPlan={monthlyPlan} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * One tier at one term.
 *
 * Deliberately compact. The old card repeated the tier's selling points as a
 * bulleted list under every term, which is the same four lines four times over
 * and the main reason the page ran so long on a phone. What is left is what
 * actually differs between tiers: the price, the allowance, and the extras —
 * with the prose kept for the tier's own description line.
 */
function TierRow({ plan, monthlyPlan }: { plan: Plan; monthlyPlan: Plan | null }) {
  const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
  const listPrice = plan.pricing?.listPriceMinorUnits ?? plan.priceMinorUnits;
  const offer = plan.pricing?.appliedOffer ?? null;

  const months = planMonths(plan);
  const perMonth = months && months > 1 ? Math.round(price / months) : null;
  const saving = savingVsMonthly(plan, monthlyPlan);

  // Everything countable on one wrapped line rather than one row each. A
  // twelve-month Elite has six of these, which as a bulleted list was taller
  // than the rest of the card put together.
  const extras = [
    ...plan.perks.map((perk) => `${perk.value} ${perk.label}`),
    ...(plan.guestPasses > 0
      ? [`${plan.guestPasses} guest ${plural("invite", plan.guestPasses)}`]
      : []),
    ...(plan.freezeDaysAllowed > 0 ? [freezeLabel(plan.freezeDaysAllowed)] : []),
    ...(plan.joiningFeeMinorUnits === 0 ? ["No joining fee"] : []),
  ];

  return (
    // The whole tier is the hit target, via the stretched link on the CTA
    // below. Kept as a div with one link inside rather than wrapping the lot
    // in an anchor: the CTA has to stay a real link, and an anchor inside an
    // anchor is invalid and behaves differently in every browser. This way
    // there is still exactly one link here, and it is the one that gets
    // focused and announced.
    //
    // `relative` is load-bearing — it is what the stretched pseudo-element
    // resolves against. Without it the overlay would size itself to the page.
    <div
      className={`term-row group/tier relative flex cursor-pointer flex-col gap-3 p-5 md:p-6 ${
        plan.isFeatured ? "bg-surface-2 hover:bg-surface-3" : "bg-surface-1 hover:bg-surface-2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl leading-none tracking-[-0.02em] text-foreground uppercase">
              {plan.tier ?? plan.name}
            </span>
            {plan.isFeatured && (
              <span className="bg-primary px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.1em] text-primary-foreground uppercase">
                Popular
              </span>
            )}
          </span>
          <span className="mt-1 block font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {plan.accessScope === "gym_plus_fitness" ? "Gym + Fitness" : "Gym or Fitness"}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-display text-2xl leading-none text-foreground tabular-nums">
            {formatPrice(price)}
          </span>
          {price < listPrice && (
            <span className="mt-1 block text-[12px] text-muted-foreground line-through tabular-nums">
              {formatPrice(listPrice)}
            </span>
          )}
        </span>
      </div>

      {offer && (
        <span className="w-fit bg-primary px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] text-primary-foreground uppercase">
          {offer.name}
        </span>
      )}

      <p className="text-[13px] font-semibold text-foreground">
        {plan.sessionsIncluded === null
          ? "Unlimited sessions"
          : `${plan.sessionsIncluded} sessions`}
        <span className="font-normal text-muted-foreground">
          {" · "}
          {plan.daysPerWeek === null ? "every day" : `${plan.daysPerWeek} days a week`}
        </span>
      </p>

      {perMonth !== null && (
        <p className="text-[12px] text-muted-foreground">
          {formatPrice(perMonth)} a month
          {saving !== null && saving > 0 && (
            <span className="text-primary"> · Save {saving}%</span>
          )}
        </p>
      )}

      {extras.length > 0 && (
        <p className="text-[12px] leading-relaxed text-muted-foreground">{extras.join(" · ")}</p>
      )}

      {/* tier-cta is what stretches the hit area over the whole card — see
          globals.css. The button stays visible because it is the only thing
          telling anyone the card is clickable at all, and because focus needs
          somewhere to land that a sighted keyboard user can actually see. */}
      {/* Goes to the reservation form rather than straight to WhatsApp: four
          fields there create the membership record before the conversation
          starts, so staff settle it with one click instead of retyping it.
          The click is counted on the way through, which is what makes the
          form's cost measurable — see TrackedPlanLink. */}
      <TrackedPlanLink
        planId={plan._id}
        href={`/join?plan=${plan.slug}`}
        className={`tier-cta mt-auto block px-5 py-3 text-center font-mono text-[12px] font-semibold tracking-[0.1em] uppercase transition-all ${
          plan.isFeatured
            ? "bg-primary text-primary-foreground group-hover/tier:opacity-90"
            : "border border-foreground text-foreground group-hover/tier:border-primary group-hover/tier:bg-primary group-hover/tier:text-primary-foreground"
        }`}
      >
        Choose {plan.tier ?? plan.name}
      </TrackedPlanLink>
    </div>
  );
}

/**
 * Every price in the grid at once — tiers down, terms across.
 *
 * The accordion above answers "what do I get at this commitment" one term at a
 * time, which is the right way to choose but the wrong way to compare. This is
 * the whole grid on one screen for anyone weighing the terms against each
 * other, and it stays compact because it is only numbers.
 */
export function PriceMatrix({ plans }: { plans: Plan[] }) {
  const terms = collectTerms(plans);
  const tiers = [...new Set(plans.map((p) => p.tier ?? p.name))];

  const cell = (tier: string, months: number) =>
    plans.find((p) => (p.tier ?? p.name) === tier && planMonths(p) === months) ?? null;

  if (terms.length === 0 || tiers.length === 0) return null;

  return (
    <div className="-mx-margin-mobile overflow-x-auto px-margin-mobile md:mx-0 md:px-0">
      <table className="w-full min-w-[38rem] border-collapse text-[13px]">
        <caption className="sr-only">Membership price by tier and length</caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="py-3 pr-4 text-left font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
            >
              Tier
            </th>
            {terms.map((term) => (
              <th
                key={term.months}
                scope="col"
                className="px-3 py-3 text-left font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
              >
                {term.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr key={tier} className="border-b border-border last:border-0">
              <th
                scope="row"
                className="py-4 pr-4 text-left align-top font-display text-lg tracking-[-0.02em] text-foreground uppercase"
              >
                {tier}
              </th>
              {terms.map((term) => {
                const plan = cell(tier, term.months);
                if (!plan) {
                  return (
                    <td key={term.months} className="px-3 py-4 align-top text-muted-foreground">
                      <span aria-label="Not available">—</span>
                    </td>
                  );
                }

                const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
                const list = plan.pricing?.listPriceMinorUnits ?? plan.priceMinorUnits;

                return (
                  <td key={term.months} className="px-3 py-4 align-top">
                    <span className="block font-semibold text-foreground tabular-nums">
                      {formatPrice(price)}
                    </span>
                    {price < list && (
                      <span className="block text-[12px] text-muted-foreground line-through tabular-nums">
                        {formatPrice(list)}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {plan.sessionsIncluded === null
                        ? "Unlimited"
                        : `${plan.sessionsIncluded} sessions`}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- shaping ---

interface TierEntry {
  plan: Plan;
  /** The same tier's monthly plan, for the "save X%" comparison. */
  monthlyPlan: Plan | null;
}

export function planMonths(plan: Plan): number | null {
  if (plan.durationUnit === "month") return plan.durationValue;
  if (plan.durationUnit === "year") return plan.durationValue * 12;
  return null;
}

function termLabel(months: number): string {
  if (months === 1) return "1 Month";
  if (months === 12) return "1 Year";
  return `${months} Months`;
}

/** The distinct term lengths on offer, shortest first. */
export function collectTerms(plans: Plan[]) {
  const months = [...new Set(plans.map(planMonths).filter((m): m is number => m !== null))];
  return months.sort((a, b) => a - b).map((m) => ({ months: m, label: termLabel(m) }));
}

/**
 * Each term with its tiers and the summary its collapsed header shows.
 *
 * A tier with no plan at a given term is simply absent rather than rendered
 * empty, which is what should happen if the gym stops selling, say, a
 * one-month Elite.
 */
function buildTerms(plans: Plan[]) {
  return collectTerms(plans).map((term) => {
    const atTerm = plans
      .filter((p) => planMonths(p) === term.months)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const tiers: TierEntry[] = atTerm.map((plan) => ({
      plan,
      monthlyPlan:
        plans.find((p) => (p.tier ?? p.name) === (plan.tier ?? plan.name) && planMonths(p) === 1) ??
        null,
    }));

    const prices = tiers.map(
      ({ plan }) => plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits,
    );

    return {
      ...term,
      tiers,
      fromPrice: prices.length > 0 ? Math.min(...prices) : 0,
      hasOffer: tiers.some(({ plan }) => plan.pricing?.appliedOffer),
      saving: Math.max(0, ...tiers.map((t) => savingVsMonthly(t.plan, t.monthlyPlan) ?? 0)),
    };
  });
}

/**
 * How much cheaper per month this term is than paying month to month.
 *
 * Computed rather than stored, so it can never go stale against a price change
 * or a live offer. Both sides use the effective price so the comparison stays
 * like-for-like — comparing a discounted annual against a full-price monthly
 * would overstate the saving.
 */
function savingVsMonthly(plan: Plan, monthlyPlan: Plan | null): number | null {
  const months = planMonths(plan);
  if (!monthlyPlan || months === null || months <= 1) return null;

  const monthlyRate = monthlyPlan.pricing?.effectivePriceMinorUnits ?? monthlyPlan.priceMinorUnits;
  if (monthlyRate <= 0) return null;

  const thisRate = (plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits) / months;
  return Math.max(0, Math.round((1 - thisRate / monthlyRate) * 100));
}

function plural(word: string, n: number) {
  return n === 1 ? word : `${word}s`;
}

function freezeLabel(days: number) {
  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} ${plural("month", months)} freeze`;
  }
  return `${days} ${plural("day", days)} freeze`;
}

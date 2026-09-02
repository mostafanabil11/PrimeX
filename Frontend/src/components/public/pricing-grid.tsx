"use client";

import { useState, useMemo, useRef, useEffect, useLayoutEffect, useId } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatPrice, formatAmount } from "@/lib/format";
import { TrackedPlanLink } from "@/components/public/tracked-cta";
import type { Plan } from "@/types/gym";

/** useLayoutEffect that does not warn when this client component is rendered on
 *  the server. The measuring below has to happen before paint, so it cannot
 *  simply be useEffect. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const DURATION_MS = 440;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Keep tiers mounted so repeated opens never pay a render/translation cost.
 * Animate only the outer clip height; content keeps its natural layout.
 */
export function Collapse({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const initialized = useRef(false);
  const [initialStyle] = useState<React.CSSProperties>(() => ({
    height: open ? undefined : 0,
  }));

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    let targetHeight = inner.getBoundingClientRect().height;

    const settle = () => {
      el.style.height = open ? "auto" : "0px";
      animation.current?.cancel();
      animation.current = null;
    };
    const move = () => {
      // Read the in-flight visual height before cancelling, so rapid clicks
      // reverse naturally instead of restarting from fully open/closed.
      const from = el.getBoundingClientRect().height;
      targetHeight = inner.getBoundingClientRect().height;
      const to = open ? targetHeight : 0;
      animation.current?.cancel();
      animation.current = null;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          Math.abs(from - to) < 1) {
        settle();
        return;
      }
      el.style.height = `${from}px`;
      const current = el.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: DURATION_MS, easing: EASING, fill: "both" },
      );
      animation.current = current;
      current.onfinish = () => {
        if (animation.current === current) settle();
      };
    };

    if (!initialized.current) {
      initialized.current = true;
      settle();
    } else {
      move();
    }

    // Font loading, Arabic translation and responsive changes may alter the
    // measured target mid-animation. Retarget from the visible height.
    const observer = new ResizeObserver(() => {
      if (open && animation.current &&
          Math.abs(inner.getBoundingClientRect().height - targetHeight) > 1) move();
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => () => animation.current?.cancel(), []);

  return (
    <div
      ref={ref}
      id={id}
      inert={!open}
      aria-hidden={!open}
      data-open={open ? "" : undefined}
      style={initialStyle}
      className="term-panel"
    >
      <div ref={innerRef} className="term-content">{children}</div>
    </div>
  );
}

/**
 * Pricing as one collapsible section per term, tiers inside.
 *
 * Sixteen plans need a hierarchy, and this is the one buyers already have in
 * their heads: first decide how long to commit for, then how much gym you
 * want. Showing every tier of every term at once is a page nobody reaches the
 * bottom of on a phone — full-height cards stacked sixteen deep — so only the
 * open term reveals its tiers, as compact rows rather than tall cards.
 *
 * The collapsed headers do real work too: each carries its cheapest price and
 * what it saves against paying monthly, so the ladder from monthly to annual
 * is readable without opening anything.
 */
export function PricingGrid({ plans }: { plans: Plan[] }) {
  const gridId = useId();
  const terms = useMemo(() => buildTerms(plans), [plans]);

  // The shortest term starts open. It is the lowest commitment and the natural
  // place to start reading; opening the annual first leads with the largest
  // number on the page.
  const [openMonths, setOpenMonths] = useState<number | null>(() => terms[0]?.months ?? null);

  if (terms.length === 0) return null;

  return (
    <div className="pricing-accordion flex flex-col">
      {terms.map((term) => {
        const open = term.months === openMonths;

        return (
          <div key={term.months} className="pricing-term bg-surface-1">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${gridId}-term-${term.months}`}
                onClick={() => setOpenMonths(open ? null : term.months)}
                className={`pricing-term-trigger flex w-full items-center justify-between gap-4 px-5 py-5 text-start transition-colors md:px-7 ${
                  open ? "bg-surface-2" : "hover:bg-surface-2"
                }`}
              >
                {/* Stacked below sm, on one baseline above it.
                    "1 YEAR — from EGP 15,800 — SAVE 27% — chevron" is four
                    things, and at 375px they sat shoulder to shoulder with the
                    display-weight term name almost touching the price. Letting
                    the price drop under the term name costs one line and gives
                    every part of the row room to be read. */}
                <span className="flex min-w-0 flex-col items-start gap-x-3 gap-y-0.5 sm:flex-row sm:flex-wrap sm:items-baseline">
                  <span className="font-display text-2xl leading-none tracking-[-0.02em] text-foreground uppercase md:text-3xl">
                    {term.label}
                  </span>
                  <span className="text-[12px] text-muted-foreground tabular-nums">
                    {`from ${formatPrice(term.fromPrice)}`}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  {term.hasOffer && (
                    // 11px, not 10px. Uppercase mono with 0.1em tracking needs
                    // the extra pixel to stay a word rather than a row of
                    // letters; the tracking is eased off to match.
                    <span className="hidden bg-primary px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] text-primary-foreground uppercase sm:inline">
                      Offer on
                    </span>
                  )}
                  {term.saving > 0 && (
                    <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-primary-soft uppercase">
                      {`Save ${term.saving}%`}
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

            <Collapse id={`${gridId}-term-${term.months}`} open={open}>
              <div className="grid gap-px border-t border-border bg-border md:grid-cols-2 xl:grid-cols-4">
                {term.tiers.map(({ plan, monthlyPlan }) => (
                  <TierRow key={plan._id} plan={plan} monthlyPlan={monthlyPlan} />
                ))}
              </div>
            </Collapse>
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
  // ONE TIER, TWO SHAPES, and which you get depends on the width and on
  // whether this is the tier the gym is pushing.
  //
  // Four full cards per term, each with its own button, is what the redesign
  // takes issue with: on a phone that is roughly 800px of accordion for a
  // single term, and three of those four buttons are asking for a decision the
  // reader has not made yet. The tier they are most likely to want keeps the
  // full treatment — description, price, and a button to press. The other
  // three collapse to a 56px row carrying the only two things that separate
  // them at this stage, the allowance and the per-month price, with the whole
  // row as the target.
  //
  // Nothing is lost: the compact row links to exactly the same place the
  // button did, and above md every tier is a full card again, because there
  // the four sit side by side in a grid and the height was never the problem.
  //
  // Rendered as two elements rather than one restructured by CSS. A card and a
  // row disagree about direction, order and which parts exist at all, and the
  // class soup needed to morph one into the other would be far harder to read
  // than two pieces of plain markup — this costs three small hidden rows in
  // the one term panel that is actually open.
  if (!plan.isFeatured) {
    return (
      <>
        <CompactTierRow plan={plan} monthlyPlan={monthlyPlan} />
        {/* max-md:hidden goes on the card itself rather than on a wrapper.
            These are direct children of the tiers grid, and a wrapper would
            become the grid item — `display: contents` to undo that fights the
            `display: none` doing the hiding, and which of the two wins is a
            question about utility ordering that nobody should have to answer. */}
        <FullTierCard plan={plan} monthlyPlan={monthlyPlan} className="max-md:hidden" />
      </>
    );
  }

  return <FullTierCard plan={plan} monthlyPlan={monthlyPlan} />;
}

/**
 * A non-featured tier on a phone: one 56px row, no button.
 *
 * The per-month figure rather than the term total, because that is the number
 * that makes two tiers comparable — a twelve-month Pro against a twelve-month
 * Core is 1,387 against 1,025, not 16,644 against 12,300. On a one-month term
 * the two are the same number and this changes nothing.
 */
function CompactTierRow({ plan, monthlyPlan }: { plan: Plan; monthlyPlan: Plan | null }) {
  const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
  const months = planMonths(plan);
  const perMonth = months && months > 1 ? Math.round(price / months) : price;
  const saving = savingVsMonthly(plan, monthlyPlan);

  return (
    <TrackedPlanLink
      planId={plan._id}
      href={`/join?plan=${plan.slug}`}
      className="term-row flex min-h-14 items-center justify-between gap-3 bg-surface-1 px-4 py-3.5 transition-colors hover:bg-surface-2 md:hidden"
    >
      <span className="min-w-0">
        <span className="block font-display text-lg leading-none tracking-[-0.02em] text-foreground uppercase">
          {plan.tier ?? plan.name}
        </span>
        <span className="mt-1.5 block text-[13px] text-muted-foreground">
          {plan.sessionsIncluded === null ? "Unlimited" : `${plan.sessionsIncluded} sessions`}
          {" · "}
          {plan.daysPerWeek === null ? "every day" : `${plan.daysPerWeek} days`}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-3">
        <span className="text-right">
          {/* The unit is the caption, so the figure drops its currency — see
              formatAmount. "EGP 1,900" over "EGP / mo" says EGP twice and
              buries the half that matters. */}
          <span className="block font-display text-[19px] leading-none text-foreground tabular-nums">
            {formatAmount(perMonth)}
          </span>
          <span className="mt-0.5 block font-mono text-[12px] text-muted-foreground">
            {months && months > 1 ? "EGP / mo" : "EGP"}
          </span>
          {saving !== null && saving > 0 && (
            <span className="mt-0.5 block font-mono text-[12px] font-semibold tracking-[0.06em] text-primary-soft uppercase">
              {`Save ${saving}%`}
            </span>
          )}
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-input" strokeWidth={2} />
      </span>
    </TrackedPlanLink>
  );
}

/** The tier as a full card: every tier above md, and the featured one always. */
function FullTierCard({
  plan,
  monthlyPlan,
  className = "",
}: {
  plan: Plan;
  monthlyPlan: Plan | null;
  className?: string;
}) {
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
      className={`term-row group/tier relative flex cursor-pointer flex-col gap-3 p-4 md:gap-3 md:p-6 ${
        plan.isFeatured ? "bg-surface-2 hover:bg-surface-3" : "bg-surface-1 hover:bg-surface-2"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl leading-none tracking-[-0.02em] text-foreground uppercase">
              {plan.tier ?? plan.name}
            </span>
            {plan.isFeatured && (
              // 11px, not 9px. This is the flag on the tier the gym most wants
              // sold, and at 9px uppercase with 0.1em tracking it stopped being
              // a word and became a row of loose letters sitting next to a 20px
              // display heading. 11px is the floor for caps labels in this app;
              // the tracking comes down to match, because open tracking is what
              // makes small caps legible at 12px and what pulls them apart
              // below it.
              <span className="bg-primary px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.06em] text-primary-foreground uppercase">
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
        <span className="w-fit bg-primary px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] text-primary-foreground uppercase">
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
          {`${formatPrice(perMonth)} a month`}
          {saving !== null && saving > 0 && (
            // --primary-soft, not --primary: #d12028 measures 3.48:1 and this
            // is 12px text. See the note on HoursTable in cards.tsx.
            <span className="text-primary-soft"> · {`Save ${saving}%`}</span>
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
        className={`ui-action tier-cta mt-auto flex min-h-11 items-center justify-center px-5 py-3.5 text-center font-mono text-[12px] font-semibold tracking-[0.1em] uppercase transition-all ${
          plan.isFeatured
            ? "bg-primary text-primary-foreground group-hover/tier:opacity-90"
            : "border border-foreground text-foreground group-hover/tier:border-primary group-hover/tier:bg-primary group-hover/tier:text-primary-foreground"
        }`}
      >
        {`Choose ${plan.tier ?? plan.name}`}
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
    // Hidden below md, and sticky-headed above it.
    //
    // On a phone this was a 608px table inside a 335px window with nothing
    // saying it scrolled — no fade, no shadow, no scrollbar, just a table that
    // stopped at the screen edge — and once you did swipe, the tier names
    // scrolled away with everything else, leaving a grid of prices with nothing
    // to say which tier each belonged to.
    //
    // It is also a straight duplicate of the accordion above, which already
    // answers the same question in a shape built for one column. So rather than
    // patch a comparison table into working on a 375px screen, it stops being
    // shown there: side-by-side comparison is what a wide screen is genuinely
    // good for, and on a narrow one the accordion is the better answer anyway.
    //
    // From md up it can still scroll on a small laptop, so the row headers are
    // pinned to the left edge on their own opaque ground — the fix for problem
    // two, which applied at every width.
    <div className="hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-[13px]">
          <caption className="sr-only">Membership price by tier and length</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-background py-3 pr-4 text-left font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
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
                {/* sticky + an opaque ground. Without the background the price
                  cells slide underneath and print through the tier name. */}
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-background py-4 pr-4 text-left align-top font-display text-lg tracking-[-0.02em] text-foreground uppercase"
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
export function buildTerms(plans: Plan[]) {
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
export function savingVsMonthly(plan: Plan, monthlyPlan: Plan | null): number | null {
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

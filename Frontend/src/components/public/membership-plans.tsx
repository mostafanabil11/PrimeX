"use client";

import { useId, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Columns3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatAmount, formatPrice } from "@/lib/format";
import type { Plan } from "@/types/gym";
import { buildTerms, Collapse, planMonths, savingVsMonthly } from "./pricing-grid";
import { TrackedPlanLink } from "./tracked-cta";
import styles from "./membership-plans.module.css";

function tierName(plan: Plan, locale: string) {
  const name = plan.tier ?? plan.name;
  if (locale !== "ar") return name;
  const names: Record<string, string> = {
    Starter: "ستارتر", "Go Pro": "جو برو", Master: "ماستر", Elite: "إيليت",
  };
  return names[name] ?? name;
}

/** Detailed membership-page presentation; the homepage retains its compact grid. */
export function MembershipPlans({ plans }: { plans: Plan[] }) {
  const id = useId();
  const t = useTranslations("Membership");
  const terms = useMemo(() => buildTerms(plans), [plans]);
  const [openMonths, setOpenMonths] = useState<number | null>(() => terms[0]?.months ?? null);

  return (
    <div className={`${styles.accordion} pricing-accordion`}>
      {terms.map((term, index) => {
        const open = openMonths === term.months;
        const label = term.months === 12 ? t("year") : t("months", { count: term.months });
        return (
          <div key={term.months} className={styles.term}>
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-${term.months}`}
                onClick={() => setOpenMonths(open ? null : term.months)}
                className={styles.termTrigger}
              >
                <span aria-hidden className={`${styles.termNumber} font-mono`}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.termTitle}>
                  <span className="font-display text-2xl uppercase sm:text-[28px]">{label}</span>
                  <span className="text-[12px] text-muted-foreground">{t("from", { price: formatPrice(term.fromPrice) })}</span>
                </span>
                <span className={styles.termEnd}>
                  {term.saving > 0 && <span className={`${styles.saving} font-mono text-[10px] font-semibold uppercase`}>{t("saveUpTo", { percent: term.saving })}</span>}
                  <span className={styles.chevron}><ChevronDown aria-hidden className="size-4" /></span>
                </span>
              </button>
            </h3>
            <Collapse id={`${id}-${term.months}`} open={open}>
              <div className={styles.cards}>
                {term.tiers.map(({ plan, monthlyPlan }) => <MembershipCard key={plan._id} plan={plan} monthlyPlan={monthlyPlan} />)}
              </div>
            </Collapse>
          </div>
        );
      })}
      <p className={styles.priceNote}>{t("priceNote")}</p>
    </div>
  );
}

function MembershipCard({ plan, monthlyPlan }: { plan: Plan; monthlyPlan: Plan | null }) {
  const locale = useLocale();
  const t = useTranslations("Membership");
  const name = tierName(plan, locale);
  const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
  const listPrice = plan.pricing?.listPriceMinorUnits ?? plan.priceMinorUnits;
  const months = planMonths(plan);
  const saving = savingVsMonthly(plan, monthlyPlan);
  const perMonth = months && months > 1 ? Math.round(price / months) : null;
  const number = (value: number) => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);
  const perks = plan.perks.map((perk) => {
    const known: Record<string, string> = { Jacuzzi: t("jacuzzi"), Sauna: t("sauna"), InBody: t("inbody") };
    return `${number(perk.value)} ${known[perk.label] ?? perk.label}`;
  });
  const extras = [
    ...perks,
    ...(plan.guestPasses > 0 ? [t("guests", { count: plan.guestPasses })] : []),
    ...(plan.freezeDaysAllowed > 0 ? [t("freezeDays", { count: plan.freezeDaysAllowed })] : []),
    ...(plan.joiningFeeMinorUnits === 0 ? [t("noJoiningFee")] : []),
  ];

  return (
    <article className={styles.card} data-featured={plan.isFeatured || undefined}>
      <div className={styles.cardHeading}>
        <h4 className="font-display text-2xl uppercase">{name}</h4>
        {plan.isFeatured && <span className={`${styles.popular} font-mono text-[10px] font-bold uppercase`}>{t("popular")}</span>}
      </div>
      <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {plan.accessScope === "gym_plus_fitness" ? t("gymAndFitness") : t("gymOrFitness")}
      </p>
      <div className={styles.priceBlock}>
        <p className={styles.price} dir="ltr"><span className="font-display">{formatAmount(price)}</span><span className="font-mono text-[11px]">EGP</span></p>
        <div className={styles.priceCaption}>
          <span>{t("fullTerm")}</span>
          {price < listPrice && <del dir="ltr">{formatPrice(listPrice)}</del>}
        </div>
        <p className={styles.monthly}>
          {perMonth !== null ? t("perMonth", { price: formatPrice(perMonth) }) : t("oneMonthTerm")}
          {saving !== null && saving > 0 && <span className={styles.inlineSaving}>{t("save", { percent: saving })}</span>}
        </p>
      </div>
      <ul className={styles.features}>
        <li><Check aria-hidden className="size-4" /><span>{plan.sessionsIncluded === null ? t("unlimitedSessions") : t("sessions", { count: plan.sessionsIncluded })}</span></li>
        <li><Check aria-hidden className="size-4" /><span>{plan.daysPerWeek === null ? t("everyDay") : t("daysPerWeek", { count: plan.daysPerWeek })}</span></li>
      </ul>
      {extras.length > 0 && <p className={styles.extras}>{extras.join(" · ")}</p>}
      <TrackedPlanLink
        planId={plan._id}
        href={`/join?plan=${plan.slug}`}
        className={`ui-action ${styles.choose} flex font-mono text-[12px] font-semibold tracking-[0.08em] uppercase ${plan.isFeatured ? "ui-action--primary" : "ui-action--outline"}`}
      >
        {t("choose", { tier: name })}<ArrowRight aria-hidden className="rtl-flip size-4" />
      </TrackedPlanLink>
    </article>
  );
}

/** Full-term comparison is optional, keyboard accessible and usable on phones. */
export function MembershipComparison({ plans }: { plans: Plan[] }) {
  const id = useId();
  const t = useTranslations("Membership");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const terms = useMemo(() => buildTerms(plans), [plans]);
  const tiers = [...new Set(plans.map((plan) => plan.tier ?? plan.name))];

  return (
    <div className={`${styles.comparison} pricing-accordion`}>
      <button type="button" className={styles.compareTrigger} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <Columns3 aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 text-start">
          <span className="block font-display text-xl uppercase sm:text-2xl">{t("compareTitle")}</span>
          <span className="mt-1 block text-[12px] text-muted-foreground">{t("compareBody")}</span>
        </span>
        <span className={`${styles.chevron} ms-auto`}><ChevronDown aria-hidden className="size-4" /></span>
      </button>
      <Collapse id={id} open={open}>
        <p className={styles.scrollHint}>{t("swipeHint")}</p>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={t("compareTitle")}>
          <table className={styles.table}>
            <caption className="sr-only">{t("compareBody")}</caption>
            <thead><tr><th scope="col">{t("tier")}</th>{terms.map((term) => <th key={term.months} scope="col">{term.months === 12 ? t("year") : t("months", { count: term.months })}</th>)}</tr></thead>
            <tbody>{tiers.map((tier) => {
              const example = plans.find((plan) => (plan.tier ?? plan.name) === tier)!;
              return (
                <tr key={tier}>
                  <th scope="row" className="font-display uppercase">{tierName(example, locale)}</th>
                  {terms.map((term) => {
                    const plan = term.tiers.find((entry) => (entry.plan.tier ?? entry.plan.name) === tier)?.plan;
                    return <td key={term.months}>{plan ? <TrackedPlanLink planId={plan._id} href={`/join?plan=${plan.slug}`} className={styles.tablePrice}>{formatPrice(plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits)}<ArrowRight aria-hidden className="rtl-flip size-3" /></TrackedPlanLink> : <span aria-label={t("unavailable")}>—</span>}</td>;
                  })}
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </Collapse>
    </div>
  );
}

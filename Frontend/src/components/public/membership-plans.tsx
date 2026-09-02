"use client";

import { useId, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Columns3, Dumbbell, CalendarDays, User, Tag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatAmount, formatPrice } from "@/lib/format";
import type { Plan } from "@/types/gym";
import { buildTerms, Collapse } from "./pricing-grid";
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

/** One selected term, with immediate updates and a restrained CSS entrance. */
export function MembershipPlans({ plans }: { plans: Plan[] }) {
  const t = useTranslations("Membership");
  const terms = useMemo(() => buildTerms(plans), [plans]);
  const [activeTermIndex, setActiveTermIndex] = useState(0);
  const cardsId = useId();

  if (terms.length === 0) return null;
  const activeTerm = terms[activeTermIndex] ?? terms[0];
  const selectedLabel = activeTerm.months === 12 ? t("year") : t("months", { count: activeTerm.months });

  return (
    <div className={styles.plansWrapper}>
      <div className={styles.termSelectorContainer}>
        <div className={styles.termToolbar}>
          <span className={`${styles.termLabel} font-mono font-semibold uppercase`}>{t("termLabel")}</span>
          {activeTerm.saving > 0 && (
            <span className={styles.savingsBadge}>
              <Tag aria-hidden className="size-3" />
              {t("saveUpTo", { percent: activeTerm.saving })}
            </span>
          )}
        </div>
        <div className={styles.termSelector} role="group" aria-label={t("termLabel")}>
          {terms.map((term, index) => (
            <button key={term.months} type="button"
              aria-pressed={term.months === activeTerm.months}
              aria-controls={cardsId}
              onClick={() => setActiveTermIndex(index)}
              className={`${styles.termButton} font-mono font-bold uppercase`}>
              {term.months === 12 ? t("year") : t("months", { count: term.months })}
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">{t("selectedTerm", { term: selectedLabel })}</p>
      <div id={cardsId} key={activeTerm.months} className={styles.cardsContainer}>
        {activeTerm.tiers.map(({ plan }) => <MembershipCard key={plan._id} plan={plan} />)}
      </div>
      <p className={styles.priceNote}>{t("priceNote")}</p>
    </div>
  );
}

function MembershipCard({ plan }: { plan: Plan }) {
  const locale = useLocale();
  const t = useTranslations("Membership");
  const name = tierName(plan, locale);
  const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
  const listPrice = plan.pricing?.listPriceMinorUnits ?? plan.priceMinorUnits;
  
  const perks = plan.perks.map((perk) => {
    const known: Record<string, string> = { Jacuzzi: t("jacuzzi"), Sauna: t("sauna"), InBody: t("inbody") };
    return `${known[perk.label] ?? perk.label}`;
  });

  const cardClasses = `${styles.card} ${plan.isFeatured ? styles.cardFeatured : ""}`;

  return (
    <article 
      className={cardClasses} 
    >
      {plan.isFeatured && (
        <div className={styles.popularBadge}>
          {t("popular")}
        </div>
      )}
      
      {/* THE WHOLE CARD IS THE LINK, rather than a button with a stretched
          ::after overlay.

          The overlay version looked right and quietly stopped working. An
          absolutely positioned pseudo-element is placed against its nearest
          positioned ancestor — unless something between it and that ancestor
          has a transform, because any transform other than none makes an
          element a containing block. .chooseBtn transitions transform, and
          once it had been pressed its computed value resolved from none to
          matrix(1, 0, 0, 1, 0, 0): an identity matrix that changes nothing
          visually and moves the containing block onto the button. The overlay
          then covered the button's own 49px instead of the card's 397px, so
          the card kept its hover state while the click landed on a list item
          that is not inside any anchor.

          Wrapping the content is immune to that: there is no overlay to
          reposition, the anchor genuinely occupies the card, and it stays one
          link — so tracking, keyboard focus and screen readers are unchanged.
          The padding moves here too, so the card's edges are inside the link
          rather than a dead border around it. */}
      <TrackedPlanLink
        planId={plan._id}
        href={`/join?plan=${plan.slug}`}
        className={styles.cardLink}
      >
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <h3 className="font-display text-2xl uppercase md:text-3xl">{name}</h3>
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {plan.accessScope === "gym_plus_fitness" ? t("gymAndFitness") : t("gymOrFitness")}
          </p>
        </div>
        <div className={styles.priceBlock}>
          <p className={styles.price} dir="ltr">
            <span className="font-mono text-[12px] opacity-70">EGP</span>
            <span className="font-display text-3xl md:text-4xl">{formatAmount(price)}</span>
          </p>
          <div className={styles.priceCaption}>
            <span>{t("fullTerm")}</span>
            {price < listPrice && <del dir="ltr" className="ml-2 opacity-50">{formatPrice(listPrice)}</del>}
          </div>
        </div>
      </div>

      <hr className={styles.divider} />

      <ul className={styles.benefits}>
        <li className={styles.benefitItem}>
          <div className={styles.benefitIcon}><Dumbbell className="size-5" /></div>
          <div className={styles.benefitText}>
            <span className={styles.benefitTitle}>
              {plan.sessionsIncluded === null ? t("unlimitedSessions") : t("sessions", { count: plan.sessionsIncluded })}
            </span>
            <span className={styles.benefitDesc}>{locale === "ar" ? "الإجمالي" : "Total"}</span>
          </div>
        </li>
        <li className={styles.benefitItem}>
          <div className={styles.benefitIcon}><CalendarDays className="size-5" /></div>
          <div className={styles.benefitText}>
            <span className={styles.benefitTitle}>
              {plan.daysPerWeek === null ? t("everyDay") : t("daysPerWeek", { count: plan.daysPerWeek })}
            </span>
            <span className={styles.benefitDesc}>{locale === "ar" ? "الاستمرارية" : "Consistency"}</span>
          </div>
        </li>
        <li className={styles.benefitItem}>
          <div className={styles.benefitIcon}><User className="size-5" /></div>
          <div className={styles.benefitText}>
            <span className={styles.benefitTitle}>
              {plan.guestPasses === null || plan.guestPasses === 0 ? t("guests", { count: 1 }) /* fallback if 0 to show something, though usually it's >0 in design */ : t("guests", { count: plan.guestPasses })}
            </span>
            <span className={styles.benefitDesc}>{locale === "ar" ? "أحضر صديقاً" : "Bring a friend"}</span>
          </div>
        </li>
      </ul>

      {perks.length > 0 && (
        <div className={styles.extraPerks}>
          <span className={styles.extraPerksTitle}>{locale === "ar" ? "يشمل أيضاً:" : "Also includes:"}</span> {perks.join(" · ")}
        </div>
      )}

      {/* A span, not a second link: the card around it already navigates,
          and nesting an anchor inside an anchor is invalid and unreachable by
          keyboard. It keeps the button styling because it is still what a
          visitor aims at. */}
      <span
        className={`ui-action ${styles.chooseBtn} ${plan.isFeatured ? styles.chooseBtnPrimary : styles.chooseBtnOutline}`}
      >
        {t("choose", { tier: name })}<ArrowRight aria-hidden className="rtl-flip size-4" />
      </span>
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

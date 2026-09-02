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

/** Detailed membership-page presentation; redesigned with a term selector and animated cards. */
export function MembershipPlans({ plans }: { plans: Plan[] }) {
  const t = useTranslations("Membership");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const terms = useMemo(() => buildTerms(plans), [plans]);
  
  const [activeTermIndex, setActiveTermIndex] = useState(0);
  const [animatingState, setAnimatingState] = useState<"idle" | "out-left" | "out-right" | "in-left" | "in-right">("idle");
  const [displayTermIndex, setDisplayTermIndex] = useState(0);

  if (terms.length === 0) return null;

  const activeTerm = terms[activeTermIndex];
  const displayTerm = terms[displayTermIndex] || terms[0];

  const handleTermChange = (newIndex: number) => {
    if (newIndex === activeTermIndex || animatingState !== "idle") return;
    const isMovingLeft = newIndex < activeTermIndex;
    const logicalLeft = isRtl ? !isMovingLeft : isMovingLeft;
    const direction = logicalLeft ? "left" : "right";
    
    setActiveTermIndex(newIndex);
    setAnimatingState(`out-${direction}`);
    
    setTimeout(() => {
      setDisplayTermIndex(newIndex);
      setAnimatingState(`in-${direction}`);
      
      setTimeout(() => {
        setAnimatingState("idle");
      }, 50);
    }, 300);
  };

  return (
    <div className={styles.plansWrapper}>
      <div className={styles.termSelectorContainer}>
        <div className={styles.termSelector}>
          <div 
            className={styles.activePill} 
            style={{ 
              width: `${100 / terms.length}%`, 
              insetInlineStart: `${activeTermIndex * (100 / terms.length)}%` 
            }} 
            aria-hidden="true" 
          />
          {terms.map((term, index) => {
            const isActive = index === activeTermIndex;
            const label = term.months === 12 ? t("year") : t("months", { count: term.months });
            return (
              <button
                key={term.months}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleTermChange(index)}
                className={`${styles.termButton} ${isActive ? styles.termButtonActive : ""}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        
        <div className={`${styles.savingsIndicator} ${activeTerm.saving > 0 ? styles.savingsIndicatorVisible : ""}`}>
          <div className={styles.savingsBadge}>
            <Tag className="size-3" />
            <span className="font-bold">{isRtl ? "أفضل قيمة" : "BEST VALUE"}</span>
            <span className="opacity-80 mx-1">•</span>
            {t("saveUpTo", { percent: activeTerm.saving })}
          </div>
        </div>
      </div>

      <div className={`${styles.cardsContainer} ${styles[`animating-${animatingState}`]}`}>
        {displayTerm.tiers.map(({ plan }, idx) => (
          <MembershipCard 
            key={`${displayTerm.months}-${plan._id}`} 
            plan={plan} 
            animationDelay={idx * 80} 
            isAnimatingIn={animatingState.startsWith("in-") || animatingState === "idle"} 
          />
        ))}
      </div>
      <p className={styles.priceNote}>{t("priceNote")}</p>
    </div>
  );
}

function MembershipCard({ plan, animationDelay, isAnimatingIn }: { plan: Plan; animationDelay: number; isAnimatingIn: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Membership");
  const name = tierName(plan, locale);
  const price = plan.pricing?.effectivePriceMinorUnits ?? plan.priceMinorUnits;
  const listPrice = plan.pricing?.listPriceMinorUnits ?? plan.priceMinorUnits;
  
  const perks = plan.perks.map((perk) => {
    const known: Record<string, string> = { Jacuzzi: t("jacuzzi"), Sauna: t("sauna"), InBody: t("inbody") };
    return `${known[perk.label] ?? perk.label}`;
  });

  const cardClasses = `${styles.card} ${plan.isFeatured ? styles.cardFeatured : ""} ${isAnimatingIn ? styles.cardIn : ""}`;

  return (
    <article 
      className={cardClasses} 
      style={{ "--animation-delay": `${animationDelay}ms` } as React.CSSProperties}
    >
      {plan.isFeatured && (
        <div className={styles.popularBadge}>
          {t("popular")}
        </div>
      )}
      
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <h4 className="font-display text-2xl uppercase md:text-3xl">{name}</h4>
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

      <TrackedPlanLink
        planId={plan._id}
        href={`/join?plan=${plan.slug}`}
        className={`ui-action ${styles.chooseBtn} ${plan.isFeatured ? styles.chooseBtnPrimary : styles.chooseBtnOutline}`}
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

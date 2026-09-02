"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Dumbbell, MapPin, Target, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { trainerBranchNames } from "@/lib/gym-format";
import { BRAND } from "@/lib/brand";
import type { ClassType, Trainer } from "@/types/gym";
import { actionButtonClasses } from "@/components/ui/action-button";
import { Photo } from "./photo";
import { Reveal } from "./reveal";
import { WhatsAppCta } from "./whatsapp";
import styles from "./training-catalog.module.css";

type CatalogProps =
  | { kind: "classes"; items: ClassType[] }
  | { kind: "trainers"; items: Trainer[] };

const filters = ["all", "low", "moderate", "high"] as const;
type IntensityFilter = (typeof filters)[number];

function matchesIntensity(intensity: number, filter: IntensityFilter) {
  return filter === "all" || (filter === "low" && intensity <= 2) ||
    (filter === "moderate" && intensity === 3) || (filter === "high" && intensity >= 4);
}

/** Shared index-page presentation; existing profile and reservation routes stay canonical. */
export function TrainingCatalog(props: CatalogProps) {
  const { kind, items } = props;
  const t = useTranslations("Training");
  const locale = useLocale();
  const [filter, setFilter] = useState<IntensityFilter>("all");
  const isClasses = kind === "classes";
  const photo = props.kind === "classes"
    ? props.items.find((item) => item.image)?.image
    : props.items.find((item) => item.photo)?.photo;
  const classItems = props.kind === "classes"
    ? props.items.filter((item) => matchesIntensity(item.intensity, filter)) : [];
  const count = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(items.length);
  const message = t(`${kind}.message`, { brand: BRAND.name });

  return (
    <div className={styles.page}>
      <header className={`${styles.container} ${styles.hero}`}>
        <div className={styles.heroCopy} data-no-translate>
          <p className={styles.eyebrow}><span />{t(`${kind}.eyebrow`)}</p>
          <h1 className={`${styles.heroTitle} font-display`}>
            {t(`${kind}.title`)}{" "}<span>{t(`${kind}.accent`)}</span>
          </h1>
          <p className={styles.heroDescription}>{t(`${kind}.intro`)}</p>
          <div className={styles.heroActions}>
            <a href="#training-collection" className={actionButtonClasses({ className: styles.button })}>
              {t(`${kind}.browse`)}<ArrowDown aria-hidden className="size-4" />
            </a>
            <WhatsAppCta message={message} variant="outline" className={styles.button}>{t("askTeam")}</WhatsAppCta>
          </div>
          <div className={styles.heroFacts}>
            <span><Check aria-hidden />{t(`${kind}.fact1`)}</span>
            <span><Check aria-hidden />{t(`${kind}.fact2`)}</span>
          </div>
        </div>
        <div className={styles.heroVisual} data-kind={kind}>
          <div className={styles.heroMedia}>
            {photo ? <Photo src={photo} alt="" fill priority quality={90}
              sizes="(min-width: 1440px) 530px, (min-width: 900px) 44vw, 100vw"
              className={styles.heroImage} /> : <Dumbbell aria-hidden className={styles.placeholder} />}
          </div>
          <div className={styles.heroShade} aria-hidden />
          <span className={styles.visualLabel} data-no-translate>{t(`${kind}.visualLabel`)}</span>
          <div className={styles.visualCaption} data-no-translate>
            <span className={`${styles.visualNumber} font-display`}>{isClasses ? count : "1:1"}</span>
            <span>{t(`${kind}.visualCaption`)}</span>
            <span className={styles.visualMark} aria-hidden><span /><span /><span /></span>
          </div>
        </div>
      </header>

      <section id="training-collection" aria-labelledby="training-collection-title" className={`${styles.container} ${styles.collection}`}>
        <Reveal className={styles.sectionHeading}>
          <div data-no-translate>
            <p className={styles.eyebrow}><span />{t(`${kind}.collectionEyebrow`)}</p>
            <h2 id="training-collection-title" className={`${styles.sectionTitle} font-display`}>{t(`${kind}.collectionTitle`)}</h2>
          </div>
          <p data-no-translate>{t(`${kind}.collectionIntro`)}</p>
        </Reveal>

        {isClasses && items.length > 0 && <div className={styles.filterBar} data-no-translate>
          <div className={styles.filters} role="group" aria-label={t("filterLabel")}>
            {filters.map((value) => <button key={value} type="button" aria-pressed={filter === value}
              onClick={() => setFilter(value)} className={`${styles.filter} font-mono text-[13px] font-bold tracking-[0.1em] uppercase`}>{t(`filters.${value}`)}</button>)}
          </div>
          <p className={styles.resultCount} role="status" aria-live="polite" aria-atomic="true">{t("resultCount", { count: classItems.length })}</p>
        </div>}

        {items.length === 0 ? <div className={styles.empty} data-no-translate><Dumbbell aria-hidden /><p>{t(`${kind}.empty`)}</p></div>
          : props.kind === "classes" ? <>
            <div className={styles.grid}>
              {classItems.map((item, index) => <Reveal key={`${filter}-${item._id}`} className={styles.cardReveal} delay={(index % 3) * 65}>
                <ClassCard item={item} />
              </Reveal>)}
            </div>
            {classItems.length === 0 && <div className={styles.empty} data-no-translate>
              <p>{t("noMatches")}</p><button type="button" className={actionButtonClasses({ variant: "outline", className: styles.button })} onClick={() => setFilter("all")}>{t("filters.all")}</button>
            </div>}
          </> : <div className={styles.grid}>
            {props.items.map((item, index) => <Reveal key={item._id} className={styles.cardReveal} delay={(index % 3) * 65}>
              <CoachCard item={item} />
            </Reveal>)}
          </div>}
      </section>

      <section className={`${styles.container} ${styles.process}`} aria-labelledby="training-process-title" data-no-translate>
        <Reveal>
          <div className={styles.processHeading}>
            <p className={styles.eyebrow}><span />{t("processEyebrow")}</p>
            <h2 id="training-process-title" className={`${styles.sectionTitle} font-display`}>{t(`${kind}.processTitle`)}</h2>
          </div>
        </Reveal>
        <div className={styles.steps}>
          {[1, 2, 3].map((step, index) => <Reveal key={step} delay={index * 70} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden>0{step}</span>
            <h3>{t(`${kind}.step${step}Title`)}</h3>
            <p>{t(`${kind}.step${step}Body`)}</p>
          </Reveal>)}
        </div>
      </section>

      <section className={`${styles.container} ${styles.helpSection}`} aria-labelledby="training-help-title" data-no-translate>
        <Reveal className={styles.help}>
          <div><p className={styles.eyebrow}><span />{t("helpEyebrow")}</p>
            <h2 id="training-help-title" className={`${styles.sectionTitle} font-display`}>{t(`${kind}.helpTitle`)}</h2>
            <p className={styles.helpBody}>{t(`${kind}.helpBody`)}</p></div>
          <WhatsAppCta message={message} className={styles.button}>{t("talkToTeam")}</WhatsAppCta>
        </Reveal>
      </section>
    </div>
  );
}

function ClassCard({ item }: { item: ClassType }) {
  const t = useTranslations("Training");
  const intensity = Math.max(1, Math.min(5, Math.round(item.intensity)));
  return (
    <Link href={`/classes/${item.slug}`} className={styles.card} aria-label={t("exploreNamedClass", { name: item.name })}>
      <div className={styles.classMedia}>
        {item.image ? <Photo src={item.image} alt="" fill sizes="(min-width: 1440px) 400px, (min-width: 1100px) 32vw, (min-width: 640px) 48vw, 100vw" className={styles.cardImage} /> : <Dumbbell aria-hidden className={styles.placeholder} />}
        <span className={styles.imageBadge} data-no-translate><Clock3 aria-hidden />{t("duration", { count: item.durationMinutes })}</span>
        <span className={styles.cardArrow} aria-hidden><ArrowUpRight /></span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.intensity} data-no-translate>
          <span className={styles.intensityBars} aria-hidden>{[1, 2, 3, 4, 5].map(level => <i key={level} data-filled={level <= intensity || undefined} />)}</span>
          <span>{t(`intensity.${intensity}`)}</span>
        </div>
        <h3 className={`${styles.cardTitle} font-display`}>{item.name}</h3>
        {item.description && <p className={styles.cardDescription}>{item.description}</p>}
        <div className={styles.cardFooter} data-no-translate>
          <span className={styles.cardMeta}><Users aria-hidden />{t("capacity", { count: item.defaultCapacity })}</span>
          <span className={`${styles.cardAction} font-mono text-[13px] font-bold tracking-[0.1em] uppercase`}>{t("explore")}<ArrowRight aria-hidden /></span>
        </div>
      </div>
    </Link>
  );
}

function CoachCard({ item }: { item: Trainer }) {
  const t = useTranslations("Training");
  const branches = trainerBranchNames(item);
  return (
    <Link href={`/trainers/${item.slug}`} className={`${styles.card} ${styles.coachCard}`} aria-label={t("meetNamedCoach", { name: item.name })}>
      <div className={styles.coachMedia}>
        {item.photo ? <Photo src={item.photo} alt="" fill quality={90} sizes="(min-width: 1440px) 400px, (min-width: 1100px) 32vw, (min-width: 640px) 48vw, 100vw" className={styles.cardImage} /> : <Users aria-hidden className={styles.placeholder} />}
        {item.yearsOfExperience > 0 && <span className={styles.imageBadge} data-no-translate><Target aria-hidden />{t("experience", { count: item.yearsOfExperience })}</span>}
        <span className={styles.cardArrow} aria-hidden><ArrowUpRight /></span>
      </div>
      <div className={styles.cardBody}>
        {item.headline && <p className={styles.coachRole}>{item.headline}</p>}
        <h3 className={`${styles.cardTitle} font-display`}>{item.name}</h3>
        {item.specialties.length > 0 && <p className={styles.specialties}>{item.specialties.join(" · ")}</p>}
        <div className={styles.cardFooter}>
          <span className={styles.cardMeta}>{branches.length > 0 && <><MapPin aria-hidden /><span>{branches.join(" · ")}</span></>}</span>
          <span className={`${styles.cardAction} font-mono text-[13px] font-bold tracking-[0.1em] uppercase`} data-no-translate>{t("meetCoach")}<ArrowRight aria-hidden /></span>
        </div>
      </div>
    </Link>
  );
}

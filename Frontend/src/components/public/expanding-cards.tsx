"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Photo } from "./photo";
import styles from "./expanding-cards.module.css";

export type ExpandingCardItem = {
  id: string;
  title: string;
  image: string | null;
  href: string;
  subtitle?: string | null;
  description?: string | null;
  meta: string[];
};

/** Click/tap-to-expand accordion, with compact image strips on smaller screens. */
export function ExpandingCards({
  items,
  kind,
  locale,
}: {
  items: ExpandingCardItem[];
  kind: "class" | "trainer";
  locale: string;
}) {
  const [active, setActive] = useState(0);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const arabic = locale === "ar";
  const label = arabic
    ? kind === "class" ? "الحصص" : "التدريب الشخصي"
    : kind === "class" ? "Classes" : "Personal training";
  const action = arabic
    ? kind === "class" ? "تفاصيل الحصة" : "تعرّف على المدرب"
    : kind === "class" ? "Explore class" : "Meet the coach";

  function select(index: number) {
    setActive(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next += arabic ? -1 : 1;
    else if (event.key === "ArrowLeft") next += arabic ? 1 : -1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    next = Math.max(0, Math.min(items.length - 1, next));
    buttonsRef.current[next]?.focus({ preventScroll: true });
    select(next);
  }

  if (!items.length) return null;

  return (
    <div className={styles.gallery} role="region" aria-label={label} dir={arabic ? "rtl" : "ltr"}>
      <div className={styles.track} style={{ "--card-count": items.length } as CSSProperties}>
        {items.map((item, index) => {
          const selected = index === active;
          return (
            <article
              key={item.id}
              className={styles.card}
              data-active={selected}
              data-kind={kind}
            >
              <div className={styles.visual}>
                {item.image && (
                  <div className={styles.media}>
                    <Photo
                      src={item.image}
                      alt=""
                      fill
                      quality={90}
                      sizes="(min-width: 1024px) 55vw, (min-width: 600px) 70vw, 80vw"
                      className={styles.image}
                    />
                  </div>
                )}
                <div className={styles.shade} aria-hidden="true" />
                <div className={styles.topline} aria-hidden="true">
                  <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.toggleIcon}>{selected ? <Check /> : <Plus />}</span>
                </div>
                <button
                  type="button"
                  ref={(node) => { buttonsRef.current[index] = node; }}
                  className={styles.select}
                  aria-labelledby={`${id}-title-${index}`}
                  aria-expanded={selected}
                  aria-controls={`${id}-details-${index}`}
                  onClick={() => select(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                />
                <span className={`${styles.compactTitle} font-display`} aria-hidden="true">
                  {item.title}
                </span>
                <div className={styles.content}>
                  <h3 id={`${id}-title-${index}`} className={`${styles.title} font-display`}>
                    {item.title}
                  </h3>
                  <div
                    id={`${id}-details-${index}`}
                    className={styles.details}
                    aria-hidden={!selected}
                    inert={!selected}
                  >
                    <div className={styles.detailsInner}>
                      {item.subtitle && <p className={styles.subtitle}>{item.subtitle}</p>}
                      {item.description && <p className={styles.description}>{item.description}</p>}
                      {item.meta.length > 0 && (
                        <ul className={styles.meta}>
                          {item.meta.map((text) => <li key={text}>{text}</li>)}
                        </ul>
                      )}
                      <Link href={item.href} className={styles.link} tabIndex={selected ? 0 : -1}>
                        <span>{action}</span>
                        <ArrowRight aria-hidden="true" className={styles.arrow} size={17} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {items.length > 1 && (
        <div className={styles.controls}>
          <p className={styles.hint}>
            <span className={styles.desktopHint}>{arabic ? "اختر بطاقة لاستكشافها" : "Click a card to explore"}</span>
            <span className={styles.mobileHint}>{arabic ? "اضغط على بطاقة لاستكشافها" : "Tap a card to explore"}</span>
          </p>
          <div className={styles.arrows}>
            <button type="button" className={styles.nav} disabled={active === 0} onClick={() => select(active - 1)} aria-label={arabic ? "البطاقة السابقة" : `Previous ${kind}`}>
              <ArrowLeft className={styles.arrow} aria-hidden="true" size={18} />
            </button>
            <button type="button" className={styles.nav} disabled={active === items.length - 1} onClick={() => select(active + 1)} aria-label={arabic ? "البطاقة التالية" : `Next ${kind}`}>
              <ArrowRight className={styles.arrow} aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

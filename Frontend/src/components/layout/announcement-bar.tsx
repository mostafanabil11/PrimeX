"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Pause, Play } from "lucide-react";
import styles from "./announcement-bar.module.css";

export function AnnouncementBar({ items }: { items: string[] }) {
  const [paused, setPaused] = useState(false);
  const isArabic = useLocale() === "ar";
  // Refine only the original stock copy; preserve custom CMS announcements.
  // Opening hours already have a dedicated place in the header.
  const announcements = items
    .filter((item) => !["Open 24/7", "مفتوح ٢٤ ساعة"].includes(item.trim()))
    .map((item) => ["Zero Excuses, Maximum Output", "بلا أعذار، أقصى أداء"].includes(item.trim())
      ? (isArabic ? "تدرّب بهدف" : "Train with purpose")
      : item);

  if (!announcements.length) return null;

  const half = (duplicate = false) => (
    <div className={styles.sequence} aria-hidden={duplicate || undefined}>
      {announcements.map((item, index) => (
        <span key={index} className={`${styles.item} font-mono font-semibold uppercase`}>
          <span>{item}</span>
          <span aria-hidden className={styles.slash} />
        </span>
      ))}
    </div>
  );

  return (
    <div className={styles.bar} data-paused={paused}>
      <div className={styles.window}>
        {/* Equal viewport-wide halves keep the loop seamless at any width. */}
        <div className={styles.track}>{half()}{half(true)}</div>
      </div>
      <button type="button" className={styles.control}
        onClick={() => setPaused((value) => !value)} aria-pressed={paused}
        aria-label={isArabic
          ? (paused ? "استئناف شريط الإعلانات" : "إيقاف شريط الإعلانات مؤقتاً")
          : (paused ? "Resume the announcements" : "Pause the announcements")}>
        {paused ? <Play aria-hidden size={14} fill="currentColor" /> : <Pause aria-hidden size={14} />}
      </button>
    </div>
  );
}

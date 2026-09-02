"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { localizePath, type AppLocale } from "@/i18n/config";
import styles from "./language-switcher.module.css";

export function LanguageSwitcher({ compact = false, segmented = false, className = "" }: { compact?: boolean; segmented?: boolean; className?: string }) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const pathname = usePathname();
  const nextLocale = locale === "ar" ? "en" : "ar";
  const label = t("language");

  function switchLanguage(targetLocale: AppLocale = nextLocale) {
    if (targetLocale === locale) return;
    // eslint-disable-next-line react-hooks/immutability -- Persist the choice only from a user-triggered click handler, never during render.
    document.cookie = `PRIMEX_LOCALE=${targetLocale}; path=/; max-age=31536000; samesite=lax`;
    // A full document load, not router.push: ArabicUiTranslator rewrites text
    // nodes and attributes in the DOM directly, and React never undoes those
    // writes on a client navigation — it sees its own value as unchanged and
    // skips the node, leaving Arabic text stranded on the English page. Only a
    // fresh document guarantees the whole page comes back in the new locale.
    const { search, hash } = window.location;
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a soft router.push is exactly what does not work here.
    window.location.assign(`${localizePath(pathname, targetLocale)}${search}${hash}`);
  }

  if (segmented) {
    return (
      <div role="group" aria-label={locale === "ar" ? "لغة الموقع" : "Website language"}
        dir="ltr" data-no-translate className={`${styles.segmented} ${className}`}>
        {(["en", "ar"] as const).map((language) => (
          <button key={language} type="button" lang={language}
            aria-label={language === "en" ? "English" : "العربية"}
            aria-pressed={locale === language}
            className={styles.segment} onClick={() => switchLanguage(language)}>
            {language === "en" ? "EN" : "عربي"}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => switchLanguage()}
      className={`ui-action ui-action--ghost ui-action--utility inline-flex min-h-11 items-center justify-center gap-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase transition-colors hover:text-primary-soft ${className}`}
      aria-label={t("switchLanguage")}
    >
      <Languages aria-hidden className="size-4" strokeWidth={1.7} />
      {!compact && <span lang={nextLocale} dir={nextLocale === "ar" ? "rtl" : "ltr"}>{label}</span>}
    </button>
  );
}

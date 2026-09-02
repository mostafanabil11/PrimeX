"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { localizePath } from "@/i18n/config";

export function LanguageSwitcher({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const nextLocale = locale === "ar" ? "en" : "ar";
  const label = nextLocale === "ar" ? "العربية" : "English";

  function switchLanguage() {
    document.cookie = `PRIMEX_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    // A full document load, not router.push: ArabicUiTranslator rewrites text
    // nodes and attributes in the DOM directly, and React never undoes those
    // writes on a client navigation — it sees its own value as unchanged and
    // skips the node, leaving Arabic text stranded on the English page. Only a
    // fresh document guarantees the whole page comes back in the new locale.
    const { search, hash } = window.location;
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a soft router.push is exactly what does not work here.
    window.location.assign(`${localizePath(pathname, nextLocale)}${search}${hash}`);
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className={`ui-action ui-action--ghost ui-action--utility inline-flex min-h-11 items-center justify-center gap-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase transition-colors hover:text-primary-soft ${className}`}
      aria-label={nextLocale === "ar" ? "التبديل إلى العربية" : "Switch to English"}
    >
      <Languages aria-hidden className="size-4" strokeWidth={1.7} />
      {!compact && <span>{label}</span>}
    </button>
  );
}

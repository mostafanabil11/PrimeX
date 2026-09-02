"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Lock } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { MEMBERSHIP_SALES_ENABLED } from "@/lib/features";
import { useTranslations } from "next-intl";
import { localizePath } from "@/i18n/config";
import { useLocale } from "next-intl";

/**
 * The header the join funnel wears in place of the site's own.
 *
 * Three things, in the order they matter: a way back, what this is, and whether
 * this visit is a secure card checkout or a reservation awaiting staff
 * confirmation. Everything else the site header carries — seven nav links,
 * search, the account chip, a Join button on the page that IS joining — is
 * either irrelevant here or an invitation to abandon the process.
 *
 * 56px rather than the site header's 60: there is no logo in it, so the row is
 * sized by the 48px touch target plus its padding.
 *
 * router.back() rather than a Link to a fixed route, because there is no one
 * right destination — people arrive here from the homepage hero, from a plan
 * card on /membership, and from the pricing accordion, and sending all three
 * to the same page is worse than sending each back where it came from.
 * Falls back to /membership when the funnel is the first page of the session
 * (a shared link, a new tab), where history has nothing to go back to.
 */
export function CheckoutHeader() {
  const router = useRouter();
  const locale = useLocale() === "ar" ? "ar" : "en";
  const t = useTranslations("Common");

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center gap-2 border-b border-border bg-surface-1 ps-1 pe-2">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push(localizePath("/membership", locale));
        }}
        className="ui-action ui-action--icon ui-action--ghost flex size-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="rtl-flip size-5" strokeWidth={1.8} />
        <span className="sr-only">{t("goBack")}</span>
      </button>

      <span className="font-display text-[17px] tracking-[-0.01em] text-foreground uppercase">
        {t("joinNow")} · {BRAND.name}
      </span>

      <span className="ms-auto flex items-center gap-2 pe-2">
        {MEMBERSHIP_SALES_ENABLED ? (
          <Lock aria-hidden className="size-3.5 text-[#25D366]" strokeWidth={2} />
        ) : (
          <Clock3 aria-hidden className="size-3.5 text-[#25D366]" strokeWidth={2} />
        )}
        <span className="font-mono text-[12px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {MEMBERSHIP_SALES_ENABLED ? "Secure" : t("staffConfirmation")}
        </span>
      </span>
    </header>
  );
}

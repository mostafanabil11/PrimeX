"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Copy } from "lucide-react";
import { previewJoin, reserveMembership, type ReserveResult } from "@/lib/api/membership";
import { apiErrorMessage } from "@/lib/api-error";
import { formatPrice } from "@/lib/format";
import { formatDuration, whatsappHref } from "@/lib/gym-format";
import { CtaButton } from "@/components/public/section";
import { WhatsAppCta, WhatsAppIcon } from "@/components/public/whatsapp";
import { reservationMessage, joinEnquiry } from "@/lib/whatsapp-messages";
import type { Plan } from "@/types/gym";
import { BRAND } from "@/lib/brand";
import { useLocale, useTranslations } from "next-intl";
import styles from "./reserve-form.module.css";
import layout from "@/components/forms/reservation-form.module.css";
import { fieldInput, fieldLabel, consentBox } from "@/components/ui/form-classes";

/**
 * Reserve a membership for manual payment confirmation and activation.
 *
 * The counterpart to JoinFunnel, which takes a card. This asks the four things
 * staff need to finish the conversation — who you are, how to reach you, which
 * plan, when you start — and creates the same pending subscription and invoice
 * that a card join would, minus the payment.
 *
 * That ordering is the whole design: the record exists before the member ever
 * opens WhatsApp, so the chat that follows is a settlement rather than a
 * data-entry exercise, and nothing is lost if they never send the message.
 *
 * No account, no sign-in, no PAR-Q, no emergency contact. All of that is asked
 * at the desk on the first visit, where someone can explain why.
 */

// The control styling these two carried is now shared — see ui/form-styles.css
// and ui/form-classes.ts. They stay as local aliases because this file names
// them at ~20 call sites and renaming those adds churn without adding meaning.
const inputBase = fieldInput;
const labelBase = fieldLabel;

// Same reasoning as the join funnel's: generated inside the submit handler,
// not during render, so a retry after a dropped connection reuses the invoice
// instead of raising a second one.
function useIdempotencyKey(): () => string {
  const ref = useRef<string | null>(null);
  return useCallback(() => {
    if (!ref.current) {
      ref.current = `reserve-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return ref.current;
  }, []);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * "Saturday, 29 August 2026" — the date the picker holds, spelled out.
 *
 * Day-first with the month as a word, so it cannot be read the wrong way round
 * whatever order the browser's own date widget happens to show above it.
 * en-GB rather than en-EG because the Arabic-script variants of en-EG are not
 * consistently available across browsers and this string only needs to be
 * unambiguous, not localised — the site is English.
 *
 * The ISO string is parsed as local noon rather than as-is: `new Date("2026-08-29")`
 * is parsed as UTC midnight, which in any timezone west of Greenwich prints the
 * day before. Egypt is ahead of UTC so it would be fine here today, but a helper that
 * silently prints the wrong day for half the planet is a trap for the next
 * person, not a working function.
 */
function formatStartDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d, 12).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function arabicPlanName(name: string): string {
  return name
    .replace(/^Starter\b/, "ستارتر")
    .replace(/^Go Pro\b/, "جو برو")
    .replace(/^Master\b/, "ماستر")
    .replace(/^Elite\b/, "إيليت")
    .replace(/Monthly$/, "شهري")
    .replace(/3 Months$/, "٣ أشهر")
    .replace(/6 Months$/, "٦ أشهر")
    .replace(/Annual$/, "سنوي");
}

function localizedDuration(plan: Plan, locale: string): string {
  if (locale !== "ar") return formatDuration(plan);
  const value = String(plan.durationValue).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
  const unit = plan.durationUnit === "day" ? "يوم" : plan.durationUnit === "week" ? "أسبوع" : plan.durationUnit === "year" ? "سنة" : plan.durationValue === 1 ? "شهر" : "أشهر";
  return `${value} ${unit}`;
}

/**
 * `initialPlanSlug` comes down as a prop from the page rather than being read
 * here with useSearchParams.
 *
 * That is not a style preference. useSearchParams suspends this subtree, and
 * in this version of Next the boundary never resolves on a hard load — the
 * form renders into the DOM but stays behind `display: none` with the fallback
 * showing forever. Soft navigation hides it, which makes it a nasty one: the
 * page works when you click through from /membership and is blank when you
 * open the link directly. Read the query string on the server instead.
 */
export function ReserveForm({ plans, initialPlanSlug }: { plans: Plan[]; initialPlanSlug?: string }) {
  const getIdempotencyKey = useIdempotencyKey();
  const locale = useLocale();
  const t = useTranslations("Join");

  const [planId, setPlanId] = useState(
    () => plans.find((p) => p.slug === initialPlanSlug)?._id ?? plans[0]?._id ?? ""
  );
  const [startsAt, setStartsAt] = useState(todayIso);
  const [changingPlan, setChangingPlan] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "instapay" | "wallet">("instapay");
  const [accepted, setAccepted] = useState(false);
  // Shown only after a submit attempt, never on first paint: a form that opens
  // already telling you what you have done wrong is nagging, not helping.
  const [showAcceptHint, setShowAcceptHint] = useState(false);
  const acceptRef = useRef<HTMLInputElement>(null);
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<ReserveResult | null>(null);

  const plan = useMemo(() => plans.find((p) => p._id === planId) ?? null, [plans, planId]);

  // Quoted by the server, never computed here. Showing the member a number the
  // browser worked out would be a different number from the one on the invoice
  // the moment an offer changes.
  const { data: quote, isError: quoteError, refetch: refreshQuote } = useQuery({
    queryKey: ["join", "preview", planId],
    queryFn: () => previewJoin(planId),
    enabled: Boolean(planId),
  });

  // Holds the tab opened during the submit click so onSuccess can point it at
  // WhatsApp once the reference code exists. See the note in onSuccess.
  const waTab = useRef<Window | null>(null);

  const reserve = useMutation({
    mutationFn: () =>
      reserveMembership({
        planId,
        startsAt,
        firstName,
        lastName,
        phone,
        email: email.trim() || null,
        paymentMethod,
        acceptedAgreement: true,
        website,
        idempotencyKey: getIdempotencyKey(),
      }),
    onSuccess: (data) => {
      setResult(data);
      // Survives a refresh, so the reference is not lost if the member comes
      // back to the tab after switching to WhatsApp.
      if (data.status === "reserved" && data.referenceCode) {
        window.history.replaceState(null, "", `?ref=${data.referenceCode}`);
      }

      // Hand off to WhatsApp automatically. Reserving and messaging are one
      // intention here — the reservation is not finished until staff confirm
      // it in chat — so making the member find and press a second button was
      // an invented step, and any of them who did not press it became a
      // pending invoice nobody was chasing.
      //
      // The tab was opened during the click (see onSubmit). It cannot be
      // opened here: this runs after the network round-trip, outside the user
      // gesture, and every browser treats that as a popup and blocks it.
      const pending = waTab.current;
      waTab.current = null;

      if (data.status !== "reserved") {
        pending?.close();
        return;
      }

      const href = whatsappHref(BRAND.whatsapp, reservationMessage(data, locale));
      if (pending && !pending.closed) {
        pending.location.href = href;
      } else {
        // Blocked, or the browser never gave us the handle. The panel behind
        // this still carries the same link as its primary button, so the
        // member is not stranded — they just press it themselves.
        window.open(href, "_blank", "noopener,noreferrer");
      }
  },
    onError: () => {
      // Nothing was reserved, so a blank tab would just be litter.
      waTab.current?.close();
      waTab.current = null;
    },
  });

  if (result?.status === "already_active") {
    return <AlreadyActivePanel activeUntil={result.activeUntil} planName={result.planName} />;
  }

  if (result?.status === "reserved") {
    return <ReservedPanel result={result} />;
  }

  if (plans.length === 0) return null;

  return (
    <form
      className={layout.form}
      onSubmit={(e) => {
        e.preventDefault();

        // Validate the consent box here rather than disabling the button.
        // Scrolling to it and focusing it is the half that matters: on a phone
        // the checkbox is often off-screen by the time the submit button is in
        // reach, so a message alone would be a complaint about something the
        // visitor cannot see.
        if (!accepted) {
          setShowAcceptHint(true);
          acceptRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
          acceptRef.current?.focus();
          return;
        }
        setShowAcceptHint(false);

        // Opened here, synchronously inside the click, purely so the browser
        // counts it as user-initiated. It is a blank tab for the moment; the
        // mutation points it at WhatsApp when the reference code comes back.
        // Doing this after the await instead is what gets it popup-blocked.
        waTab.current = window.open("", "_blank");
        reserve.mutate();
      }}
    >
      <div className={layout.intro}>
        <h1 className="font-display text-[32px] leading-tight text-foreground uppercase sm:text-[40px]">
          {t("reservationHeading")}
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-base">
          {t("reservationIntro")}
        </p>
      </div>

      <aside className={layout.summary} aria-labelledby="selected-plan-title">
        <div className="flex items-center justify-between gap-3">
          <p id="selected-plan-title" className={labelBase}>{t("selectedPlan")}</p>
          <button
            type="button"
            aria-expanded={changingPlan}
            aria-controls="reservation-plan-picker"
            onClick={() => setChangingPlan((value) => !value)}
            className={`ui-action ui-action--ghost ${styles.changePlan} font-mono text-[11px] font-bold uppercase`}
          >
            {t("changePlan")}
            <ChevronDown aria-hidden className={`size-3.5 transition-transform motion-reduce:transition-none ${changingPlan ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className={layout.summaryHead}>
          <div className="min-w-0">
            <h2 className="font-display text-[24px] leading-tight text-foreground uppercase sm:text-[28px]">
              {plan ? (locale === "ar" ? arabicPlanName(plan.name) : plan.name) : null}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{plan ? localizedDuration(plan, locale) : null}</p>
          </div>
          <div className="min-w-0" aria-live="polite" aria-atomic="true">
            <p className={`${labelBase} sr-only mb-1 sm:not-sr-only`}>{t("membershipPrice")}</p>
            <p className="font-display text-[26px] leading-tight text-foreground tabular-nums sm:text-[32px]">
              {quote ? formatPrice(quote.totalMinorUnits) : "—"}
            </p>
          </div>
        </div>

        <div id="reservation-plan-picker" hidden={!changingPlan}>
          <div className="flex flex-col gap-2">
            <label htmlFor="plan" className={labelBase}>{t("plan")}</label>
            <select id="plan" className={inputBase} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {locale === "ar" ? arabicPlanName(p.name) : p.name} — {localizedDuration(p, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {quote && (quote.joiningFeeMinorUnits > 0 || quote.taxMinorUnits > 0) && (
          <dl className={styles.breakdown}>
            <div><dt>{t("plan")}</dt><dd>{formatPrice(quote.planPriceMinorUnits)}</dd></div>
            {quote.joiningFeeMinorUnits > 0 && (
              <div><dt>{t("joiningFee")}</dt><dd>{formatPrice(quote.joiningFeeMinorUnits)}</dd></div>
            )}
            {quote.taxMinorUnits > 0 && (
              <div><dt>{t("tax")}</dt><dd>{formatPrice(quote.taxMinorUnits)}</dd></div>
            )}
          </dl>
        )}
        {quoteError ? (
          <div className="text-[13px] text-muted-foreground" role="status">
            <p>{t("priceError")}</p>
            <button type="button" onClick={() => void refreshQuote()} className="ui-action ui-action--outline mt-2 font-mono text-[11px] font-bold uppercase">
              {t("retryPrice")}
            </button>
          </div>
        ) : !quote && <p role="status" className="text-[12px] text-muted-foreground">{t("loadingTotal")}</p>}
        <p className={layout.summaryNote}>
          <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-[#25d366]" />
          {t("confirmationNote")}
        </p>
      </aside>

      <div className={layout.details}>
      <h2 className="font-display text-2xl text-foreground uppercase">{t("yourDetails")}</h2>
      <div className={layout.nameFields}>
        <div className="flex flex-col gap-2">
          <label htmlFor="firstName" className={labelBase}>
            {t("firstName")}
          </label>
          <input
            id="firstName"
            required
            maxLength={60}
            className={inputBase}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="lastName" className={labelBase}>
            {t("lastName")}
          </label>
          <input
            id="lastName"
            required
            maxLength={60}
            className={inputBase}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className={labelBase}>
          {t("phone")}
        </label>
        <input
          id="phone"
          required
          type="tel"
          placeholder="010 0000 0000"
          className={inputBase}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
          aria-describedby="reservation-phone-hint"
        />
        <p id="reservation-phone-hint" className="text-[12px] text-muted-foreground">
          {t("phoneHint")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelBase}>
          {t("email")} <span className="normal-case opacity-70">({t("optional")})</span>
        </label>
        <input
          id="email"
          type="email"
          className={inputBase}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          aria-describedby="reservation-email-hint"
        />
        <p id="reservation-email-hint" className="text-[12px] text-muted-foreground">
          {t("emailReceiptNote")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="startsAt" className={labelBase}>
          {t("startDate")}
        </label>
        {/* lang="en-GB" on the field, and the date spelled out underneath.
            A <input type="date"> takes its display order from the browser's
            locale, not from the page, so this was rendering 08/29/2026 —
            month-first, for a gym in Egypt, where nobody writes dates that
            way. Chrome honours a `lang` on the input itself and switches to
            29/08/2026; Firefox and Safari follow the OS instead and cannot be
            told. So the widget is nudged where it can be, and the choice is
            then restated in words below, where there is nothing left to
            misread. The value on the wire is ISO either way. */}
        <input
          id="startsAt"
          required
          type="date"
          lang={locale === "ar" ? "ar-EG" : "en-GB"}
          min={todayIso()}
          className={inputBase}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          aria-describedby={startsAt ? "reservation-start-hint" : undefined}
        />
        {startsAt && (
          <p id="reservation-start-hint" className="text-[12px] text-muted-foreground">
            {t("starting", { date: formatStartDate(startsAt, locale) })}
          </p>
        )}
      </div>

      <fieldset className={styles.payment} aria-describedby="reservation-payment-hint">
        <legend className={labelBase}>{t("paymentMethod")}</legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["instapay", "wallet"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              aria-pressed={paymentMethod === method}
              className="ui-control ui-choice font-mono text-[12px] font-semibold tracking-[0.06em] uppercase"
            >
              <span className="flex w-full items-center justify-between gap-2" aria-hidden="true">
              {method === "instapay" && (
                <Image
                  src="/brand/instapay.svg"
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="h-5 w-auto"
                />
              )}
              {method === "wallet" && (
                <Image
                  src="/brand/vodafone-cash.svg"
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="h-5 w-auto"
                />
              )}
                <span className="ui-choice-mark">{paymentMethod === method && <Check className="size-3" strokeWidth={2.5} />}</span>
              </span>
              <span>{method === "instapay" ? "InstaPay" : t("wallet")}</span>
            </button>
          ))}
        </div>
        <p id="reservation-payment-hint" className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{t("paymentPreferenceNote")}</p>
      </fieldset>

      {/* Hidden from people, visible to anything filling every field it finds.
          Not display:none — some bots skip those — but pushed out of the flow
          and out of the tab order. */}
      <div aria-hidden className="sr-only">
        <label htmlFor="website">Leave this empty</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* size-5 and a padded label. The whole sentence was already the hit
          area — it is inside the <label> — but the box itself was 16px, and
          the box is what people aim at. This is the last gate in the only
          conversion funnel on the site, so it is not the place to make
          somebody try twice. */}
      <label className="flex cursor-pointer items-start gap-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          ref={acceptRef}
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          aria-describedby={showAcceptHint ? "accept-hint" : undefined}
          className={consentBox}
        />
        <span>{t("agreement")}</span>
      </label>

      {/* The button is disabled until this box is ticked.
          An earlier revision left it enabled and validated on press, because a
          disabled control that cannot say why it will not work reads as broken
          rather than waiting — .ui-action:disabled is opacity .45 AND
          pointer-events:none, so a tap gets no response at all. That objection
          is answered rather than reintroduced: whenever the box is unticked the
          reason sits beside the button in both layouts — under it on desktop,
          and in the pinned bar on a phone, where it replaces the "no online
          payment" line so the copy lands in a slot that already exists and the
          bar does not change height. Both buttons point at that text with
          aria-describedby, so it is announced and not merely seen.

          The onSubmit consent guard below stays: a disabled button cannot be
          clicked, but Enter in a text field still submits the form, and that
          path should still scroll the checkbox into view rather than fail
          silently. This also matches JoinFunnel, which already gates its own
          continue button on the same agreement. */}
      {showAcceptHint && (
        <p id="accept-hint" role="alert" className="text-[13px] text-destructive">
          {t("agreementError")}
        </p>
      )}

      {reserve.isError && (
        <p className="border border-destructive px-4 py-3 text-[13px] text-destructive">
          {apiErrorMessage(reserve.error, t("reservationError"))}
        </p>
      )}

      <button
        type="submit"
        disabled={reserve.isPending || !accepted}
        aria-busy={reserve.isPending || undefined}
        aria-describedby={!accepted ? "accept-required" : undefined}
        className="ui-action hidden min-h-13 w-full bg-primary font-mono text-[13px] font-bold tracking-[0.08em] uppercase lg:flex"
      >
        <WhatsAppIcon className="size-5" />
        {reserve.isPending ? t("reserving") : t("reserveWhatsapp")}
      </button>

      {!accepted && (
        <p id="accept-required" className="hidden text-[12px] text-muted-foreground lg:block">
          {t("agreementRequired")}
        </p>
      )}
      </div>

      {/* ---- The same button, pinned, on a phone -------------------------
          THE TOTAL AND THE COMMITMENT HAVE TO BE ON SCREEN TOGETHER. The
          breakdown panel sits above the payment method, the consent box and
          two error slots, so by the time the submit button was in reach the
          figure it commits to was several hundred pixels up the page. That is
          the one thing the redesign is most insistent about, and it applies to
          this form exactly as it does to the card funnel.

          A second <button type="submit"> inside the same <form>, not a
          duplicate handler — it runs the identical onSubmit, which means the
          consent check, the synchronous window.open that keeps the WhatsApp
          tab out of the popup blocker, and the mutation are all untouched and
          have only one implementation. The in-flow button above simply stops
          being drawn below lg. */}
      <div className={layout.mobileBar}>
        <div className={layout.mobileBarInner}>
          <div className={layout.barMeta} aria-live="polite" aria-atomic="true">
            <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {t("membershipPrice")}
            </p>
            {quote ? (
              <p
                key={quote.totalMinorUnits}
                className="fade-in mt-0.5 font-display text-2xl leading-none text-foreground tabular-nums"
              >
                {formatPrice(quote.totalMinorUnits)}
              </p>
            ) : (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{quoteError ? "—" : t("loadingTotal")}</p>
            )}
            </div>
            <p id="accept-required-mobile" className={layout.barNote}>
              {accepted ? t("noOnlinePayment") : t("agreementRequired")}
            </p>
          </div>

          <button
            type="submit"
            disabled={reserve.isPending || !accepted}
            aria-busy={reserve.isPending || undefined}
            aria-describedby={!accepted ? "accept-required-mobile" : undefined}
            className={`ui-action ${layout.mobileSubmit} bg-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase`}
          >
            <WhatsAppIcon className="size-5" />
            {reserve.isPending ? t("reserving") : t("reserveWhatsapp")}
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * The reservation, done.
 *
 * WhatsApp opens automatically in a second tab the moment this renders — see
 * the handoff in onSuccess. This panel is what stays behind in the original
 * tab, and it exists for two reasons.
 *
 * The first is the reference code. It is the one thing the member can quote
 * back if the chat goes sideways, so it must survive the handoff: navigating
 * this tab away to WhatsApp instead of opening a new one would take it with
 * them. The URL also carries ?ref=, so a refresh does not lose it either.
 *
 * The second is that the handoff can fail — a blocked popup, a browser with no
 * WhatsApp, a member who closes the tab by reflex. So the same link is the
 * primary button here too. Nothing about the reservation depends on the
 * message being sent; staff match on the phone number regardless.
 */
function ReservedPanel({ result }: { result: Extract<ReserveResult, { status: "reserved" }> }) {
  const [copied, setCopied] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Join");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 border border-border bg-surface-1 p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary">
        <Check className="size-6 text-primary-foreground" strokeWidth={2.5} />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
          {t("reserved")}
        </h1>
        <p className="text-body-md text-muted-foreground">
          {t("reservedBody", { plan: result.planName })}
        </p>
      </div>

      {result.referenceCode && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {t("yourReference")}
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(result.referenceCode!);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
            className="ui-action ui-action--code mx-auto flex items-center gap-3 border border-border bg-background px-6 py-4 font-mono text-3xl font-bold tracking-[0.2em] text-foreground transition-colors hover:border-primary"
          >
            {result.referenceCode}
            {copied ? (
              <Check className="size-4 text-primary" strokeWidth={2} />
            ) : (
              <Copy className="size-4 text-muted-foreground" strokeWidth={1.5} />
            )}
          </button>
          <p className="text-[12px] text-muted-foreground">
            {t("referenceHint")}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-6">
        {/* Worded for the common case — WhatsApp has already opened in another
            tab — while still making sense if the popup was blocked and this
            button is the member's first sight of it. */}
        <p className="mb-2 text-[13px] text-muted-foreground">
          {t("whatsappReady")}
        </p>
        <WhatsAppCta message={reservationMessage(result, locale)}>{t("openWhatsapp")}</WhatsAppCta>
        <CtaButton href="/contact" variant="outline">
          {t("findUs")}
        </CtaButton>
      </div>
    </div>
  );
}

function AlreadyActivePanel({ activeUntil, planName }: { activeUntil: string; planName: string }) {
  const locale = useLocale();
  const t = useTranslations("Join");
  const until = new Date(activeUntil).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 border border-border bg-surface-1 p-8 text-center">
      <h1 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
        {t("alreadyMember")}
      </h1>
      <p className="text-body-md text-muted-foreground">
        {t("alreadyMemberBody", { plan: planName, date: until })}
      </p>
      <div className="flex flex-col gap-2">
        <WhatsAppCta message={joinEnquiry(locale)}>{t("askMembership")}</WhatsAppCta>
        <CtaButton href="/membership" variant="outline">
          {t("seePlans")}
        </CtaButton>
      </div>
    </div>
  );
}

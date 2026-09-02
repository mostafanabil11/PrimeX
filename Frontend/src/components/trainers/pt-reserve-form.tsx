"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import {
  reservePersonalTraining,
  type PtReservation,
} from "@/lib/api/personal-training";
import { apiErrorMessage } from "@/lib/api-error";
import { whatsappHref } from "@/lib/gym-format";
import { ptReservationMessage } from "@/lib/whatsapp-messages";
import { WhatsAppCta, WhatsAppIcon } from "@/components/public/whatsapp";
import { CtaButton } from "@/components/public/section";
import { Photo } from "@/components/public/photo";
import { BRAND } from "@/lib/brand";
import layout from "@/components/forms/reservation-form.module.css";
import {
  fieldInput,
  fieldTextarea,
  fieldLabel,
  fieldOptional,
  fieldHint,
  fieldError,
  fieldGroup,
  consentRow,
  consentBox,
} from "@/components/ui/form-classes";

/**
 * Reserve one-to-one sessions with a named coach.
 *
 * The sibling of the membership reserve form, and now literally so: the two
 * share their layout module and their control styling, so somebody who has
 * reserved a membership on this site meets the same form here rather than a
 * similar one. Where membership summarises a plan and a price, this summarises
 * the coach — that is the only structural difference between them, and it is
 * why the shared classes are named .summary and .barMeta rather than .plan and
 * .price.
 *
 * ONE DIFFERENCE FROM MEMBERSHIP: no pinned action bar. That bar works on
 * /join because the route is checkout chrome — header, footer and the floating
 * WhatsApp button are all removed, so it owns the bottom of the screen. This
 * form sits at the foot of an ordinary trainer page where that floating button
 * is already fixed at bottom:0 on the same z-index, and it has no running
 * total to keep on screen either: the commitment here is the coach, whose name
 * is in the heading directly above. So the button stays in the flow.
 *
 * WHAT IT DOES NOT ASK. No session count and no price. The gym has not decided
 * how PT is sold yet, so a "how many sessions?" field would be asking a
 * question the site cannot price and the visitor cannot answer — the number
 * gets agreed in the chat that opens the moment this submits. The two optional
 * fields that ARE here exist for the coach rather than for us: when somebody
 * can train, and what they want out of it.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * "Saturday, 5 September 2026" — the date the picker holds, spelled out.
 *
 * Same helper and same reasoning as the membership reserve form: a
 * `<input type="date">` takes its display order from the browser's locale, and
 * Firefox and Safari cannot be told, so the choice is restated in words where
 * there is nothing left to misread. Parsed as local noon rather than as-is,
 * because `new Date("2026-09-05")` is UTC midnight and prints the day before in
 * any timezone west of Greenwich.
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

export function PtReserveForm({
  trainerId,
  trainerFirstName,
  trainerName,
  trainerPhoto = null,
  trainerHeadline = null,
  trainerYears = 0,
}: {
  trainerId: string;
  /** First name only. Every string this form shows is conversational — "Train
   *  with Marcus", not "Train with Marcus Vance" — and the confirmation panel
   *  takes the full name from the server response instead, so it prints the
   *  name as it was actually recorded. */
  trainerFirstName: string;
  /** Full name, for the summary panel. There the coach is the thing being
   *  committed to, and a surname is part of knowing who that is. */
  trainerName: string;
  trainerPhoto?: string | null;
  trainerHeadline?: string | null;
  trainerYears?: number;
}) {
  const t = useTranslations("PersonalTraining");
  const locale = useLocale();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredStartsAt, setPreferredStartsAt] = useState(todayIso);
  const [preferredTimes, setPreferredTimes] = useState("");
  const [goal, setGoal] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showAcceptHint, setShowAcceptHint] = useState(false);
  const acceptRef = useRef<HTMLInputElement>(null);
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<PtReservation | null>(null);

  // Holds the tab opened during the submit click so onSuccess can point it at
  // WhatsApp once the reference code exists. It cannot be opened in onSuccess:
  // that runs after the network round-trip, outside the user gesture, and every
  // browser treats that as a popup and blocks it.
  const waTab = useRef<Window | null>(null);

  const reserve = useMutation({
    mutationFn: () =>
      reservePersonalTraining({
        trainerId,
        firstName,
        lastName,
        phone,
        email: email.trim() || null,
        preferredStartsAt,
        preferredTimes: preferredTimes.trim() || null,
        goal: goal.trim() || null,
        acceptedAgreement: true,
        website,
      }),
    onSuccess: (data) => {
      setResult(data);
      if (data.referenceCode) {
        // Survives a refresh, so the reference is not lost if they come back to
        // the tab after switching to WhatsApp.
        window.history.replaceState(null, "", `?ref=${data.referenceCode}`);
      }

      // Hand off to WhatsApp automatically, exactly as the membership
      // reservation does. Requesting and messaging are one intention here —
      // nothing is arranged until staff reply — so making somebody find and
      // press a second button would be an invented step, and anyone who did
      // not press it would become a record nobody was chasing.
      const pending = waTab.current;
      waTab.current = null;

      const href = whatsappHref(BRAND.whatsapp, ptReservationMessage(data));
      if (pending && !pending.closed) {
        pending.location.href = href;
      } else {
        // Blocked, or the browser never handed us the window. The panel that
        // replaces this form carries the same link on its primary button, so
        // nobody is stranded — they just press it themselves.
        window.open(href, "_blank", "noopener,noreferrer");
      }
    },
    onError: () => {
      // Nothing was reserved, so a blank tab would just be litter.
      waTab.current?.close();
      waTab.current = null;
    },
  });

  if (result) {
    return <PtReservedPanel result={result} trainerFirstName={trainerFirstName} />;
  }

  const submitLabel = reserve.isPending
    ? t("submitting")
    : t("submit", { name: trainerFirstName });

  return (
    <form
      className={`${layout.form} ${layout.noPinnedBar}`}
      onSubmit={(e) => {
        e.preventDefault();

        // The buttons are disabled until the box is ticked, so this is not the
        // path a click takes — but Enter in a text field still submits, and
        // that should scroll the checkbox into view rather than fail silently.
        // Same guard, and the same reasoning, as the membership form.
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
        waTab.current = window.open("", "_blank");
        reserve.mutate();
      }}
    >
      <aside className={layout.summary} aria-labelledby="pt-coach-title">
        <p id="pt-coach-title" className={fieldLabel}>
          {t("yourCoach")}
        </p>

        <div className={layout.summaryHead}>
          <div className="flex min-w-0 items-center gap-3">
            {trainerPhoto && (
              <Photo
                src={trainerPhoto}
                alt=""
                width={56}
                height={56}
                className="size-14 shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-[24px] leading-tight text-foreground uppercase sm:text-[28px]">
                {trainerName}
              </h2>
              {trainerHeadline && (
                <p className="mt-1 text-[13px] text-muted-foreground">{trainerHeadline}</p>
              )}
            </div>
          </div>
          {trainerYears > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {t("experience", { count: trainerYears })}
            </p>
          )}
        </div>

        <p className={layout.summaryNote}>
          <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-[#25d366]" />
          {t("summaryNote", { name: trainerFirstName })}
        </p>
      </aside>

      <div className={layout.details}>
        <h2 className="font-display text-2xl text-foreground uppercase">{t("detailsHeading")}</h2>

        <div className={layout.nameFields}>
          <div className={fieldGroup}>
            <label htmlFor="pt-first" className={fieldLabel}>
              {t("firstName")}
            </label>
            <input
              id="pt-first"
              required
              maxLength={60}
              autoComplete="given-name"
              className={fieldInput}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className={fieldGroup}>
            <label htmlFor="pt-last" className={fieldLabel}>
              {t("lastName")}
            </label>
            <input
              id="pt-last"
              required
              maxLength={60}
              autoComplete="family-name"
              className={fieldInput}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className={fieldGroup}>
          <label htmlFor="pt-phone" className={fieldLabel}>
            {t("phone")}
          </label>
          <input
            id="pt-phone"
            required
            type="tel"
            placeholder={t("phonePlaceholder")}
            autoComplete="tel"
            inputMode="tel"
            className={fieldInput}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className={fieldHint}>{t("phoneHint", { name: trainerFirstName })}</p>
        </div>

        <div className={fieldGroup}>
          <label htmlFor="pt-email" className={fieldLabel}>
            {t("email")} <span className={fieldOptional}>{t("optional")}</span>
          </label>
          <input
            id="pt-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={fieldInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className={fieldHint}>{t("emailHint")}</p>
        </div>

        <div className={fieldGroup}>
          <label htmlFor="pt-start" className={fieldLabel}>
            {t("startDate")}
          </label>
          <input
            id="pt-start"
            required
            type="date"
            lang={locale === "ar" ? "ar-EG" : "en-GB"}
            min={todayIso()}
            className={fieldInput}
            value={preferredStartsAt}
            onChange={(e) => setPreferredStartsAt(e.target.value)}
          />
          {preferredStartsAt && (
            <p className={fieldHint}>
              {t("startingOn", { date: formatStartDate(preferredStartsAt, locale) })}
            </p>
          )}
        </div>

        <div className={fieldGroup}>
          <label htmlFor="pt-times" className={fieldLabel}>
            {t("preferredTimes")} <span className={fieldOptional}>{t("optional")}</span>
          </label>
          <input
            id="pt-times"
            maxLength={200}
            placeholder={t("preferredTimesPlaceholder")}
            className={fieldInput}
            value={preferredTimes}
            onChange={(e) => setPreferredTimes(e.target.value)}
          />
          <p className={fieldHint}>{t("preferredTimesHint", { name: trainerFirstName })}</p>
        </div>

        <div className={fieldGroup}>
          <label htmlFor="pt-goal" className={fieldLabel}>
            {t("goal")} <span className={fieldOptional}>{t("optional")}</span>
          </label>
          <textarea
            id="pt-goal"
            rows={3}
            maxLength={500}
            placeholder={t("goalPlaceholder")}
            className={fieldTextarea}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        {/* Not display:none — some bots skip hidden fields but fill visually
            offscreen ones. aria-hidden and tabIndex keep it away from people and
            assistive tech. */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="pt-website">Leave this empty</label>
          <input
            id="pt-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <label className={consentRow}>
          <input
            type="checkbox"
            ref={acceptRef}
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            aria-describedby={showAcceptHint ? "pt-accept-hint" : undefined}
            className={consentBox}
          />
          <span>{t("agreement")}</span>
        </label>

        {showAcceptHint && (
          <p id="pt-accept-hint" role="alert" className={fieldError}>
            {t("agreementError")}
          </p>
        )}

        {reserve.isError && (
          <p role="alert" className={`border border-destructive px-4 py-3 ${fieldError}`}>
            {apiErrorMessage(reserve.error, t("submitError"))}
          </p>
        )}

        {/* Disabled until the agreement is ticked, with the reason always on
            screen beside it — under the button here, and inside the pinned bar
            on a phone. See the membership form for why the reason has to be
            visible rather than only appearing on press. */}
        <button
          type="submit"
          disabled={reserve.isPending || !accepted}
          aria-busy={reserve.isPending || undefined}
          aria-describedby={!accepted ? "pt-accept-required" : undefined}
          className="ui-action flex min-h-13 w-full bg-primary font-mono text-[13px] font-bold tracking-[0.08em] uppercase"
        >
          <WhatsAppIcon className="size-5" />
          {submitLabel}
        </button>

        {!accepted && (
          <p id="pt-accept-required" className="text-[12px] text-muted-foreground">
            {t("agreementRequired")}
          </p>
        )}
      </div>

    </form>
  );
}

/**
 * What replaces the form once the request exists.
 *
 * The WhatsApp tab has usually already opened by the time this renders, so this
 * is the fallback and the receipt rather than the main event — it repeats the
 * reference, and its primary button carries the same prefilled message in case
 * the automatic handoff was blocked.
 */
function PtReservedPanel({
  result,
  trainerFirstName,
}: {
  result: PtReservation;
  trainerFirstName: string;
}) {
  const t = useTranslations("PersonalTraining");
  const locale = useLocale();
  const starts = new Date(result.preferredStartsAt).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-GB",
    { weekday: "long", day: "numeric", month: "long" },
  );

  return (
    <div className="flex flex-col items-start gap-4 border border-primary bg-surface-1 p-6">
      <Check className="size-8 text-primary" strokeWidth={1.5} />

      <div className="flex flex-col gap-2">
        <h3 className="font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
          {result.alreadyRequested ? t("alreadyRequested") : t("requestSent")}
        </h3>
        <p className="max-w-md text-body-md text-muted-foreground">
          {result.alreadyRequested
            ? t("alreadyBody", { name: result.trainerName })
            : t("sentBody", { name: trainerFirstName })}
        </p>
      </div>

      <dl className="flex w-full flex-col gap-2 border-t border-border pt-4 text-[14px]">
        <Row label={t("rowCoach")} value={result.trainerName} />
        <Row label={t("rowStarting")} value={starts} />
        {result.preferredTimes && <Row label={t("rowTimes")} value={result.preferredTimes} />}
        {result.referenceCode && <Row label={t("rowReference")} value={result.referenceCode} mono />}
      </dl>

      <div className="flex w-full flex-col gap-2 pt-2">
        <WhatsAppCta message={ptReservationMessage(result)} className="w-full">
          {t("openWhatsapp")}
        </WhatsAppCta>
        <CtaButton href="/membership" variant="outline" className="w-full">
          {t("seePlans")}
        </CtaButton>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={`text-end text-foreground ${mono ? "font-mono tracking-[0.1em]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

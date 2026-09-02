"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import {
  reservePersonalTraining,
  type PtReservation,
} from "@/lib/api/personal-training";
import { apiErrorMessage } from "@/lib/api-error";
import { whatsappHref } from "@/lib/gym-format";
import { ptReservationMessage } from "@/lib/whatsapp-messages";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { CtaButton, ctaClasses } from "@/components/public/section";
import { BRAND } from "@/lib/brand";

/**
 * Reserve one-to-one sessions with a named coach.
 *
 * The sibling of the membership reserve form, and deliberately the same shape:
 * a short block of fields, a consent tick, one button, and a handoff to
 * WhatsApp carrying a reference the front desk can act on. Somebody who has
 * reserved a membership on this site should recognise this immediately.
 *
 * WHAT IT DOES NOT ASK. No session count and no price. The gym has not decided
 * how PT is sold yet, so a "how many sessions?" field would be asking a
 * question the site cannot price and the visitor cannot answer — the number
 * gets agreed in the chat that opens the moment this submits. The two optional
 * fields that ARE here exist for the coach rather than for us: when somebody
 * can train, and what they want out of it.
 */

const inputBase =
  "w-full border border-input bg-surface-1 px-3.5 py-3 text-base md:text-[14px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";
const labelBase =
  "font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

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
function formatStartDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PtReserveForm({
  trainerId,
  trainerFirstName,
}: {
  trainerId: string;
  /** First name only. Every string this form shows is conversational — "Train
   *  with Marcus", not "Train with Marcus Vance" — and the confirmation panel
   *  takes the full name from the server response instead, so it prints the
   *  name as it was actually recorded. */
  trainerFirstName: string;
}) {
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
    return (
      <PtReservedPanel
        result={result}
        trainerFirstName={trainerFirstName}
      />
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();

        // Validated here rather than by disabling the button. A disabled
        // primary at the end of a form reads as broken, and nothing on screen
        // would connect it to a checkbox two rows up — so it stays pressable
        // and points at what is missing. Scrolling to the box matters as much
        // as the message: on a phone it is usually off-screen by the time the
        // button is in reach.
        if (!accepted) {
          setShowAcceptHint(true);
          acceptRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
          acceptRef.current?.focus();
          return;
        }
        setShowAcceptHint(false);

        waTab.current = window.open("", "_blank");
        reserve.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="pt-first" className={labelBase}>
            First name
          </label>
          <input
            id="pt-first"
            required
            maxLength={60}
            autoComplete="given-name"
            className={inputBase}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="pt-last" className={labelBase}>
            Last name
          </label>
          <input
            id="pt-last"
            required
            maxLength={60}
            autoComplete="family-name"
            className={inputBase}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pt-phone" className={labelBase}>
          Phone
        </label>
        <input
          id="pt-phone"
          required
          type="tel"
          placeholder="010 0000 0000"
          autoComplete="tel"
          inputMode="tel"
          className={inputBase}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-[12px] text-muted-foreground">
          This is how {trainerFirstName} and the team will reach you on WhatsApp.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pt-email" className={labelBase}>
          Email <span className="normal-case opacity-70">(optional)</span>
        </label>
        <input
          id="pt-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={inputBase}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pt-start" className={labelBase}>
          When would you like to start
        </label>
        <input
          id="pt-start"
          required
          type="date"
          lang="en-GB"
          min={todayIso()}
          className={inputBase}
          value={preferredStartsAt}
          onChange={(e) => setPreferredStartsAt(e.target.value)}
        />
        {preferredStartsAt && (
          <p className="text-[12px] text-muted-foreground">
            Starting {formatStartDate(preferredStartsAt)}.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pt-times" className={labelBase}>
          Times that suit you <span className="normal-case opacity-70">(optional)</span>
        </label>
        <input
          id="pt-times"
          maxLength={200}
          placeholder="Weekday evenings, Saturday mornings…"
          className={inputBase}
          value={preferredTimes}
          onChange={(e) => setPreferredTimes(e.target.value)}
        />
        <p className="text-[12px] text-muted-foreground">
          Checked against {trainerFirstName}&apos;s availability above.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pt-goal" className={labelBase}>
          What are you training for <span className="normal-case opacity-70">(optional)</span>
        </label>
        <textarea
          id="pt-goal"
          rows={3}
          maxLength={500}
          placeholder="Squat 100kg, back to running after a knee op, first competition…"
          className={`${inputBase} resize-y leading-relaxed`}
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

      <label className="flex cursor-pointer items-start gap-3 py-2 text-[14px] text-muted-foreground">
        <input
          type="checkbox"
          ref={acceptRef}
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          aria-describedby={showAcceptHint ? "pt-accept-hint" : undefined}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>I accept the gym rules and understand nothing is charged online.</span>
      </label>

      {showAcceptHint && (
        <p id="pt-accept-hint" role="alert" className="text-[13px] text-destructive">
          Please accept the gym rules to continue.
        </p>
      )}

      {reserve.isError && (
        <p role="alert" className="border border-destructive px-4 py-3 text-[13px] text-destructive">
          {apiErrorMessage(reserve.error, "Could not send that — please try again")}
        </p>
      )}

      <button
        type="submit"
        disabled={reserve.isPending}
        className={ctaClasses("primary", "w-full disabled:opacity-50")}
      >
        {reserve.isPending ? "Sending…" : `Request sessions with ${trainerFirstName}`}
      </button>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Nothing is charged online. We will confirm times and pricing with you on
        WhatsApp, and you pay at the gym.
      </p>
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
  const starts = new Date(result.preferredStartsAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col items-start gap-4 border border-primary bg-surface-1 p-6">
      <Check className="size-8 text-primary" strokeWidth={1.5} />

      <div className="flex flex-col gap-2">
        <h3 className="font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
          {result.alreadyRequested ? "Already with us" : "Request sent"}
        </h3>
        <p className="max-w-md text-body-md text-muted-foreground">
          {result.alreadyRequested
            ? `You already have a session request with ${result.trainerName}. We have not raised a second one — here it is again.`
            : `${trainerFirstName} and the team will confirm your times and what it costs on WhatsApp.`}
        </p>
      </div>

      <dl className="flex w-full flex-col gap-2 border-t border-border pt-4 text-[14px]">
        <Row label="Coach" value={result.trainerName} />
        <Row label="Starting" value={starts} />
        {result.preferredTimes && <Row label="Times" value={result.preferredTimes} />}
        {result.referenceCode && <Row label="Reference" value={result.referenceCode} mono />}
      </dl>

      <div className="flex w-full flex-col gap-2 pt-2">
        <WhatsAppCta message={ptReservationMessage(result)} className="w-full">
          Open WhatsApp
        </WhatsAppCta>
        <CtaButton href="/membership" variant="outline" className="w-full">
          See membership plans
        </CtaButton>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={`text-right text-foreground ${mono ? "font-mono tracking-[0.1em]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

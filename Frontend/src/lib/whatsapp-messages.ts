import { BRAND } from "./brand";
import { formatPrice } from "./format";
import { formatDuration } from "./gym-format";
import type { Plan } from "@/types/gym";

// The prefilled text behind every WhatsApp CTA on the site. One file, not one
// string per call site, so six buttons cannot drift into six different
// greetings — see nav.ts for the same argument about the header/footer/mobile
// nav staying in sync. Kept short: WhatsApp shows this as an editable draft,
// not a sent message, and a paragraph reads as spam in that box.

export function joinEnquiry(locale: string = "en"): string {
  if (locale === "ar") return `مرحباً ${BRAND.name}، أريد معرفة تفاصيل الاشتراكات والانضمام إلى الجيم.`;
  return `Hi ${BRAND.name}, I'd like to join the gym. Can you tell me about membership?`;
}

export function planEnquiry(plan: Pick<Plan, "tier" | "name" | "priceMinorUnits" | "durationValue" | "durationUnit">): string {
  const tier = plan.tier ?? plan.name;
  const price = formatPrice(plan.priceMinorUnits);
  const duration = formatDuration(plan);
  return `Hi ${BRAND.name}, I'd like to join on the ${tier} plan (${duration}, ${price}). What are the next steps?`;
}

export function classEnquiry(className: string): string {
  return `Hi ${BRAND.name}, I'm interested in the ${className} class. When does it run and how do I sign up?`;
}

export function classesGeneralEnquiry(): string {
  return `Hi ${BRAND.name}, I'd like to know which classes are running and how to sign up.`;
}

export function trainerEnquiry(trainerName: string): string {
  return `Hi ${BRAND.name}, I'd like to train with ${trainerName}. Are personal sessions available?`;
}

/**
 * A completed personal training request, handed to whoever picks up the chat.
 *
 * The sibling of reservationMessage below, and built the same way and for the
 * same reason: a block of labelled lines rather than a sentence, because the
 * request already exists server-side and staff should be able to act on it
 * without opening the admin panel.
 *
 * THE ONE DIFFERENCE IS THE MISSING TOTAL, and it is deliberate. A membership
 * reservation knows what it costs because plans carry prices; personal training
 * does not, because the gym has not decided how sessions are sold yet. So this
 * message ends by asking, rather than stating — which is the honest version of
 * the same handoff and the actual next thing that has to happen in the thread.
 * When PT gets prices, a `Sessions:` and a `Total:` line join the block and
 * that closing question comes out.
 */
export function ptReservationMessage(request: {
  memberName: string;
  trainerName: string;
  preferredStartsAt: string;
  preferredTimes: string | null;
  goal: string | null;
  referenceCode: string | null;
}): string {
  const starts = new Date(request.preferredStartsAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  const lines = [
    `Hi ${BRAND.name}, I'd like to book personal training 🏋️`,
    "",
    `Name: ${request.memberName}`,
    `Coach: ${request.trainerName}`,
    `Start: ${starts}`,
  ];

  if (request.preferredTimes) lines.push(`Times that suit me: ${request.preferredTimes}`);
  if (request.goal) lines.push(`Goal: ${request.goal}`);
  if (request.referenceCode) lines.push("", `Ref: ${request.referenceCode}`);

  lines.push("", "Could you let me know the session options and pricing?");

  return lines.join("\n");
}

/**
 * The one message here that is a block rather than a line.
 *
 * Every other message opens a conversation; this one hands over a completed
 * reservation, and whoever picks up the chat should be able to act on it
 * without opening the admin panel. Laid out as labelled lines because that is
 * what survives being read on a phone at a busy front desk.
 *
 * It is still only a convenience. The subscription and invoice already exist
 * server-side before this is ever sent, and WhatsApp shows prefilled text as
 * an editable draft — the member can trim it, or send nothing at all. When
 * that happens staff match on the phone number they are being messaged from,
 * which is why none of this is load-bearing.
 */
export function reservationMessage(reservation: {
  memberName: string;
  planName: string;
  durationValue: number;
  durationUnit: string;
  startsAt: string;
  totalMinorUnits: number;
  paymentMethod: "cash" | "instapay" | "wallet";
  referenceCode: string | null;
}, locale: string = "en"): string {
  const duration = `${reservation.durationValue} ${
    reservation.durationValue === 1 ? reservation.durationUnit : `${reservation.durationUnit}s`
  }`;
  const starts = new Date(reservation.startsAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  
  let method = "Cash";
  if (reservation.paymentMethod === "instapay") method = "InstaPay";
  if (reservation.paymentMethod === "wallet") method = "Wallet (Vodafone Cash, etc.)";

  if (locale === "ar") {
    const arabicStarts = new Date(reservation.startsAt).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
    });
    const arabicMethod = reservation.paymentMethod === "instapay" ? "InstaPay" : reservation.paymentMethod === "wallet" ? "محفظة إلكترونية" : "كاش";
    const arabicLines = [
      `مرحباً ${BRAND.name}، أريد تأكيد حجز اشتراكي 💪`,
      "",
      `الاسم: ${reservation.memberName}`,
      `الاشتراك: ${reservation.planName} — ${duration}`,
      `تاريخ البداية: ${arabicStarts}`,
      `الإجمالي: ${formatPrice(reservation.totalMinorUnits)}`,
      `طريقة الدفع: ${arabicMethod}`,
    ];
    if (reservation.referenceCode) arabicLines.push("", `رقم الحجز: ${reservation.referenceCode}`);
    return arabicLines.join("\n");
  }

  const lines = [
    `Hi ${BRAND.name}, I'd like to join 💪`,
    "",
    `Name: ${reservation.memberName}`,
    `Plan: ${reservation.planName} — ${duration}`,
    `Starts: ${starts}`,
    `Total: ${formatPrice(reservation.totalMinorUnits)}`,
    `Payment: ${method}`,
  ];

  if (reservation.referenceCode) {
    lines.push("", `Ref: ${reservation.referenceCode}`);
  }

  return lines.join("\n");
}

/** Staff chasing a reservation that was never paid for. */
export function chaseReservation(referenceCode: string | null, firstName: string): string {
  const ref = referenceCode ? ` (ref ${referenceCode})` : "";
  return `Hi ${firstName}, it's ${BRAND.name} — we still have your membership${ref} reserved. Would you like to come in and finish signing up?`;
}

/**
 * Staff opening a thread with a member where there is nothing specific to
 * chase — a settled invoice, a general question.
 *
 * Deliberately just a greeting. chaseReservation exists because an unpaid
 * reservation has one obvious thing to say; a paid one does not, and guessing
 * would put words in a staff member's mouth that they then have to delete.
 * WhatsApp shows this as an editable draft, so a greeting plus the reference
 * is the most useful thing to hand them: it identifies the gym and the record,
 * and leaves the sentence to whoever is typing.
 */
export function memberOpener(firstName: string, referenceCode?: string | null): string {
  const ref = referenceCode ? ` (ref ${referenceCode})` : "";
  return `Hi ${firstName}, it's ${BRAND.name}${ref} — `;
}

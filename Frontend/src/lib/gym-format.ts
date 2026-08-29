import type { Plan, OpeningHours, Weekday, Branch, Trainer, BranchRef } from "@/types/gym";
import type { InvoicePaymentMethod, PaymentMethod } from "@/types/membership";

export const DAY_LABELS: Record<Weekday, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const DAY_SHORT: Record<Weekday, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

// The Egyptian week starts on Sunday, so opening hours read in that order
// rather than the Monday-first order a European site would use.
export const WEEK_ORDER: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// "06:00" -> "6:00 AM". Written by hand rather than through Intl because the
// input is a wall-clock string with no date attached, and constructing a Date
// to format it would invite a timezone into a value that has none.
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatHoursRange(h: OpeningHours): string {
  return h.isClosed ? "Closed" : `${formatTime(h.opensAt)} – ${formatTime(h.closesAt)}`;
}

// Sorts into week order and fills any missing day, so a branch entered before
// the admin form enforced all seven still renders a complete week.
export function orderedHours(hours: OpeningHours[]): OpeningHours[] {
  return WEEK_ORDER.map(
    (day) =>
      hours.find((h) => h.day === day) ?? {
        day,
        isClosed: true,
        opensAt: "00:00",
        closesAt: "00:00",
      },
  );
}

// "6 months", "1 year". Pluralised on the value, not the unit string.
export function formatDuration(plan: Pick<Plan, "durationValue" | "durationUnit">): string {
  const unit = plan.durationValue === 1 ? plan.durationUnit : `${plan.durationUnit}s`;
  return `${plan.durationValue} ${unit}`;
}

// What a plan actually costs per month, so the pricing page can show the real
// saving on a longer term rather than asking people to divide in their heads.
// Returns null for terms shorter than a month, where a monthly figure would be
// a made-up number.
export function monthlyEquivalent(plan: Plan): number | null {
  const price = plan.discountPriceMinorUnits ?? plan.priceMinorUnits;
  const months =
    plan.durationUnit === "year"
      ? plan.durationValue * 12
      : plan.durationUnit === "month"
        ? plan.durationValue
        : 0;

  if (months < 1) return null;
  return Math.round(price / months);
}

export function describeClassAccess(plan: Plan): string {
  if (plan.classAccess.mode === "unlimited") return "Unlimited classes";
  if (plan.classAccess.mode === "credits") {
    const n = plan.classAccess.creditsPerCycle;
    return `${n} ${n === 1 ? "class" : "classes"} a month`;
  }
  return "Gym floor only";
}

export function describeBranchAccess(plan: Plan): string {
  return plan.branchAccess === "all" ? "Every branch" : "Your home branch";
}

export const INTENSITY_LABELS = ["", "Very easy", "Easy", "Moderate", "Hard", "Very hard"];

// Branch references arrive populated on public routes and as bare ids on admin
// routes. Everything rendering a branch name goes through here rather than
// casting at the point of use.
export function branchName(ref: BranchRef): string | null {
  return typeof ref === "string" ? null : ref.name;
}

export function trainerBranchNames(trainer: Trainer): string[] {
  return trainer.branches.map(branchName).filter((n): n is string => Boolean(n));
}

export function fullAddress(branch: Branch): string {
  return `${branch.addressLine}, ${branch.city}, ${branch.governorate}`;
}

// Prefers an explicit link an admin pasted, and otherwise builds a search URL
// from the address — which works whether or not coordinates were entered.
export function mapsUrl(branch: Branch): string {
  if (branch.googleMapsUrl) return branch.googleMapsUrl;
  if (branch.latitude !== null && branch.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(branch))}`;
}

const EGYPT_COUNTRY_CODE = "20";

// Digits only, with the country code — what wa.me expects.
//
// The leading-zero case is the one that bites. Egyptian numbers are written
// and given out locally as 010…, but wa.me reads the digits as a full
// international number, so passing 01020598691 through unchanged yields a
// dead link rather than an error you would notice. Swapping that trunk zero
// for the country code is what makes a number copied off a business card work.
export function whatsappHref(number: string, message?: string): string {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `${EGYPT_COUNTRY_CODE}${digits.slice(1)}`;
  }
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

// How a payment method is written wherever staff read it back. Typed against
// the full InvoicePaymentMethod rather than the three we offer, so the map is
// exhaustive over anything the API can return — that exhaustiveness is the
// whole point, and it is what caught "wallet" missing here.
const PAYMENT_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  cash: "Cash",
  instapay: "InstaPay",
  wallet: "Wallet",
  card: "Card",
};

export function paymentMethodLabel(method: InvoicePaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

// Card payments are settled by Paymob's webhook and must never be marked paid
// by hand — that would activate a membership nobody was charged for. The other
// three are collected off-system, so a staff member confirming them is the
// only signal the money arrived.
//
// Written as an exclusion of card rather than a list of the three, so adding a
// fourth offline method cannot leave it silently unsettleable at the desk.
//
// A type predicate, not a plain boolean, and that is load-bearing: the admin
// screens gate the "record payment" button on this call and then hand the same
// value to a control that only accepts a staff-settleable method. Returning
// `boolean` leaves the compiler unable to see that the card case is already
// excluded, so those call sites would need a cast — and a cast is exactly the
// thing that would go on silently lying the day a gateway method is added back.
export function isSettledByStaff(method: InvoicePaymentMethod): method is PaymentMethod {
  return method !== "card";
}

// 01020598691 -> 010 2059 8691. How an Egyptian number is read aloud, which
// is also how someone checks they typed it correctly into a banking app.
export function formatEgyptianPhone(number: string): string {
  const digits = number.replace(/\D/g, "");
  const local = digits.startsWith(EGYPT_COUNTRY_CODE)
    ? `0${digits.slice(EGYPT_COUNTRY_CODE.length)}`
    : digits;
  return local.length === 11 ? `${local.slice(0, 3)} ${local.slice(3, 7)} ${local.slice(7)}` : number;
}

/**
 * Formats a membership date.
 *
 * Forced to UTC, and that is the whole point. Terms are stored as UTC
 * boundaries — a membership ending "21 November" is stored as
 * 2026-11-21T23:59:59.999Z — so formatting in the browser's local zone rolls
 * anything east of Greenwich onto the next day. Cairo is UTC+2, which turned
 * "runs until 21 November" into "runs until 22 November" and disagreed with
 * the days-remaining count sitting right above it.
 *
 * The backend's email templates do the same, so the page and the reminder
 * email always say the same date.
 */
export function formatMembershipDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The short form, for lists and history rows. */
export function formatMembershipDateShort(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

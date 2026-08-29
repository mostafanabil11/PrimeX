import type { DurationUnit, ClassAccessMode, BranchAccessMode } from "./gym";

export type SubscriptionStatus = "pending" | "active" | "frozen" | "expired" | "cancelled";

// The plan as it was on the day it was bought. Read this, never the live plan
// — a price rise must not change what an existing member sees they agreed to.
export interface PlanSnapshot {
  plan: string;
  name: string;
  slug: string;
  tier: string | null;
  durationValue: number;
  durationUnit: DurationUnit;
  priceMinorUnits: number;
  classAccessMode: ClassAccessMode;
  creditsPerCycle: number;
  branchAccess: BranchAccessMode;
  freezeDaysAllowed: number;
  guestPasses: number;
}

export interface ClassCredits {
  remaining: number;
  cycleStartsAt: string | null;
  cycleEndsAt: string | null;
}

export interface FreezePeriod {
  _id: string;
  from: string;
  to: string;
  days: number;
  reason: string | null;
  createdAt: string;
}

export interface Subscription {
  _id: string;
  member: string | { _id: string; firstName: string; lastName: string; email: string };
  planSnapshot: PlanSnapshot;
  branch: string | { _id: string; name: string; slug: string };
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string;
  classCredits: ClassCredits;
  freezes: FreezePeriod[];
  freezeDaysUsed: number;
  guestPassesRemaining: number;
  cancelledAt: string | null;
  cancellationReason: string | null;
  agreementVersion: string | null;
  createdAt: string;
}

/**
 * The ways a member can actually pay PrimeX.
 *
 * All three settle by hand: the invoice is raised pending and a staff member
 * marks it paid once the money is in. They are kept apart rather than lumped
 * together as "offline" because the money lands in three different places — a
 * drawer, a bank account, a mobile wallet — and a month cannot be reconciled
 * if the books call them the same thing.
 *
 * Card is deliberately absent. See InvoicePaymentMethod.
 *
 * Mirrors OFFERED_PAYMENT_METHODS in the backend's invoice.schema.ts.
 */
export type PaymentMethod = "cash" | "instapay" | "wallet";

/**
 * What an invoice read back from the API may say.
 *
 * Card is not offered — the Paymob funnel is dormant behind
 * MEMBERSHIP_SALES_ENABLED, so nothing can create one — but it stays in this
 * union so that re-enabling card checkout later is a config change and not a
 * type error in every screen that displays an invoice.
 *
 * Use PaymentMethod for anything a member chooses; use this only for reading.
 */
export type InvoicePaymentMethod = PaymentMethod | "card";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface InvoiceLine {
  kind: "membership" | "joining_fee" | "pt_package";
  description: string;
  unitPriceMinorUnits: number;
  quantity: number;
  lineTotalMinorUnits: number;
}

// Where a membership came from. Website-vs-desk only, on purpose — see the
// comment on SUBSCRIPTION_ORIGINS in the backend schema.
export type SubscriptionOrigin = "website" | "front_desk";

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  member:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone?: string | null;
        memberNumber?: number | null;
      };
  // Nullable: a member signed up at the desk or over WhatsApp may never give
  // one. Null means no receipt was emailed, which is the truth.
  email: string | null;
  phone?: string | null;
  lines: InvoiceLine[];
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
  couponCode: string | null;
  // Read-only side: widened so a card invoice from a re-enabled Paymob funnel
  // still types. Nothing in the app creates one today.
  paymentMethod: InvoicePaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  cardLast4: string | null;
  createdAt: string;
  // Populated on the admin list so a row carries the reference code staff
  // match against a WhatsApp thread, and where the membership came from.
  subscription?:
    | string
    | null
    | {
        _id: string;
        referenceCode: string | null;
        origin: SubscriptionOrigin | null;
        status: SubscriptionStatus;
        startsAt: string;
        endsAt: string;
        planSnapshot?: { name: string };
      };
}

export interface JoinQuote {
  plan: {
    id: string;
    name: string;
    slug: string;
    durationValue: number;
    durationUnit: DurationUnit;
  };
  // The plan's undiscounted price. Billed on the invoice line, with any offer
  // shown beneath it as a discount, so the receipt explains itself.
  listPriceMinorUnits: number;
  planPriceMinorUnits: number;
  joiningFeeMinorUnits: number;
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;
  // The offer that reduced the price, or null at list price. Memberships take
  // no coupon codes — offers are the only discount on a plan.
  offerName: string | null;
}

export interface Questionnaire {
  questions: string[];
  agreementVersion: string;
}

export interface JoinResult {
  invoiceNumber: string;
  subscriptionId: string;
  totalMinorUnits: number;
  // Echoes whichever route produced it: /join/reserve returns one of the three
  // offered methods, the dormant /join returns "card".
  paymentMethod: InvoicePaymentMethod;
  // Present for card payments only — the Paymob iframe to redirect into.
  iframeUrl: string | null;
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending: "Awaiting payment",
  active: "Active",
  frozen: "Frozen",
  expired: "Expired",
  cancelled: "Cancelled",
};

// Days left, counted the same way the backend does: a part day is a day, so a
// membership ending today still reads as one day rather than zero.
export function daysRemaining(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function describeSnapshotAccess(snapshot: PlanSnapshot): string {
  if (snapshot.classAccessMode === "unlimited") return "Unlimited classes";
  if (snapshot.classAccessMode === "credits") {
    return `${snapshot.creditsPerCycle} classes a month`;
  }
  return "Gym floor only";
}

import { apiClient } from "./client";
import type {
  Subscription,
  Invoice,
  JoinQuote,
  Questionnaire,
  JoinResult,
  PaymentMethod,
} from "@/types/membership";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

// --- Join ---

export async function getQuestionnaire(): Promise<Questionnaire> {
  return unwrap(await apiClient.get<ApiEnvelope<Questionnaire>>("/join/questionnaire"));
}

// No coupon parameter: memberships are discounted only by admin-run offers,
// which the server applies inside this quote.
export async function previewJoin(planId: string): Promise<JoinQuote> {
  return unwrap(await apiClient.post<ApiEnvelope<JoinQuote>>("/join/preview", { planId }));
}

export interface StartJoinInput {
  planId: string;
  branchId: string;
  startsAt: string;
  phone: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "prefer_not_to_say";
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
  fitnessGoals?: string[];
  // Neither is collected by the join funnel anymore — the health step was
  // removed rather than shortened. Kept optional, not deleted: the backend
  // still accepts them, so a screen could be reinstated by sending these
  // again without a contract change on either side.
  medicalNotes?: string | null;
  parqAnswers?: boolean[];
  acceptedAgreement: true;
  // "card" and nothing else. This is the Paymob route, and the backend DTO
  // narrowed to match — the offline methods go through reserveMembership,
  // which is the only path that raises an invoice for staff to collect.
  paymentMethod: "card";
  idempotencyKey?: string;
}

export async function startJoin(input: StartJoinInput): Promise<JoinResult> {
  return unwrap(await apiClient.post<ApiEnvelope<JoinResult>>("/join", input));
}

// --- Reserve (offline payment) ---

export interface ReserveInput {
  planId: string;
  startsAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  paymentMethod: PaymentMethod;
  acceptedAgreement: true;
  // Hidden field a real person never fills. Sent as "" normally; anything else
  // is a bot and the server quietly discards the whole submission.
  website?: string;
  idempotencyKey?: string;
}

/**
 * Two shapes, discriminated on `status`.
 *
 * `already_active` is not an error — it is a member who forgot they had a
 * membership, and a form that threw at them would be worse than useless.
 */
export type ReserveResult =
  | {
      status: "reserved";
      referenceCode: string | null;
      invoiceNumber: string;
      subscriptionId: string;
      totalMinorUnits: number;
      paymentMethod: PaymentMethod;
      startsAt: string;
      memberName: string;
      planName: string;
      durationValue: number;
      durationUnit: "day" | "week" | "month" | "year";
    }
  | { status: "already_active"; activeUntil: string; planName: string };

export async function reserveMembership(input: ReserveInput): Promise<ReserveResult> {
  return unwrap(await apiClient.post<ApiEnvelope<ReserveResult>>("/join/reserve", input));
}

// --- Front desk ---

export interface MemberLookupResult {
  found: boolean;
  memberId?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  memberNumber?: number | null;
  hasActiveMembership?: boolean;
  activeUntil?: string | null;
  activePlanName?: string | null;
}

export async function lookupMemberByPhone(phone: string): Promise<MemberLookupResult> {
  return unwrap(
    await apiClient.get<ApiEnvelope<MemberLookupResult>>("/join/member-lookup", {
      params: { phone },
    })
  );
}

export interface RecordMembershipInput {
  planId: string;
  startsAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  paymentMethod: PaymentMethod;
  markPaid: boolean;
  note?: string | null;
}

export interface RecordMembershipResult {
  subscriptionId: string;
  referenceCode: string | null;
  invoiceNumber: string;
  memberId: string;
  memberNumber: number | null;
  totalMinorUnits: number;
  paid: boolean;
}

export async function recordMembership(
  input: RecordMembershipInput
): Promise<RecordMembershipResult> {
  return unwrap(await apiClient.post<ApiEnvelope<RecordMembershipResult>>("/join/record", input));
}

// --- Membership ---

// Resolves to null when the member has none, which is a normal state for a
// signed-in account rather than an error.
export async function getCurrentMembership(): Promise<Subscription | null> {
  return unwrap(
    await apiClient.get<ApiEnvelope<Subscription | null>>("/subscriptions/mine/current"),
  );
}

export async function getMyMemberships(): Promise<Subscription[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Subscription[]>>("/subscriptions/mine"));
}

export async function getMembershipsForMember(memberId: string): Promise<Subscription[]> {
  return unwrap(
    await apiClient.get<ApiEnvelope<Subscription[]>>(`/subscriptions/member/${memberId}`),
  );
}

export async function getSubscription(id: string): Promise<Subscription> {
  return unwrap(await apiClient.get<ApiEnvelope<Subscription>>(`/subscriptions/${id}`));
}

export async function freezeSubscription(
  id: string,
  input: { from: string; days: number; reason?: string | null },
): Promise<Subscription> {
  return unwrap(await apiClient.post<ApiEnvelope<Subscription>>(`/subscriptions/${id}/freeze`, input));
}

export async function unfreezeSubscription(id: string): Promise<Subscription> {
  return unwrap(await apiClient.post<ApiEnvelope<Subscription>>(`/subscriptions/${id}/unfreeze`));
}

export async function cancelSubscription(id: string, reason?: string): Promise<Subscription> {
  return unwrap(
    await apiClient.post<ApiEnvelope<Subscription>>(`/subscriptions/${id}/cancel`, { reason }),
  );
}

// --- Invoices ---

export async function getMyInvoices(): Promise<Invoice[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Invoice[]>>("/invoices/mine"));
}

export async function getMyInvoice(invoiceNumber: string): Promise<Invoice> {
  return unwrap(await apiClient.get<ApiEnvelope<Invoice>>(`/invoices/${invoiceNumber}`));
}

export interface InvoiceList {
  invoices: Invoice[];
  total: number;
  paidTotalMinorUnits: number;
  // Across every invoice, not just the page being shown — money still owed is
  // only actionable as a whole-business number.
  pendingTotalMinorUnits: number;
  pendingCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getInvoicesAdmin(params?: {
  status?: string;
  member?: string;
  // A reference code, or part of an invoice number.
  q?: string;
  page?: number;
}): Promise<InvoiceList> {
  return unwrap(await apiClient.get<ApiEnvelope<InvoiceList>>("/invoices/admin", { params }));
}

export async function recordCashPayment(invoiceId: string): Promise<Invoice> {
  return unwrap(
    await apiClient.post<ApiEnvelope<Invoice>>(`/invoices/${invoiceId}/record-cash-payment`),
  );
}

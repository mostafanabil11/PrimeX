import { apiClient } from "./client";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

export interface ReservePtInput {
  trainerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  /** Date only, `YYYY-MM-DD`. */
  preferredStartsAt: string;
  preferredTimes?: string | null;
  goal?: string | null;
  acceptedAgreement: true;
  /** Hidden field a real person never fills. Sent as "" normally; anything
   *  else is a bot and the server quietly discards the whole submission. */
  website?: string;
}

/**
 * What the confirmation panel and the WhatsApp handoff need.
 *
 * No price, no invoice number and no total — personal training is not priced
 * on this site yet, and the WhatsApp thread settles it. See the note on the
 * backend schema for what gets added here when that changes; this type is the
 * seam.
 */
export interface PtReservation {
  status: "reserved";
  /**
   * True when the server handed back a request this person already had rather
   * than raising a second one — a revisit or a double-tap. The panel says so
   * instead of implying a new booking was made, because a member who is told
   * "done!" twice starts wondering how many they have.
   */
  alreadyRequested: boolean;
  requestId: string;
  referenceCode: string | null;
  memberName: string;
  trainerName: string;
  trainerSlug: string;
  preferredStartsAt: string;
  preferredTimes: string | null;
  goal: string | null;
}

export async function reservePersonalTraining(input: ReservePtInput): Promise<PtReservation> {
  return unwrap(
    await apiClient.post<ApiEnvelope<PtReservation>>("/personal-training/reserve", input),
  );
}

// --- Staff ---

export const PT_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "completed",
  "cancelled",
] as const;
export type PtStatus = (typeof PT_STATUSES)[number];

export interface PtRequestNote {
  _id: string;
  body: string;
  author: { firstName: string; lastName: string } | string | null;
  createdAt: string;
}

export interface PtRequest {
  _id: string;
  trainerSnapshot: {
    trainer: string;
    name: string;
    slug: string;
    headline: string | null;
  };
  member:
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        memberNumber: number | null;
      }
    | string;
  phone: string;
  memberName: string;
  preferredStartsAt: string;
  preferredTimes: string | null;
  goal: string | null;
  referenceCode: string | null;
  status: PtStatus;
  origin: "website" | "front_desk";
  notes: PtRequestNote[];
  createdAt: string;
  updatedAt: string;
}

export interface PtRequestList {
  requests: PtRequest[];
  total: number;
  /** Every status with a count, so the filter can show how much is waiting
   *  without a second request per chip. */
  counts: Record<PtStatus, number>;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getPtRequests(params?: {
  status?: PtStatus;
  trainer?: string;
  q?: string;
  page?: number;
}): Promise<PtRequestList> {
  return unwrap(
    await apiClient.get<ApiEnvelope<PtRequestList>>("/personal-training", { params }),
  );
}

export async function updatePtRequest(
  id: string,
  input: { status?: PtStatus },
): Promise<PtRequest> {
  return unwrap(await apiClient.patch<ApiEnvelope<PtRequest>>(`/personal-training/${id}`, input));
}

export async function addPtRequestNote(id: string, body: string): Promise<PtRequest> {
  return unwrap(
    await apiClient.post<ApiEnvelope<PtRequest>>(`/personal-training/${id}/notes`, { body }),
  );
}

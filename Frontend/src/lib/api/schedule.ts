import { apiClient } from "./client";
import { serverFetchOptional } from "./server-fetch";
import type { Timetable, Booking, RosterEntry, ClassSession } from "@/types/schedule";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

export interface ScheduleQuery {
  from?: string;
  to?: string;
  branch?: string;
  classType?: string;
  trainer?: string;
}

export async function getSchedule(query: ScheduleQuery = {}): Promise<Timetable> {
  return unwrap(await apiClient.get<ApiEnvelope<Timetable>>("/classes/schedule", { params: query }));
}

// The timetable changes as people book, so it is cached for a minute rather
// than the five the rest of the site uses — long enough to absorb a burst,
// short enough that spot counts are not misleading.
const SCHEDULE_REVALIDATE = 60;

export async function getScheduleServer(query: ScheduleQuery = {}): Promise<Timetable> {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, v]) => Boolean(v)) as [string, string][],
  );
  const suffix = params.toString() ? `?${params.toString()}` : "";

  const empty: Timetable = { from: "", to: "", timezone: "Africa/Cairo", sessions: [] };
  const res = await serverFetchOptional<ApiEnvelope<Timetable>>(
    `/classes/schedule${suffix}`,
    { revalidate: SCHEDULE_REVALIDATE },
    { success: true, message: "", data: empty },
  );
  return res.data;
}

export async function getSession(id: string): Promise<ClassSession> {
  return unwrap(await apiClient.get<ApiEnvelope<ClassSession>>(`/classes/sessions/${id}`));
}

export async function bookSession(sessionId: string): Promise<{ _id: string }> {
  return unwrap(await apiClient.post<ApiEnvelope<{ _id: string }>>("/bookings", { sessionId }));
}

export async function cancelBooking(
  bookingId: string,
): Promise<{ creditReturned: boolean }> {
  return unwrap(
    await apiClient.post<ApiEnvelope<{ creditReturned: boolean }>>(
      `/bookings/${bookingId}/cancel`,
    ),
  );
}

export async function getMyBookings(scope: "upcoming" | "past" = "upcoming"): Promise<Booking[]> {
  return unwrap(
    await apiClient.get<ApiEnvelope<Booking[]>>("/bookings/mine", { params: { scope } }),
  );
}

export async function getBookingsForMember(
  memberId: string,
  scope: "upcoming" | "past" = "upcoming",
): Promise<Booking[]> {
  return unwrap(
    await apiClient.get<ApiEnvelope<Booking[]>>(`/bookings/member/${memberId}`, {
      params: { scope },
    }),
  );
}

export async function getRoster(sessionId: string): Promise<RosterEntry[]> {
  return unwrap(await apiClient.get<ApiEnvelope<RosterEntry[]>>(`/bookings/session/${sessionId}`));
}

export async function markAttendance(bookingId: string, attended: boolean): Promise<void> {
  await apiClient.post(`/bookings/${bookingId}/attendance`, { attended });
}

// --- Admin: the recurring slots behind the timetable ---

export interface RecurrenceRule {
  _id: string;
  classType: { _id: string; name: string; slug: string; colorToken: string | null };
  branch: { _id: string; name: string; slug: string };
  trainer: { _id: string; name: string; slug: string } | null;
  weekday: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  room: string | null;
  womenOnly: boolean;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
}

export async function getRules(branch?: string): Promise<RecurrenceRule[]> {
  return unwrap(
    await apiClient.get<ApiEnvelope<RecurrenceRule[]>>("/classes/rules", {
      params: branch ? { branch } : undefined,
    }),
  );
}

export interface CreateRuleInput {
  classTypeId: string;
  branchId: string;
  trainerId?: string | null;
  weekday: string;
  startTime: string;
  durationMinutes?: number;
  capacity?: number;
  room?: string | null;
  womenOnly?: boolean;
  effectiveFrom: string;
  effectiveUntil?: string | null;
}

export async function createRule(input: CreateRuleInput): Promise<RecurrenceRule> {
  return unwrap(await apiClient.post<ApiEnvelope<RecurrenceRule>>("/classes/rules", input));
}

export async function stopRule(id: string): Promise<void> {
  await apiClient.post(`/classes/rules/${id}/stop`);
}

export async function cancelSession(id: string, reason?: string): Promise<void> {
  await apiClient.post(`/classes/sessions/${id}/cancel`, { reason: reason ?? null });
}

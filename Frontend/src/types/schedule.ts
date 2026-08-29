export type SessionStatus = "scheduled" | "cancelled" | "completed";
export type BookingStatus = "booked" | "attended" | "no_show" | "cancelled";

interface Ref {
  _id: string;
  name: string;
  slug: string;
}

export interface ClassSession {
  _id: string;
  classType: Ref & { colorToken?: string | null; intensity?: number; durationMinutes?: number };
  branch: Ref;
  trainer: (Ref & { headline?: string | null }) | null;
  // A real instant. The wall-clock time shown to members is derived from this
  // in the gym's timezone, never from the viewer's.
  startsAt: string;
  endsAt: string;
  // The local calendar day this belongs to, decided server-side — a 23:30
  // Cairo class belongs to that evening, not the following UTC day.
  localDate: string;
  capacity: number;
  bookedCount: number;
  room: string | null;
  womenOnly: boolean;
  status: SessionStatus;
}

export interface Timetable {
  from: string;
  to: string;
  // The zone the wall-clock times should be rendered in. Sent so the client
  // does not have to guess or hardcode it.
  timezone: string;
  sessions: ClassSession[];
}

export interface Booking {
  _id: string;
  session: ClassSession;
  status: BookingStatus;
  creditConsumed: boolean;
  sessionStartsAt: string;
  cancelledByGym: boolean;
  createdAt: string;
}

export interface RosterEntry {
  _id: string;
  member: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    parQ?: { hasFlag: boolean; clearedByStaffAt: string | null };
  };
  status: BookingStatus;
  createdAt: string;
}

export function spotsLeft(session: ClassSession): number {
  return Math.max(0, session.capacity - session.bookedCount);
}

/**
 * How full a class is, in the terms a member cares about.
 *
 * "Filling fast" exists because a bare number reads as availability — three
 * left looks fine until you realise it was twenty this morning.
 */
export function availability(session: ClassSession): {
  label: string;
  tone: "open" | "tight" | "full";
} {
  const left = spotsLeft(session);
  if (left === 0) return { label: "Full", tone: "full" };
  if (left <= 3) return { label: `${left} left`, tone: "tight" };
  return { label: "Available", tone: "open" };
}

/** The wall-clock time at the gym, not in the viewer's timezone. */
export function sessionTime(session: ClassSession, timezone: string): string {
  return new Date(session.startsAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

export function sessionEndTime(session: ClassSession, timezone: string): string {
  return new Date(session.endsAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
}

/** "Sunday 24 August" for a local date string, rendered without a timezone. */
export function formatLocalDate(localDate: string): string {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function formatLocalDateShort(localDate: string): string {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Groups a flat session list into days, preserving order. */
export function groupByDay(sessions: ClassSession[]): Array<{
  localDate: string;
  sessions: ClassSession[];
}> {
  const days = new Map<string, ClassSession[]>();
  for (const session of sessions) {
    const bucket = days.get(session.localDate);
    if (bucket) bucket.push(session);
    else days.set(session.localDate, [session]);
  }
  return [...days.entries()].map(([localDate, list]) => ({ localDate, sessions: list }));
}

export function todayLocalDate(timezone: string): string {
  // en-CA renders as YYYY-MM-DD, which is the format the API speaks.
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

export function addLocalDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

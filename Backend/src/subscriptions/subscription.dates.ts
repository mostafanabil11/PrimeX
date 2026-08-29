import { DurationUnit } from '@/plans/schemas/plan.schema';

/**
 * Date arithmetic for memberships, kept in one file and unit-tested, because
 * every bug here is a member who gets a day too few or a day too many and is
 * quite right to complain.
 *
 * Everything works in UTC. The gym is in one timezone and terms are counted in
 * whole days, so introducing a local calendar would only add a class of bug
 * around daylight saving without buying anything.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Adds a plan term to a date.
 *
 * Month and year arithmetic is calendar-based, not 30-day-based: a member who
 * joins on 15 March on a one-month plan expects to expire on 15 April, not on
 * 14 April.
 *
 * The end-of-month case is the one that bites. 31 January plus one month has
 * no 31 February, and the naive setMonth rolls over into March — giving the
 * member three extra days. It is clamped to the last day of the target month
 * instead, so 31 January becomes 28 February (or 29 in a leap year).
 */
export function addTerm(from: Date, value: number, unit: DurationUnit): Date {
  const d = new Date(from.getTime());

  switch (unit) {
    case 'day':
      d.setUTCDate(d.getUTCDate() + value);
      return d;

    case 'week':
      d.setUTCDate(d.getUTCDate() + value * 7);
      return d;

    case 'month':
      return addMonths(d, value);

    case 'year':
      return addMonths(d, value * 12);
  }
}

function addMonths(from: Date, months: number): Date {
  const day = from.getUTCDate();
  const d = new Date(from.getTime());

  // Move to the 1st before shifting the month, so the rollover cannot happen
  // while we are still deciding which month we are aiming at.
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);

  const lastDayOfTarget = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();

  d.setUTCDate(Math.min(day, lastDayOfTarget));
  return d;
}

/** Whole days between two instants, rounded up — a part day is a day. */
export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_PER_DAY);
}

/** Midnight UTC on the same calendar day — terms are counted in whole days. */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * The last instant of a membership's final day.
 *
 * A membership that ends "on 15 April" is usable all day on the 15th. Storing
 * midnight would quietly cut the last day short, which is the kind of
 * off-by-one nobody notices until a member is turned away at the door.
 */
export function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

/**
 * When a term starting on `startsAt` should end.
 *
 * The minus-one-day is deliberate. A one-month membership starting 1 March
 * runs to the end of 31 March, not into 1 April — otherwise every term is a
 * day longer than it was sold as, and consecutive terms overlap.
 */
export function calculateEndsAt(startsAt: Date, value: number, unit: DurationUnit): Date {
  const naturalEnd = addTerm(startOfDay(startsAt), value, unit);
  return endOfDay(addDays(naturalEnd, -1));
}

/** Whole days of membership left, floored at zero. */
export function daysRemaining(endsAt: Date, now: Date = new Date()): number {
  return Math.max(0, daysBetween(now, endsAt));
}

/**
 * The credit cycle a membership is in on a given day.
 *
 * Cycles run monthly from the start date rather than on calendar months, so a
 * member who joins on the 20th gets a fresh allowance on the 20th of each
 * month rather than a stub period until the 1st.
 *
 * Returns null once the subscription has run out, so the caller can tell "no
 * cycle" apart from "an empty one".
 */
export function currentCycle(
  startsAt: Date,
  endsAt: Date,
  now: Date = new Date()
): { cycleStartsAt: Date; cycleEndsAt: Date } | null {
  if (now.getTime() > endsAt.getTime()) {
    return null;
  }

  const start = startOfDay(startsAt);
  let cycleStart = start;

  // Walk forward a month at a time. Terms are at most a year or two, so this
  // is a couple of dozen iterations at worst — and it stays correct across
  // month lengths in a way that dividing by 30 does not.
  for (let i = 1; i < 400; i++) {
    const next = addMonths(start, i);
    if (next.getTime() > now.getTime()) {
      break;
    }
    cycleStart = next;
  }

  const nextCycleStart = addMonths(cycleStart, 1);
  // The final cycle is cut short by the membership ending, not extended past it.
  const cycleEnd =
    nextCycleStart.getTime() > endsAt.getTime() ? endsAt : endOfDay(addDays(nextCycleStart, -1));

  return { cycleStartsAt: cycleStart, cycleEndsAt: cycleEnd };
}

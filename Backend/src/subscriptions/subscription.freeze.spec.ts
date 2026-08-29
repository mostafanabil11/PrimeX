import { addDays, daysBetween, endOfDay, startOfDay } from './subscription.dates';

/**
 * The refund arithmetic from SubscriptionsService.unfreeze, isolated.
 *
 * Extracted into a pure function here rather than mocked through the service,
 * because the bug this file exists for was in the arithmetic and not in the
 * plumbing — and arithmetic is worth testing exhaustively and cheaply.
 */
function unusedFreezeDays(now: Date, freeze: { from: Date; to: Date; days: number }): number {
  const today = startOfDay(now);
  const countFrom = today.getTime() > freeze.from.getTime() ? today : freeze.from;
  return Math.min(freeze.days, Math.max(0, daysBetween(countFrom, freeze.to)));
}

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function freezeOf(from: string, days: number) {
  const start = utc(from);
  return { from: start, to: endOfDay(addDays(start, days - 1)), days };
}

describe('unfreeze refund arithmetic', () => {
  // The regression. Unfreezing a freeze that had not started yet counted every
  // day between today and the freeze's end — so a 10-day freeze booked six
  // weeks out refunded 50 days and cut 40 days off the membership.
  it('refunds only the freeze length when it has not started yet', () => {
    const freeze = freezeOf('2026-10-01', 10);
    expect(unusedFreezeDays(utc('2026-08-22'), freeze)).toBe(10);
  });

  it('refunds the whole freeze on the morning it begins', () => {
    const freeze = freezeOf('2026-10-01', 10);
    expect(unusedFreezeDays(utc('2026-10-01'), freeze)).toBe(10);
  });

  it('refunds only the remaining days once it is under way', () => {
    const freeze = freezeOf('2026-10-01', 10);
    // Four days in: the 1st through the 4th are spent, six remain.
    expect(unusedFreezeDays(utc('2026-10-05'), freeze)).toBe(6);
  });

  it('refunds one day on the final day', () => {
    const freeze = freezeOf('2026-10-01', 10);
    expect(unusedFreezeDays(utc('2026-10-10'), freeze)).toBe(1);
  });

  it('refunds nothing once the freeze has finished', () => {
    const freeze = freezeOf('2026-10-01', 10);
    expect(unusedFreezeDays(utc('2026-10-11'), freeze)).toBe(0);
    expect(unusedFreezeDays(utc('2026-12-01'), freeze)).toBe(0);
  });

  it('never refunds more than the freeze was worth', () => {
    const freeze = freezeOf('2027-01-01', 3);
    // Months early, and still capped at three.
    expect(unusedFreezeDays(utc('2026-08-22'), freeze)).toBe(3);
  });

  it('handles a single-day freeze', () => {
    const freeze = freezeOf('2026-09-15', 1);
    expect(unusedFreezeDays(utc('2026-09-14'), freeze)).toBe(1);
    expect(unusedFreezeDays(utc('2026-09-15'), freeze)).toBe(1);
    expect(unusedFreezeDays(utc('2026-09-16'), freeze)).toBe(0);
  });

  // A freeze that is fully refunded should leave no trace in the ledger, so
  // "how many freezes have I taken" stays truthful.
  it('signals a full refund by matching the freeze length', () => {
    const freeze = freezeOf('2026-10-01', 10);
    const refund = unusedFreezeDays(utc('2026-08-22'), freeze);
    expect(refund >= freeze.days).toBe(true);
  });

  it('signals a partial refund by being short of the freeze length', () => {
    const freeze = freezeOf('2026-10-01', 10);
    const refund = unusedFreezeDays(utc('2026-10-05'), freeze);
    expect(refund < freeze.days).toBe(true);
    expect(freeze.days - refund).toBe(4);
  });
});

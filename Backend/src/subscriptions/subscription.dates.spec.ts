import {
  addTerm,
  calculateEndsAt,
  currentCycle,
  daysRemaining,
  daysBetween,
  startOfDay,
  endOfDay,
} from './subscription.dates';

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('subscription date arithmetic', () => {
  describe('addTerm', () => {
    it('adds days and weeks', () => {
      expect(addTerm(utc('2026-03-15'), 10, 'day').toISOString()).toBe('2026-03-25T00:00:00.000Z');
      expect(addTerm(utc('2026-03-15'), 2, 'week').toISOString()).toBe('2026-03-29T00:00:00.000Z');
    });

    it('adds months by the calendar, not by 30 days', () => {
      // February is short. A 30-day month would land on 17 March.
      expect(addTerm(utc('2026-02-15'), 1, 'month').toISOString()).toBe('2026-03-15T00:00:00.000Z');
    });

    // The case that silently gives members free days if you use setMonth
    // directly: 31 January + 1 month has no 31 February, and the naive
    // version rolls over into March.
    it('clamps to the last day when the target month is shorter', () => {
      expect(addTerm(utc('2026-01-31'), 1, 'month').toISOString()).toBe('2026-02-28T00:00:00.000Z');
      expect(addTerm(utc('2026-03-31'), 1, 'month').toISOString()).toBe('2026-04-30T00:00:00.000Z');
      expect(addTerm(utc('2026-08-31'), 6, 'month').toISOString()).toBe('2027-02-28T00:00:00.000Z');
    });

    it('handles a leap year', () => {
      expect(addTerm(utc('2028-01-31'), 1, 'month').toISOString()).toBe('2028-02-29T00:00:00.000Z');
      expect(addTerm(utc('2028-02-29'), 1, 'year').toISOString()).toBe('2029-02-28T00:00:00.000Z');
    });

    it('adds years across a month boundary', () => {
      expect(addTerm(utc('2026-06-15'), 1, 'year').toISOString()).toBe('2027-06-15T00:00:00.000Z');
    });
  });

  describe('calculateEndsAt', () => {
    // A one-month membership starting 1 March runs to the end of 31 March.
    // Ending on 1 April would make every term a day longer than it was sold
    // as, and make consecutive terms overlap.
    it('ends on the last day of the term, not the first day after it', () => {
      expect(calculateEndsAt(utc('2026-03-01'), 1, 'month').toISOString()).toBe(
        '2026-03-31T23:59:59.999Z'
      );
    });

    it('runs to the end of the final day, not its start', () => {
      const end = calculateEndsAt(utc('2026-03-15'), 1, 'month');
      expect(end.toISOString()).toBe('2026-04-14T23:59:59.999Z');
      expect(end.getUTCHours()).toBe(23);
    });

    it('handles an annual term', () => {
      expect(calculateEndsAt(utc('2026-01-01'), 1, 'year').toISOString()).toBe(
        '2026-12-31T23:59:59.999Z'
      );
    });

    it('handles a short-month start', () => {
      expect(calculateEndsAt(utc('2026-01-31'), 1, 'month').toISOString()).toBe(
        '2026-02-27T23:59:59.999Z'
      );
    });

    it('produces consecutive, non-overlapping terms', () => {
      const first = calculateEndsAt(utc('2026-03-01'), 1, 'month');
      const secondStart = new Date(first.getTime() + 1);
      expect(secondStart.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    });
  });

  describe('daysRemaining', () => {
    it('counts whole days left', () => {
      expect(daysRemaining(endOfDay(utc('2026-03-20')), utc('2026-03-15'))).toBe(6);
    });

    it('still shows a day on the final day', () => {
      expect(daysRemaining(endOfDay(utc('2026-03-15')), utc('2026-03-15'))).toBe(1);
    });

    it('floors at zero once expired', () => {
      expect(daysRemaining(endOfDay(utc('2026-03-10')), utc('2026-03-15'))).toBe(0);
    });
  });

  describe('currentCycle', () => {
    const start = utc('2026-01-20');
    const end = calculateEndsAt(start, 6, 'month');

    it('puts the first month in the first cycle', () => {
      const cycle = currentCycle(start, end, utc('2026-01-25'));
      expect(cycle?.cycleStartsAt.toISOString()).toBe('2026-01-20T00:00:00.000Z');
      expect(cycle?.cycleEndsAt.toISOString()).toBe('2026-02-19T23:59:59.999Z');
    });

    // Cycles run from the join date, not from the 1st — a member who joins on
    // the 20th should not get a stub allowance until month end.
    it('rolls on the anniversary day, not the calendar month', () => {
      const cycle = currentCycle(start, end, utc('2026-02-20'));
      expect(cycle?.cycleStartsAt.toISOString()).toBe('2026-02-20T00:00:00.000Z');
    });

    it('is still in the previous cycle the day before the roll', () => {
      const cycle = currentCycle(start, end, utc('2026-02-19'));
      expect(cycle?.cycleStartsAt.toISOString()).toBe('2026-01-20T00:00:00.000Z');
    });

    it('cuts the final cycle short at the end of the membership', () => {
      const cycle = currentCycle(start, end, utc('2026-07-15'));
      expect(cycle?.cycleEndsAt.getTime()).toBe(end.getTime());
    });

    it('returns null once the membership has run out', () => {
      expect(currentCycle(start, end, utc('2026-09-01'))).toBeNull();
    });

    it('handles a start date that does not exist in every month', () => {
      const janStart = utc('2026-01-31');
      const janEnd = calculateEndsAt(janStart, 3, 'month');
      const cycle = currentCycle(janStart, janEnd, utc('2026-03-02'));
      // February clamps to the 28th, so the March cycle has already begun.
      expect(cycle?.cycleStartsAt.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    });
  });

  describe('startOfDay and endOfDay', () => {
    it('normalises to whole UTC days', () => {
      const noon = new Date('2026-03-15T12:34:56.789Z');
      expect(startOfDay(noon).toISOString()).toBe('2026-03-15T00:00:00.000Z');
      expect(endOfDay(noon).toISOString()).toBe('2026-03-15T23:59:59.999Z');
    });
  });

  describe('daysBetween', () => {
    it('rounds a part day up', () => {
      expect(daysBetween(utc('2026-03-15'), new Date('2026-03-16T06:00:00.000Z'))).toBe(2);
    });
  });
});

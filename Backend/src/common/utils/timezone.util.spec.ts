import {
  zonedTimeToUtc,
  utcToZonedDate,
  utcToZonedTime,
  utcToZonedWeekday,
  offsetMinutesAt,
  addLocalDays,
  GYM_TIMEZONE,
} from './timezone.util';

describe('timezone conversion for the class schedule', () => {
  describe('offsetMinutesAt', () => {
    // Egypt abolished daylight saving in 2014 and reinstated it in 2023, so
    // this is not a fixed +2 and any code that assumes so breaks twice a year.
    it('reports +2 for Cairo in winter', () => {
      expect(offsetMinutesAt(new Date('2026-01-15T12:00:00Z'), GYM_TIMEZONE)).toBe(120);
    });

    it('reports +3 for Cairo in summer', () => {
      expect(offsetMinutesAt(new Date('2026-06-15T12:00:00Z'), GYM_TIMEZONE)).toBe(180);
    });

    it('reports 0 for UTC', () => {
      expect(offsetMinutesAt(new Date('2026-06-15T12:00:00Z'), 'UTC')).toBe(0);
    });
  });

  describe('zonedTimeToUtc', () => {
    // The case that matters: the same wall-clock class time is a different
    // instant depending on the season.
    it('maps a winter 18:00 in Cairo to 16:00Z', () => {
      expect(zonedTimeToUtc('2026-01-20', '18:00').toISOString()).toBe('2026-01-20T16:00:00.000Z');
    });

    it('maps a summer 18:00 in Cairo to 15:00Z', () => {
      expect(zonedTimeToUtc('2026-06-16', '18:00').toISOString()).toBe('2026-06-16T15:00:00.000Z');
    });

    it('handles an early class before the offset shifts the date', () => {
      expect(zonedTimeToUtc('2026-01-20', '06:00').toISOString()).toBe('2026-01-20T04:00:00.000Z');
    });

    // A 00:30 class in Cairo is still the previous UTC day.
    it('rolls back a day when local midnight is ahead of UTC', () => {
      expect(zonedTimeToUtc('2026-01-20', '00:30').toISOString()).toBe('2026-01-19T22:30:00.000Z');
    });

    it('round-trips through utcToZonedTime', () => {
      for (const [date, time] of [
        ['2026-01-20', '06:00'],
        ['2026-06-16', '18:30'],
        ['2026-11-03', '21:45'],
        ['2026-08-22', '13:15'],
      ] as const) {
        const instant = zonedTimeToUtc(date, time);
        expect(utcToZonedTime(instant)).toBe(time);
        expect(utcToZonedDate(instant)).toBe(date);
      }
    });

    // Around the spring-forward boundary the offset at the guessed instant
    // differs from the offset at the real one, which is what the correction
    // pass exists for.
    it('stays correct either side of a daylight-saving change', () => {
      const beforeShift = zonedTimeToUtc('2026-04-20', '18:00');
      const afterShift = zonedTimeToUtc('2026-05-20', '18:00');
      expect(utcToZonedTime(beforeShift)).toBe('18:00');
      expect(utcToZonedTime(afterShift)).toBe('18:00');
    });
  });

  describe('utcToZonedDate', () => {
    // A late class belongs to the evening it happened on, not to the UTC day
    // it spilled into.
    it('keeps a late-evening class on its own local day', () => {
      expect(utcToZonedDate(new Date('2026-01-20T22:30:00Z'))).toBe('2026-01-21');
      expect(utcToZonedDate(new Date('2026-01-20T21:00:00Z'))).toBe('2026-01-20');
    });
  });

  describe('utcToZonedWeekday', () => {
    it('names the local weekday in the form the schema uses', () => {
      // 2026-08-22 is a Saturday.
      expect(utcToZonedWeekday(zonedTimeToUtc('2026-08-22', '10:00'))).toBe('saturday');
      expect(utcToZonedWeekday(zonedTimeToUtc('2026-08-23', '10:00'))).toBe('sunday');
    });

    it('uses the local day, not the UTC one', () => {
      // 23:30 Cairo on Saturday is 20:30Z Saturday — same day here, but the
      // guard matters for zones further ahead.
      expect(utcToZonedWeekday(zonedTimeToUtc('2026-08-22', '23:30'))).toBe('saturday');
    });
  });

  describe('addLocalDays', () => {
    it('walks the calendar without touching time', () => {
      expect(addLocalDays('2026-08-22', 1)).toBe('2026-08-23');
      expect(addLocalDays('2026-08-31', 1)).toBe('2026-09-01');
      expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
    });

    it('handles a leap day', () => {
      expect(addLocalDays('2028-02-28', 1)).toBe('2028-02-29');
    });
  });
});

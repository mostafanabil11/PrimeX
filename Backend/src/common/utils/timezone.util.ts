/**
 * Wall-clock to instant, for a named timezone.
 *
 * The gym schedules in local time — "spin, Tuesdays at 18:00" — but a booking
 * needs a real instant, and Egypt is not at a fixed offset. It abolished
 * daylight saving in 2014 and brought it back in 2023, so Cairo is UTC+2 in
 * winter and UTC+3 in summer. A class at 18:00 is 16:00Z in January and
 * 15:00Z in June.
 *
 * Doing this with a hardcoded +2 would put every summer class an hour late,
 * twice a year, for everyone. Doing it with the server's own timezone would
 * make the schedule depend on where the process happens to run.
 */

export const GYM_TIMEZONE = 'Africa/Cairo';

/**
 * The offset of `timeZone` from UTC, in minutes, at a given instant.
 * Positive means ahead of UTC — Cairo returns 120 or 180.
 */
export function offsetMinutesAt(instant: Date, timeZone: string): number {
  // Format the instant in the target zone, read the pieces back as if they
  // were UTC, and the difference is the offset. Roundabout, but it is the
  // only way to get this out of Intl without a timezone database of our own.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);

  // Intl renders midnight as hour 24 in some locales; normalise it.
  const hour = get('hour') % 24;

  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  );

  return (asUtc - instant.getTime()) / 60000;
}

/**
 * Turns a local calendar date and wall-clock time into the UTC instant it
 * refers to in `timeZone`.
 *
 * @param date  Local calendar date, "YYYY-MM-DD"
 * @param time  Local wall-clock time, "HH:mm"
 */
export function zonedTimeToUtc(date: string, time: string, timeZone = GYM_TIMEZONE): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  // Start by pretending the wall-clock reading is already UTC, then subtract
  // whatever offset applies at that moment.
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(naive - offsetMinutesAt(new Date(naive), timeZone) * 60000);

  // One correction pass. Near a DST boundary the offset at the guessed
  // instant can differ from the offset at the real one — an 02:30 on a
  // spring-forward morning being the classic case — and a single pass settles
  // everything except times that genuinely do not exist.
  const settled = offsetMinutesAt(instant, timeZone);
  const corrected = new Date(naive - settled * 60000);
  if (corrected.getTime() !== instant.getTime()) {
    instant = corrected;
  }

  return instant;
}

/**
 * The local calendar date, "YYYY-MM-DD", that an instant falls on in
 * `timeZone`. Used to group sessions into days for the timetable — a class at
 * 23:30 Cairo belongs to that evening, not to the following UTC day.
 */
export function utcToZonedDate(instant: Date, timeZone = GYM_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The local wall-clock time, "HH:mm", an instant falls on in `timeZone`. */
export function utcToZonedTime(instant: Date, timeZone = GYM_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  return `${String(Number(get('hour')) % 24).padStart(2, '0')}:${get('minute')}`;
}

/**
 * The weekday an instant falls on in `timeZone`, lowercased to match the
 * Weekday union used on branches and recurrence rules.
 */
export function utcToZonedWeekday(instant: Date, timeZone = GYM_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' })
    .format(instant)
    .toLowerCase();
}

/** Adds whole days to a local calendar date string, staying in local terms. */
export function addLocalDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().slice(0, 10);
}

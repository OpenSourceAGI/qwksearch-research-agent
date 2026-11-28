import SunCalc from 'suncalc';

/**
 * Sunrise and sunset, computed on the device with SunCalc from a date and a
 * pair of coordinates -- no API call, so it works for every weather provider
 * and keeps working on a cached or stale forecast.
 *
 * SunCalc returns an Invalid Date when an event does not happen on that day
 * (polar day or polar night), so every time here is either a real `Date` or
 * `null`.
 */

export type SunEventType = 'sunrise' | 'sunset';

export type SunTimes = {
  /** `null` when the sun does not rise that day (polar night, or polar day with no horizon crossing). */
  sunrise: Date | null;
  /** `null` when the sun does not set that day (polar day, or polar night with no horizon crossing). */
  sunset: Date | null;
};

export type NextSunEvent = {
  type: SunEventType;
  time: Date;
};

export type SunSummary = SunTimes & {
  /** Whichever of sunrise or sunset comes next from `now`, looking up to two days ahead. */
  next: NextSunEvent | null;
  /** `true` while the sun is above the horizon at `now`. */
  isUp: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function validDate(value: Date | undefined): Date | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

function validCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * Sunrise and sunset for the solar day containing `date` at the given place.
 *
 * Argument order follows SunCalc: date, latitude, longitude. West longitudes
 * and south latitudes are negative.
 */
export function getSunTimes(date: Date, latitude: number, longitude: number): SunTimes {
  if (!validDate(date) || !validCoordinates(latitude, longitude)) return { sunrise: null, sunset: null };
  const times = SunCalc.getTimes(date, latitude, longitude);
  return { sunrise: validDate(times.sunrise), sunset: validDate(times.sunset) };
}

/** `true` while the sun's centre is above the horizon at `date`. */
export function isSunUp(date: Date, latitude: number, longitude: number): boolean {
  if (!validDate(date) || !validCoordinates(latitude, longitude)) return false;
  return SunCalc.getPosition(date, latitude, longitude).altitude > 0;
}

/**
 * The next sunrise or sunset after `now`: today's sunset if the sun is still
 * up, otherwise the next sunrise (tomorrow's once today's sunset has passed).
 *
 * The days either side of `now` are searched too, because SunCalc picks the
 * solar day nearest the instant it is given, which is not always the local
 * calendar day. Returns `null` when neither event happens in the next two days
 * (deep polar day or night).
 */
export function getNextSunEvent(now: Date, latitude: number, longitude: number): NextSunEvent | null {
  if (!validDate(now) || !validCoordinates(latitude, longitude)) return null;
  let next: NextSunEvent | null = null;
  for (let offset = -1; offset <= 2; offset++) {
    const { sunrise, sunset } = getSunTimes(new Date(now.getTime() + offset * DAY_MS), latitude, longitude);
    for (const event of [
      { type: 'sunrise' as const, time: sunrise },
      { type: 'sunset' as const, time: sunset },
    ]) {
      if (!event.time || event.time.getTime() <= now.getTime()) continue;
      if (!next || event.time.getTime() < next.time.getTime()) next = { type: event.type, time: event.time };
    }
  }
  if (next && next.time.getTime() - now.getTime() > 2 * DAY_MS) return null;
  return next;
}

/** Today's sunrise and sunset at the place, which one comes next, and whether the sun is up now. */
export function getSunSummary(now: Date, latitude: number, longitude: number): SunSummary {
  return {
    ...getSunTimes(now, latitude, longitude),
    next: getNextSunEvent(now, latitude, longitude),
    isUp: isSunUp(now, latitude, longitude),
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds, or `null` for an unknown zone. */
function zoneOffsetMs(instant: Date, timeZone: string): number | null {
  try {
    const parts: Record<string, string> = {};
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    for (const part of format.formatToParts(instant)) parts[part.type] = part.value;
    const wallClock = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      parts.hour === '24' ? 0 : Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return Number.isFinite(wallClock) ? wallClock - Math.floor(instant.getTime() / 1000) * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * The instant of local noon on a `YYYY-MM-DD` calendar day at a place -- an
 * instant that is safely inside that day wherever the place is, which is what
 * SunCalc needs to answer for the intended day rather than a neighbour.
 *
 * Uses `timeZone` when it is a known IANA zone; otherwise approximates local
 * noon as solar noon from the longitude.
 */
export function localNoon(date: string, longitude: number, timeZone?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const noonAsUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (!Number.isFinite(noonAsUtc)) return null;
  if (timeZone) {
    const offset = zoneOffsetMs(new Date(noonAsUtc), timeZone);
    if (offset !== null) return new Date(noonAsUtc - offset);
  }
  const solarOffset = Number.isFinite(longitude) ? (longitude / 15) * 60 * 60 * 1000 : 0;
  return new Date(noonAsUtc - solarOffset);
}

/**
 * Sunrise and sunset for one `YYYY-MM-DD` day of a daily forecast, read as a
 * calendar day at the forecast's location.
 */
export function getDaySunTimes(date: string, latitude: number, longitude: number, timeZone?: string): SunTimes {
  const noon = localNoon(date, longitude, timeZone);
  return noon ? getSunTimes(noon, latitude, longitude) : { sunrise: null, sunset: null };
}

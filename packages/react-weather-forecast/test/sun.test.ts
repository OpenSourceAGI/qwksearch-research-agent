import { describe, expect, it } from 'vitest';
import { getDaySunTimes, getNextSunEvent, getSunSummary, getSunTimes, isSunUp, localNoon } from '../src/lib/sun';

// Sunnyvale, CA -- the west longitude is negative.
const SUNNYVALE = { latitude: 37.3688, longitude: -122.0363, timeZone: 'America/Los_Angeles' };
// Tromsø, Norway: polar night in December, midnight sun in June.
const TROMSO = { latitude: 69.65, longitude: 18.96 };

const MINUTE = 60 * 1000;

function expectNear(actual: Date | null | undefined, expectedIso: string, toleranceMinutes = 3) {
  expect(actual).toBeInstanceOf(Date);
  expect(Math.abs((actual as Date).getTime() - Date.parse(expectedIso))).toBeLessThan(toleranceMinutes * MINUTE);
}

function inZone(instant: Date | null, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instant as Date
  );
}

describe('getSunTimes', () => {
  it('computes sunrise and sunset locally from date, latitude, longitude', () => {
    const { sunrise, sunset } = getSunTimes(new Date('2027-01-15T20:00:00Z'), SUNNYVALE.latitude, SUNNYVALE.longitude);
    // 7:22 AM and 5:14 PM PST.
    expectNear(sunrise, '2027-01-15T15:22:00Z');
    expectNear(sunset, '2027-01-16T01:14:00Z');
  });

  it('returns null rather than an Invalid Date during polar night and polar day', () => {
    expect(getSunTimes(new Date('2026-12-21T11:00:00Z'), TROMSO.latitude, TROMSO.longitude)).toEqual({
      sunrise: null,
      sunset: null,
    });
    expect(getSunTimes(new Date('2026-06-21T11:00:00Z'), TROMSO.latitude, TROMSO.longitude)).toEqual({
      sunrise: null,
      sunset: null,
    });
  });

  it('returns nulls for unusable coordinates or dates instead of throwing', () => {
    expect(getSunTimes(new Date('2027-01-15T20:00:00Z'), Number.NaN, 10)).toEqual({ sunrise: null, sunset: null });
    expect(getSunTimes(new Date('2027-01-15T20:00:00Z'), 95, 10)).toEqual({ sunrise: null, sunset: null });
    expect(getSunTimes(new Date('nope'), 10, 10)).toEqual({ sunrise: null, sunset: null });
  });
});

describe('isSunUp', () => {
  it('tells day from night, including the polar extremes', () => {
    expect(isSunUp(new Date('2027-01-15T20:00:00Z'), SUNNYVALE.latitude, SUNNYVALE.longitude)).toBe(true);
    expect(isSunUp(new Date('2027-01-16T06:00:00Z'), SUNNYVALE.latitude, SUNNYVALE.longitude)).toBe(false);
    expect(isSunUp(new Date('2026-06-21T23:00:00Z'), TROMSO.latitude, TROMSO.longitude)).toBe(true);
    expect(isSunUp(new Date('2026-12-21T11:00:00Z'), TROMSO.latitude, TROMSO.longitude)).toBe(false);
  });
});

describe('getNextSunEvent', () => {
  const { latitude, longitude } = SUNNYVALE;

  it('is today\'s sunrise before dawn', () => {
    const next = getNextSunEvent(new Date('2027-01-15T10:00:00Z'), latitude, longitude);
    expect(next?.type).toBe('sunrise');
    expectNear(next?.time, '2027-01-15T15:22:00Z');
  });

  it('is today\'s sunset while the sun is up', () => {
    const next = getNextSunEvent(new Date('2027-01-15T20:00:00Z'), latitude, longitude);
    expect(next?.type).toBe('sunset');
    expectNear(next?.time, '2027-01-16T01:14:00Z');
  });

  it('is tomorrow\'s sunrise once sunset has passed', () => {
    const next = getNextSunEvent(new Date('2027-01-16T03:00:00Z'), latitude, longitude);
    expect(next?.type).toBe('sunrise');
    expectNear(next?.time, '2027-01-16T15:22:00Z');
  });

  it('is always in the future', () => {
    for (let hour = 0; hour < 48; hour++) {
      const now = new Date(Date.UTC(2027, 0, 15, hour));
      const next = getNextSunEvent(now, latitude, longitude);
      expect(next).not.toBeNull();
      expect(next!.time.getTime()).toBeGreaterThan(now.getTime());
      expect(next!.time.getTime() - now.getTime()).toBeLessThan(24 * 60 * MINUTE);
    }
  });

  it('is null when neither event happens soon (midnight sun)', () => {
    expect(getNextSunEvent(new Date('2026-06-21T11:00:00Z'), TROMSO.latitude, TROMSO.longitude)).toBeNull();
  });
});

describe('getSunSummary', () => {
  it('bundles today\'s times, the next event and whether the sun is up', () => {
    const summary = getSunSummary(new Date('2027-01-15T20:00:00Z'), SUNNYVALE.latitude, SUNNYVALE.longitude);
    expect(summary.isUp).toBe(true);
    expect(summary.next?.type).toBe('sunset');
    expect(summary.next?.time.getTime()).toBe(summary.sunset?.getTime());
  });
});

describe('localNoon', () => {
  it('is noon on the wall clock of the given time zone', () => {
    expect(localNoon('2027-01-15', SUNNYVALE.longitude, SUNNYVALE.timeZone)?.toISOString()).toBe('2027-01-15T20:00:00.000Z');
    // Daylight saving time moves it by an hour.
    expect(localNoon('2027-07-15', SUNNYVALE.longitude, SUNNYVALE.timeZone)?.toISOString()).toBe('2027-07-15T19:00:00.000Z');
    expect(localNoon('2027-01-15', 139.69, 'Asia/Tokyo')?.toISOString()).toBe('2027-01-15T03:00:00.000Z');
  });

  it('falls back to solar noon from the longitude without a usable zone', () => {
    expectNear(localNoon('2027-01-15', SUNNYVALE.longitude), '2027-01-15T20:08:00Z', 1);
    expectNear(localNoon('2027-01-15', SUNNYVALE.longitude, 'Not/AZone'), '2027-01-15T20:08:00Z', 1);
  });

  it('rejects a malformed date', () => {
    expect(localNoon('soon', 0)).toBeNull();
  });
});

describe('getDaySunTimes', () => {
  it('answers for the intended local calendar day wherever the place is', () => {
    const places = [
      { ...SUNNYVALE },
      { latitude: -33.87, longitude: 151.21, timeZone: 'Australia/Sydney' },
      { latitude: 35.68, longitude: 139.69, timeZone: 'Asia/Tokyo' },
      { latitude: 21.31, longitude: -157.86, timeZone: 'Pacific/Honolulu' },
      { latitude: 51.51, longitude: -0.13, timeZone: 'Europe/London' },
    ];
    for (const place of places) {
      for (const date of ['2027-01-15', '2027-03-28', '2027-07-01']) {
        const { sunrise, sunset } = getDaySunTimes(date, place.latitude, place.longitude, place.timeZone);
        expect(inZone(sunrise, place.timeZone)).toBe(date);
        expect(inZone(sunset, place.timeZone)).toBe(date);
        expect(sunrise!.getTime()).toBeLessThan(sunset!.getTime());
      }
    }
  });

  it('gives Sydney its early summer sunrise', () => {
    // About 6:00 AM AEDT on 15 January.
    expectNear(getDaySunTimes('2027-01-15', -33.87, 151.21, 'Australia/Sydney').sunrise, '2027-01-14T19:00:00Z');
  });

  it('is null on a polar day with no sunrise or sunset', () => {
    expect(getDaySunTimes('2026-12-21', TROMSO.latitude, TROMSO.longitude, 'Europe/Oslo')).toEqual({
      sunrise: null,
      sunset: null,
    });
  });
});

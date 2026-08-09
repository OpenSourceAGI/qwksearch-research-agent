import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWeatherForecast } from '../src/api/forecast';
import { clearWeatherForecastCache } from '../src/lib/cache';

/** A minimal but complete Open-Meteo response shape. */
function openMeteoResponse(overrides: Record<string, unknown> = {}) {
  return {
    timezone: 'America/Chicago',
    current: {
      time: '2024-01-01T12:00',
      temperature_2m: 71.6,
      weather_code: 0,
      is_day: 1,
      rain: 0,
      showers: 0,
      snowfall: 0,
      wind_speed_10m: 8.4,
    },
    hourly: {
      time: ['2024-01-01T12:00', '2024-01-01T13:00'],
      temperature_2m: [71.6, 74.2],
      weather_code: [0, 61],
      precipitation_probability: [0, 40],
      rain: [0, 0.2],
      showers: [0, 0],
      snowfall: [0, 0],
    },
    daily: {
      time: ['2024-01-01', '2024-01-02'],
      temperature_2m_min: [55.4, 58.1],
      temperature_2m_max: [78.9, 80.2],
      weather_code: [0, 95],
      precipitation_probability_max: [10, 70],
    },
    ...overrides,
  };
}

function mockFetch(payload: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: async () => payload,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof mockFetch>, call = 0): URL {
  return new URL(fetchMock.mock.calls[call][0] as unknown as string);
}

describe('getWeatherForecast', () => {
  beforeEach(() => {
    clearWeatherForecastCache();
    vi.unstubAllGlobals();
  });

  it('queries Open-Meteo with the supplied coordinates', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    await getWeatherForecast({ latitude: 30.27, longitude: -97.74 });

    const url = requestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('30.27');
    expect(url.searchParams.get('longitude')).toBe('-97.74');
  });

  it('applies the documented defaults', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    await getWeatherForecast({ latitude: 1, longitude: 2 });

    const params = requestedUrl(fetchMock).searchParams;
    expect(params.get('temperature_unit')).toBe('fahrenheit');
    expect(params.get('wind_speed_unit')).toBe('mph');
    expect(params.get('forecast_days')).toBe('5');
    expect(params.get('forecast_hours')).toBe('24');
    expect(params.get('timezone')).toBe('auto');
  });

  it('honours unit and range overrides', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    await getWeatherForecast({
      latitude: 1,
      longitude: 2,
      temperatureUnit: 'celsius',
      windSpeedUnit: 'kmh',
      forecastDays: 7,
      forecastHours: 48,
      location: { latitude: 1, longitude: 2, timezone: 'Europe/Berlin' },
    });

    const params = requestedUrl(fetchMock).searchParams;
    expect(params.get('temperature_unit')).toBe('celsius');
    expect(params.get('wind_speed_unit')).toBe('kmh');
    expect(params.get('forecast_days')).toBe('7');
    expect(params.get('forecast_hours')).toBe('48');
    expect(params.get('timezone')).toBe('Europe/Berlin');
  });

  it('resolves the location by IP when no coordinates are given', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes('ipapi.co')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ city: 'Austin', country_name: 'United States', latitude: 30.27, longitude: -97.74 }),
        };
      }
      return { ok: true, status: 200, statusText: 'OK', json: async () => openMeteoResponse() };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getWeatherForecast();

    expect(fetchMock.mock.calls[0][0]).toContain('ipapi.co');
    expect(result.location.city).toBe('Austin');
    expect(result.location.latitude).toBe(30.27);
  });

  it('normalizes current conditions, rounding the temperature', async () => {
    mockFetch(openMeteoResponse());

    const result = await getWeatherForecast({ latitude: 1, longitude: 2 });

    expect(result.current).toEqual({
      time: '2024-01-01T12:00',
      temperature: 72,
      weatherCode: 0,
      icon: 'sun',
      isDay: 1,
      rain: 0,
      showers: 0,
      snowfall: 0,
      windSpeed: 8.4,
    });
  });

  it('zips the hourly column arrays into per-hour records', async () => {
    mockFetch(openMeteoResponse());

    const result = await getWeatherForecast({ latitude: 1, longitude: 2 });

    expect(result.hourly).toHaveLength(2);
    expect(result.hourly[1]).toEqual({
      time: '2024-01-01T13:00',
      temperature: 74,
      weatherCode: 61,
      precipitationProbability: 40,
      rain: 0.2,
      showers: 0,
      snowfall: 0,
      icon: 'cloud-showers',
    });
  });

  it('zips the daily column arrays into per-day records', async () => {
    mockFetch(openMeteoResponse());

    const result = await getWeatherForecast({ latitude: 1, longitude: 2 });

    expect(result.daily).toHaveLength(2);
    expect(result.daily[1]).toEqual({
      date: '2024-01-02',
      min: 58,
      max: 80,
      weatherCode: 95,
      precipitationProbabilityMax: 70,
      icon: 'cloud-bolt',
    });
  });

  it('prefers the timezone reported by the API over the requested one', async () => {
    mockFetch(openMeteoResponse({ timezone: 'America/New_York' }));

    const result = await getWeatherForecast({ latitude: 1, longitude: 2 });

    expect(result.location.timezone).toBe('America/New_York');
  });

  it('tolerates optional hourly and daily fields being absent', async () => {
    const payload = openMeteoResponse();
    delete (payload.hourly as Record<string, unknown>).precipitation_probability;
    delete (payload.daily as Record<string, unknown>).precipitation_probability_max;
    mockFetch(payload);

    const result = await getWeatherForecast({ latitude: 1, longitude: 2 });

    expect(result.hourly[0].precipitationProbability).toBeUndefined();
    expect(result.daily[0].precipitationProbabilityMax).toBeUndefined();
  });

  it('serves a second identical request from the cache without refetching', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    const first = await getWeatherForecast({ latitude: 1, longitude: 2 });
    const second = await getWeatherForecast({ latitude: 1, longitude: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('refetches when the coordinates differ', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    await getWeatherForecast({ latitude: 1, longitude: 2 });
    await getWeatherForecast({ latitude: 3, longitude: 4 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws with status and status text on a failed request', async () => {
    mockFetch(null, { ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(getWeatherForecast({ latitude: 1, longitude: 2 })).rejects.toThrow(
      'Weather request failed: 503 Service Unavailable'
    );
  });

  it.each(['current', 'hourly', 'daily'])(
    'throws when the response is missing the %s block',
    async (missing) => {
      const payload = openMeteoResponse() as Record<string, unknown>;
      delete payload[missing];
      mockFetch(payload);

      await expect(getWeatherForecast({ latitude: 1, longitude: 2 })).rejects.toThrow(
        'Invalid weather response'
      );
    }
  );
});

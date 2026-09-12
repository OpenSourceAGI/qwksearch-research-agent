import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { getWeatherForecast } from '../src/api/forecast';
import { clearWeatherForecastCache } from '../src/lib/cache';
import grab from 'grab-url';
import { requestedUrl as wireUrl } from './requested-url';

vi.mock('grab-url');
const mockGrab = grab as MockedFunction<typeof grab>;

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

/** grab-url resolves with the parsed body, or with `{ error }` when a request failed. */
function mockFetch(payload: unknown) {
  mockGrab.mockResolvedValue(payload as never);
  return mockGrab;
}

function requestedUrl(fetchMock: typeof mockGrab, call = 0): URL {
  return new URL(wireUrl(fetchMock.mock.calls[call] as never));
}

/**
 * Failures fan out across the whole provider chain by design, so the tests
 * that assert on one upstream's error pin the chain to Open-Meteo alone and
 * drop the backoff.
 */
const onlyOpenMeteo = {
  weatherProviders: ['open-meteo'] as const,
  retryDelay: 0,
  allowStaleCache: false,
};

describe('getWeatherForecast', () => {
  beforeEach(() => {
    clearWeatherForecastCache();
    vi.resetAllMocks();
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
    const fetchMock = mockGrab.mockImplementation(async (input: string) => {
      if (input.includes('ipapi.co')) {
        return { city: 'Austin', country_name: 'United States', latitude: 30.27, longitude: -97.74 };
      }
      return openMeteoResponse();
    });

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
    mockFetch({ error: 'HTTP error: 503 Service Unavailable' });

    await expect(getWeatherForecast({ ...onlyOpenMeteo, latitude: 1, longitude: 2 })).rejects.toThrow(
      'Weather request failed: Open-Meteo: 503 Service Unavailable'
    );
  });

  it('throws with the reason when Open-Meteo answers 200 with an error flag', async () => {
    mockFetch({ error: true, reason: 'Cannot initialize WeatherVariable from invalid String value' });

    await expect(getWeatherForecast({ ...onlyOpenMeteo, latitude: 1, longitude: 2 })).rejects.toThrow(
      'Cannot initialize WeatherVariable from invalid String value'
    );
  });

  it.each(['current', 'hourly', 'daily'])(
    'throws when the response is missing the %s block',
    async (missing) => {
      const payload = openMeteoResponse() as Record<string, unknown>;
      delete payload[missing];
      mockFetch(payload);

      await expect(getWeatherForecast({ ...onlyOpenMeteo, latitude: 1, longitude: 2 })).rejects.toThrow(
        'Invalid weather response'
      );
    }
  );
});

describe('getWeatherForecast fallbacks', () => {
  beforeEach(() => {
    clearWeatherForecastCache();
    vi.resetAllMocks();
  });

  /** met.no's compact payload, enough of it for one hour and one day. */
  function metNoResponse() {
    return {
      properties: {
        timeseries: Array.from({ length: 4 }, (_, index) => ({
          time: new Date(Date.UTC(2024, 0, 1, index)).toISOString(),
          data: {
            instant: { details: { air_temperature: 20, wind_speed: 3 } },
            next_1_hours: { summary: { symbol_code: 'clearsky_day' }, details: { precipitation_amount: 0 } },
          },
        })),
      },
    };
  }

  it('never sends coordinates Open-Meteo would reject as a 400', async () => {
    // A geolocation upstream answering 200 with no coordinates used to become
    // `latitude=NaN` in the forecast URL.
    const fetchMock = mockGrab.mockImplementation(async (input: string) => {
      if (input.includes('ipapi.co')) return { city: 'Nowhere' };
      if (input.includes('ipwho.is')) return { latitude: 30.27, longitude: -97.74, city: 'Austin' };
      return openMeteoResponse();
    });

    const result = await getWeatherForecast({ retryDelay: 0 });

    const weatherCall = fetchMock.mock.calls.find(([url]) => String(url).includes('open-meteo'));
    expect(String(weatherCall?.[0])).not.toContain('NaN');
    expect(result.location.city).toBe('Austin');
  });

  it('looks the location up by IP when the given coordinates are unusable', async () => {
    const fetchMock = mockGrab.mockImplementation(async (input: string) => {
      if (input.includes('ipapi.co')) return { latitude: 30.27, longitude: -97.74, city: 'Austin' };
      return openMeteoResponse();
    });

    const result = await getWeatherForecast({ latitude: Number.NaN, longitude: -97.74, retryDelay: 0 });

    expect(String(fetchMock.mock.calls[0][0])).toContain('ipapi.co');
    expect(result.location.city).toBe('Austin');
  });

  it('clamps a forecast range no upstream would accept', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    await getWeatherForecast({ latitude: 1, longitude: 2, forecastDays: 99, forecastHours: 0 });

    const params = requestedUrl(fetchMock).searchParams;
    expect(params.get('forecast_days')).toBe('16');
    expect(params.get('forecast_hours')).toBe('1');
  });

  it('uses coordinates given on `location` instead of looking the caller up', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    await getWeatherForecast({ location: { latitude: 48.8566, longitude: 2.3522 } });

    const url = requestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('48.8566');
    // One call, so no IP lookup happened first.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the timezone geolocation reported when the caller named none', async () => {
    const fetchMock = mockGrab.mockImplementation(async (input: string) => {
      if (input.includes('ipapi.co')) {
        return { city: 'Berlin', timezone: 'Europe/Berlin', latitude: 52.52, longitude: 13.4 };
      }
      return openMeteoResponse();
    });

    await getWeatherForecast();

    expect(requestedUrl(fetchMock, 1).searchParams.get('timezone')).toBe('Europe/Berlin');
  });

  it('drops a timezone the runtime does not recognise instead of sending it', async () => {
    const fetchMock = mockFetch(openMeteoResponse());

    await getWeatherForecast({ latitude: 1, longitude: 2, location: { timezone: 'Mars/Phobos' } });

    expect(requestedUrl(fetchMock).searchParams.get('timezone')).toBe('auto');
  });

  it('falls back to met.no when both Open-Meteo endpoints fail', async () => {
    mockGrab.mockImplementation(async (input: string) => {
      if (input.includes('open-meteo')) return { error: 'HTTP error: 503 Service Unavailable' };
      if (input.includes('met.no')) return metNoResponse();
      return { error: 'HTTP error: 500 Internal Server Error' };
    });

    const result = await getWeatherForecast({ latitude: 30.27, longitude: -97.74, retryDelay: 0 });

    expect(result.current.temperature).toBe(68); // 20C rendered as Fahrenheit
    expect(result.daily.length).toBeGreaterThan(0);
  });

  it('reports what every provider said when the whole chain fails', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 503 Service Unavailable' } as never);

    await expect(
      getWeatherForecast({ latitude: 1, longitude: 2, retryDelay: 0 })
    ).rejects.toThrow(
      'Weather request failed: Open-Meteo: 503 Service Unavailable; Open-Meteo (GFS): 503 Service Unavailable; met.no: 503 Service Unavailable; wttr.in: 503 Service Unavailable'
    );
  });

  it('notifies onProviderError as the chain moves on', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 503 Service Unavailable' } as never);
    const onProviderError = vi.fn();

    await expect(
      getWeatherForecast({ latitude: 1, longitude: 2, retryDelay: 0, onProviderError })
    ).rejects.toThrow();

    expect(onProviderError.mock.calls.map(([info]) => info.provider)).toEqual([
      'open-meteo',
      'open-meteo-gfs',
      'met-no',
      'wttr',
    ]);
    expect(onProviderError.mock.calls[0][0].stage).toBe('forecast');
  });

  it('serves an expired cache entry rather than an error when everything is down', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    mockFetch(openMeteoResponse());
    const fresh = await getWeatherForecast({ latitude: 1, longitude: 2 });

    // Past the 30 minute TTL, with every provider failing.
    vi.setSystemTime(new Date('2024-01-01T02:00:00Z'));
    mockGrab.mockResolvedValue({ error: 'HTTP error: 503 Service Unavailable' } as never);

    const stale = await getWeatherForecast({ latitude: 1, longitude: 2, retryDelay: 0 });

    expect(stale).toEqual(fresh);
    vi.useRealTimers();
  });

  it('throws instead of serving stale data when that is turned off', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    mockFetch(openMeteoResponse());
    await getWeatherForecast({ latitude: 1, longitude: 2 });

    vi.setSystemTime(new Date('2024-01-01T02:00:00Z'));
    mockGrab.mockResolvedValue({ error: 'HTTP error: 503 Service Unavailable' } as never);

    await expect(
      getWeatherForecast({ latitude: 1, longitude: 2, retryDelay: 0, allowStaleCache: false })
    ).rejects.toThrow('Weather request failed');
    vi.useRealTimers();
  });

  it('caches a fallback provider\'s answer like the primary one\'s', async () => {
    mockGrab.mockImplementation(async (input: string) => {
      if (input.includes('open-meteo')) return { error: 'HTTP error: 503 Service Unavailable' };
      if (input.includes('met.no')) return metNoResponse();
      return { error: 'HTTP error: 500 Internal Server Error' };
    });

    const first = await getWeatherForecast({ latitude: 30.27, longitude: -97.74, retryDelay: 0 });
    const callsAfterFirst = mockGrab.mock.calls.length;
    const second = await getWeatherForecast({ latitude: 30.27, longitude: -97.74, retryDelay: 0 });

    expect(second).toEqual(first);
    expect(mockGrab.mock.calls.length).toBe(callsAfterFirst);
  });
});

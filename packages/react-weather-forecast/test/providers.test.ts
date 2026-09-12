import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import grab from 'grab-url';
import { metNoProvider, openMeteoProvider, resolveWeatherProviders, symbolToWmoCode, wttrProvider, wwoToWmoCode } from '../src/api/providers';
import type { ForecastRequest } from '../src/api/providers';
import { requestedUrl } from './requested-url';

vi.mock('grab-url');
const mockGrab = grab as MockedFunction<typeof grab>;

const request: ForecastRequest = {
  location: { latitude: 30.27, longitude: -97.74, city: 'Austin', timezone: 'UTC' },
  temperatureUnit: 'celsius',
  windSpeedUnit: 'ms',
  forecastDays: 3,
  forecastHours: 6,
  timezone: 'UTC',
  transport: { retryDelay: 0 },
};

/** met.no reports instants in UTC, hourly for the first days. */
function metNoResponse(hours = 30) {
  const start = Date.UTC(2024, 0, 1, 0, 0, 0);
  return {
    properties: {
      timeseries: Array.from({ length: hours }, (_, index) => ({
        time: new Date(start + index * 3_600_000).toISOString(),
        data: {
          instant: { details: { air_temperature: 10 + (index % 12), wind_speed: 3 + (index % 4) } },
          next_1_hours: {
            summary: { symbol_code: index % 2 ? 'lightrain' : 'clearsky_day' },
            details: { precipitation_amount: index % 2 ? 0.4 : 0, probability_of_precipitation: index % 2 ? 60 : 0 },
          },
        },
      })),
    },
  };
}

/** wttr.in reports the location's own local times, in both C and F. */
function wttrResponse() {
  const day = (date: string) => ({
    date,
    maxtempC: '24',
    maxtempF: '75',
    mintempC: '11',
    mintempF: '52',
    hourly: Array.from({ length: 8 }, (_, index) => ({
      time: String(index * 300),
      tempC: String(12 + index),
      tempF: String(54 + index),
      weatherCode: index % 2 ? '296' : '113',
      precipMM: index % 2 ? '0.3' : '0.0',
      chanceofrain: index % 2 ? '70' : '0',
      windspeedKmph: String(10 + index),
      windspeedMiles: String(6 + index),
    })),
  });

  return {
    current_condition: [
      { temp_C: '18', temp_F: '64', weatherCode: '116', windspeedKmph: '18', precipMM: '0.0' },
    ],
    nearest_area: [{ areaName: [{ value: 'Austin' }], region: [{ value: 'Texas' }], country: [{ value: 'United States' }] }],
    weather: [day('2024-01-01'), day('2024-01-02'), day('2024-01-03'), day('2024-01-04')],
  };
}

describe('condition code mapping', () => {
  it('maps met.no symbols onto WMO codes', () => {
    expect(symbolToWmoCode('clearsky_day')).toBe(0);
    expect(symbolToWmoCode('partlycloudy_night')).toBe(2);
    expect(symbolToWmoCode('heavyrainshowers_day')).toBe(82);
    expect(symbolToWmoCode('rainandthunder')).toBe(95);
    expect(symbolToWmoCode('heavysnowandthunder')).toBe(96);
    expect(symbolToWmoCode('somethingnew')).toBe(3);
    expect(symbolToWmoCode(undefined)).toBe(3);
  });

  it('maps wttr.in codes onto WMO codes', () => {
    expect(wwoToWmoCode('113')).toBe(0);
    expect(wwoToWmoCode('296')).toBe(61);
    expect(wwoToWmoCode(389)).toBe(95);
    expect(wwoToWmoCode('nonsense')).toBe(3);
  });
});

describe('Open-Meteo provider', () => {
  beforeEach(() => vi.resetAllMocks());

  const payload = {
    timezone: 'UTC',
    current: { time: '2024-01-01T12:00', temperature_2m: 21, weather_code: 0, is_day: 1 },
    hourly: { time: ['2024-01-01T12:00'], temperature_2m: [21], weather_code: [0] },
    daily: { time: ['2024-01-01'], temperature_2m_min: [11], temperature_2m_max: [24], weather_code: [0] },
  };

  it('asks for every variable the widget can render', async () => {
    mockGrab.mockResolvedValue(payload as never);

    await openMeteoProvider.fetchForecast(request);

    const url = new URL(requestedUrl(mockGrab.mock.calls[0] as never));
    expect(url.searchParams.get('hourly')).toContain('precipitation_probability');
    expect(url.searchParams.get('daily')).toContain('wind_speed_10m_max');
    expect(url.searchParams.get('timezone')).toBe('UTC');
    expect(url.searchParams.get('forecast_days')).toBe('3');
  });

  it('retries a rejected query with only the variables every model supports', async () => {
    // A 400 here means the endpoint refused one of the optional variables --
    // exactly the failure that used to reach the widget as
    // `Error: Weather request failed: 400 Bad Request`.
    mockGrab
      .mockResolvedValueOnce({ error: 'HTTP error: 400 Bad Request' } as never)
      .mockResolvedValueOnce(payload as never);

    const data = await openMeteoProvider.fetchForecast(request);

    const retried = new URL(requestedUrl(mockGrab.mock.calls[1] as never));
    expect(retried.searchParams.get('hourly')).toBe('temperature_2m,weather_code');
    expect(retried.searchParams.get('daily')).not.toContain('precipitation_probability_max');
    expect(data.current.temperature).toBe(21);
  });

  it('drops the range and zone parameters when the minimal query is refused too', async () => {
    mockGrab
      .mockResolvedValueOnce({ error: 'HTTP error: 400 Bad Request' } as never)
      .mockResolvedValueOnce({ error: 'HTTP error: 400 Bad Request' } as never)
      .mockResolvedValueOnce(payload as never);

    const data = await openMeteoProvider.fetchForecast(request);

    const last = new URL(requestedUrl(mockGrab.mock.calls[2] as never));
    expect(last.searchParams.get('forecast_hours')).toBeNull();
    expect(last.searchParams.get('timezone')).toBe('auto');
    // The units are never dropped: the numbers would keep arriving and start
    // meaning something else.
    expect(last.searchParams.get('temperature_unit')).toBe('celsius');
    expect(data.current.temperature).toBe(21);
  });

  it('gives up once every query shape is refused', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 400 Bad Request' } as never);

    await expect(openMeteoProvider.fetchForecast(request)).rejects.toThrow('400 Bad Request');
    expect(mockGrab).toHaveBeenCalledTimes(3);
  });

  it('hands a rate limit straight to the next provider instead of shrinking the query', async () => {
    mockGrab.mockResolvedValue({ error: 'HTTP error: 429 Too Many Requests' } as never);

    await expect(openMeteoProvider.fetchForecast(request)).rejects.toThrow('429 Too Many Requests');
    // One shape, repeated by the transport's own backoff (3 attempts by
    // default) -- the query is not the problem, so it is never shrunk.
    expect(mockGrab).toHaveBeenCalledTimes(3);
  });
});

describe('met.no provider', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requests the compact endpoint with the rounded coordinates', async () => {
    mockGrab.mockResolvedValue(metNoResponse() as never);

    await metNoProvider.fetchForecast(request);

    expect(requestedUrl(mockGrab.mock.calls[0] as never)).toBe(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=30.27&lon=-97.74'
    );
  });

  it('normalizes the payload into the widget shape', async () => {
    mockGrab.mockResolvedValue(metNoResponse() as never);

    const data = await metNoProvider.fetchForecast(request);

    expect(data.current).toMatchObject({ time: '2024-01-01T00:00', temperature: 10, weatherCode: 0, icon: 'sun' });
    expect(data.hourly).toHaveLength(6);
    expect(data.hourly[1]).toMatchObject({ time: '2024-01-01T01:00', weatherCode: 61, precipitationProbability: 60 });
    expect(data.daily[0]).toMatchObject({ date: '2024-01-01' });
    expect(data.daily.length).toBeGreaterThan(0);
  });

  it('converts to the requested units', async () => {
    mockGrab.mockResolvedValue(metNoResponse() as never);

    const data = await metNoProvider.fetchForecast({
      ...request,
      temperatureUnit: 'fahrenheit',
      windSpeedUnit: 'mph',
    });

    // 10C is 50F; 3 m/s is 6.7 mph.
    expect(data.current.temperature).toBe(50);
    expect(data.current.windSpeed).toBe(6.7);
  });

  it('rejects a response with no timeseries', async () => {
    mockGrab.mockResolvedValue({ properties: { timeseries: [] } } as never);

    await expect(metNoProvider.fetchForecast(request)).rejects.toThrow('Invalid weather response');
  });
});

describe('wttr.in provider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('requests the JSON format for the coordinates', async () => {
    mockGrab.mockResolvedValue(wttrResponse() as never);

    await wttrProvider.fetchForecast(request);

    expect(requestedUrl(mockGrab.mock.calls[0] as never)).toBe(
      'https://wttr.in/30.27,-97.74?format=j1&lang=en'
    );
  });

  it('starts the hourly series at the current hour, like Open-Meteo does', async () => {
    mockGrab.mockResolvedValue(wttrResponse() as never);

    const data = await wttrProvider.fetchForecast(request);

    expect(data.hourly[0].time).toBe('2024-01-01T12:00');
    expect(data.hourly).toHaveLength(6);
  });

  it('normalizes conditions, units and the location', async () => {
    mockGrab.mockResolvedValue(wttrResponse() as never);

    const data = await wttrProvider.fetchForecast(request);

    expect(data.current).toMatchObject({ temperature: 18, weatherCode: 2, icon: 'cloud-sun' });
    // 18 km/h is 5 m/s.
    expect(data.current.windSpeed).toBe(5);
    expect(data.location?.region).toBe('Texas');
    expect(data.daily).toHaveLength(3);
    expect(data.daily[0]).toMatchObject({ date: '2024-01-01', min: 11, max: 24 });
  });

  it('reads Fahrenheit straight from the payload when asked for it', async () => {
    mockGrab.mockResolvedValue(wttrResponse() as never);

    const data = await wttrProvider.fetchForecast({ ...request, temperatureUnit: 'fahrenheit' });

    expect(data.current.temperature).toBe(64);
    expect(data.daily[0]).toMatchObject({ min: 52, max: 75 });
  });

  it('rejects a response with no forecast in it', async () => {
    mockGrab.mockResolvedValue({ current_condition: [{ temp_C: '18' }] } as never);

    await expect(wttrProvider.fetchForecast(request)).rejects.toThrow('Invalid weather response');
  });
});

describe('resolveWeatherProviders', () => {
  it('defaults to the whole chain', () => {
    expect(resolveWeatherProviders().map((provider) => provider.id)).toEqual([
      'open-meteo',
      'open-meteo-gfs',
      'met-no',
      'wttr',
    ]);
  });

  it('resolves ids in the given order', () => {
    expect(resolveWeatherProviders(['wttr', 'open-meteo']).map((p) => p.id)).toEqual(['wttr', 'open-meteo']);
  });

  it('keeps a custom provider object', () => {
    const custom = { id: 'custom', label: 'Custom', fetchForecast: vi.fn() };
    expect(resolveWeatherProviders([custom])).toEqual([custom]);
  });

  it('falls back to the default chain for ids it does not know', () => {
    expect(resolveWeatherProviders(['nope']).map((p) => p.id)).toEqual([
      'open-meteo',
      'open-meteo-gfs',
      'met-no',
      'wttr',
    ]);
  });
});

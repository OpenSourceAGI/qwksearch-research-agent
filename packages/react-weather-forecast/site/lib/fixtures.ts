/**
 * @file fixtures.ts
 * @description Deterministic weather for Storybook, the docs' previews and the
 * playground's "sample data" mode.
 *
 * `weatherProviders` accepts provider objects as well as ids, so a fixture is
 * just a {@link WeatherProvider} that answers from memory: the component, the
 * hook, unit conversion and validation all run exactly as they do against
 * Open-Meteo, with no network and no rate limit to spend.
 *
 * The forecast cache is keyed by coordinates and units, not by provider, so
 * every fixture scenario has coordinates of its own that no live preset uses
 * -- otherwise a live forecast could be served for a fixture story (or the
 * other way round) from `localStorage`.
 */
import {
  getWeatherIcon,
  type DailyWeather,
  type ForecastRequest,
  type HourlyWeather,
  type WeatherForecastData,
  type WeatherProvider,
} from 'use-weather-forecast';

export type Scenario = 'sunny' | 'rainy' | 'snowy' | 'stormy';

type ScenarioSpec = {
  city: string;
  region: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
  /** Daily highs in Celsius; lows sit `spread` below. */
  highs: number[];
  spread: number;
  /** WMO weather codes, one per day. */
  codes: number[];
  /** Precipitation chance per day, 0-100. */
  rain: number[];
  /** Peak wind per day, km/h. */
  wind: number[];
};

export const SCENARIOS: Record<Scenario, ScenarioSpec> = {
  sunny: {
    city: 'Phoenix',
    region: 'Arizona',
    country: 'US',
    timezone: 'America/Phoenix',
    latitude: 33.4484,
    longitude: -112.074,
    highs: [34, 36, 35, 33, 31, 32, 34],
    spread: 14,
    codes: [0, 0, 1, 2, 0, 1, 0],
    rain: [0, 0, 0, 2, 0, 0, 1],
    wind: [12, 15, 18, 10, 9, 14, 11],
  },
  rainy: {
    city: 'Seattle',
    region: 'Washington',
    country: 'US',
    timezone: 'America/Los_Angeles',
    latitude: 47.6062,
    longitude: -122.3321,
    highs: [12, 11, 13, 10, 12, 14, 13],
    spread: 5,
    codes: [61, 63, 80, 3, 51, 2, 61],
    rain: [80, 90, 65, 30, 55, 15, 70],
    wind: [22, 28, 19, 14, 17, 11, 20],
  },
  snowy: {
    city: 'Reykjavík',
    region: 'Capital Region',
    country: 'IS',
    timezone: 'Atlantic/Reykjavik',
    latitude: 64.1466,
    longitude: -21.9426,
    highs: [-2, -4, -1, 0, -3, -5, -2],
    spread: 5,
    codes: [73, 75, 71, 3, 85, 77, 45],
    rain: [70, 85, 60, 20, 75, 50, 10],
    wind: [30, 41, 26, 18, 33, 37, 15],
  },
  stormy: {
    city: 'Miami',
    region: 'Florida',
    country: 'US',
    timezone: 'America/New_York',
    latitude: 25.7617,
    longitude: -80.1918,
    highs: [31, 30, 29, 31, 32, 30, 31],
    spread: 6,
    codes: [95, 96, 82, 2, 95, 80, 1],
    rain: [85, 95, 75, 20, 70, 60, 10],
    wind: [35, 48, 30, 16, 29, 24, 14],
  },
};

export const SCENARIO_NAMES = Object.keys(SCENARIOS) as Scenario[];

/** Real places for the live (Open-Meteo) variants. None match a fixture. */
export const LIVE_CITIES = [
  { label: 'San Francisco', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' },
  { label: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { label: 'London', latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London' },
  { label: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { label: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { label: 'Nairobi', latitude: -1.2921, longitude: 36.8219, timezone: 'Africa/Nairobi' },
] as const;

/** A scenario's place, as the component's location props. */
export function scenarioLocation(scenario: Scenario) {
  const spec = SCENARIOS[scenario];
  return {
    latitude: spec.latitude,
    longitude: spec.longitude,
    location: { city: spec.city, region: spec.region, country: spec.country, timezone: spec.timezone },
  };
}

const toUnit = (celsius: number, unit: ForecastRequest['temperatureUnit']) =>
  Math.round(unit === 'fahrenheit' ? (celsius * 9) / 5 + 32 : celsius);

const KMH_TO: Record<ForecastRequest['windSpeedUnit'], number> = { kmh: 1, mph: 0.621371, ms: 1 / 3.6, kn: 0.539957 };

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoHour = (d: Date) => `${isoDate(d)}T${pad(d.getHours())}:00`;

/** A forecast for `scenario`, shaped and sized by the validated request. */
export function fixtureForecast(request: ForecastRequest, scenario: Scenario): WeatherForecastData {
  const spec = SCENARIOS[scenario];
  const unit = request.temperatureUnit;
  const wind = (kmh: number) => Math.round(kmh * KMH_TO[request.windSpeedUnit] * 10) / 10;
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const daily: DailyWeather[] = Array.from({ length: request.forecastDays }, (_, i) => {
    const k = i % spec.highs.length;
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    return {
      date: isoDate(date),
      max: toUnit(spec.highs[k], unit),
      min: toUnit(spec.highs[k] - spec.spread, unit),
      weatherCode: spec.codes[k],
      icon: getWeatherIcon(spec.codes[k]),
      precipitationProbabilityMax: spec.rain[k],
      precipitationSum: Math.round((spec.rain[k] / 12) * 10) / 10,
      windSpeedMax: wind(spec.wind[k]),
    };
  });

  const hourly: HourlyWeather[] = Array.from({ length: request.forecastHours }, (_, i) => {
    const time = new Date(now);
    time.setHours(now.getHours() + i);
    const day = Math.min(Math.floor(i / 24), spec.highs.length - 1);
    // A gentle daily curve: coolest around 5am, warmest around 3pm.
    const swing = Math.cos(((time.getHours() - 15) / 24) * 2 * Math.PI);
    const celsius = spec.highs[day] - spec.spread / 2 + (swing * spec.spread) / 2;
    const isDay = time.getHours() >= 7 && time.getHours() < 19 ? 1 : 0;
    return {
      time: isoHour(time),
      temperature: toUnit(celsius, unit),
      weatherCode: spec.codes[day],
      icon: getWeatherIcon(spec.codes[day], isDay),
      precipitationProbability: Math.max(0, spec.rain[day] - ((i * 7) % 25)),
    };
  });

  const nowHour = hourly[0];
  return {
    location: { ...request.location, timezone: request.location.timezone ?? spec.timezone },
    current: {
      time: nowHour?.time ?? isoHour(now),
      temperature: nowHour?.temperature ?? toUnit(spec.highs[0], unit),
      weatherCode: spec.codes[0],
      icon: getWeatherIcon(spec.codes[0], now.getHours() >= 7 && now.getHours() < 19 ? 1 : 0),
      windSpeed: wind(spec.wind[0] * 0.7),
    },
    hourly,
    daily,
  };
}

/**
 * The scenario whose place the request is for. Keeps one place's weather the
 * same whichever fixture provider answered, since the cache is keyed by place.
 */
function scenarioAt(request: ForecastRequest): Scenario | undefined {
  const { latitude, longitude } = request.location;
  return SCENARIO_NAMES.find(
    (name) => Math.abs(SCENARIOS[name].latitude - latitude) < 1e-3 && Math.abs(SCENARIOS[name].longitude - longitude) < 1e-3
  );
}

/**
 * A provider that answers from {@link fixtureForecast}, after `delayMs`.
 * A request for one of the scenarios' own places gets that place's weather;
 * anywhere else gets `scenario`'s.
 */
export function fixtureProvider(scenario: Scenario, delayMs = 150): WeatherProvider {
  return {
    id: `fixture-${scenario}`,
    label: `Sample data (${scenario})`,
    fetchForecast: (request) =>
      new Promise((resolve) =>
        setTimeout(() => resolve(fixtureForecast(request, scenarioAt(request) ?? scenario)), delayMs)
      ),
  };
}

/** Every scenario's place, for the multi-location variants. */
export const SCENARIO_LOCATIONS = SCENARIO_NAMES.map((name) => ({
  label: SCENARIOS[name].city,
  latitude: SCENARIOS[name].latitude,
  longitude: SCENARIOS[name].longitude,
  timezone: SCENARIOS[name].timezone,
}));

/** Every upstream down at once: what the widget shows once its reloads are spent. */
export const failingProviders: WeatherProvider[] = [
  {
    id: 'fixture-down-1',
    label: 'Open-Meteo',
    fetchForecast: async () => {
      throw new Error('Weather request failed: 503 Service Unavailable');
    },
  },
  {
    id: 'fixture-down-2',
    label: 'met.no',
    fetchForecast: async () => {
      throw new Error('Weather request failed: 429 Too Many Requests');
    },
  },
];

/** Coordinates no fixture or live preset shares, for the error variant. */
export const OFFLINE_LOCATION = { latitude: 0.0001, longitude: 0.0001, location: { city: 'Nowhere' } };

/** Coordinates for the loading variant, so no cached forecast short-circuits it. */
export const PENDING_LOCATION = { latitude: 0.0002, longitude: 0.0002, location: { city: 'Loading' } };

/** Never answers, so the widget stays in its loading state. */
export const pendingProvider: WeatherProvider = {
  id: 'fixture-pending',
  label: 'Never answers',
  fetchForecast: () => new Promise(() => {}),
};

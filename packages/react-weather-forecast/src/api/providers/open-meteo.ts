import type { WeatherForecastData } from '../../types';
import { getWeatherIcon } from '../../weatherCodes';
import { grabJson, HttpRequestError } from '../http';
import type { ForecastRequest, WeatherProvider } from './types';

/** Every variable the widget can render. */
const FULL_VARIABLES = {
  current: ['temperature_2m', 'weather_code', 'is_day', 'rain', 'showers', 'snowfall', 'wind_speed_10m'],
  hourly: ['temperature_2m', 'weather_code', 'precipitation_probability', 'rain', 'showers', 'snowfall'],
  daily: [
    'temperature_2m_max',
    'temperature_2m_min',
    'weather_code',
    'precipitation_probability_max',
    'precipitation_sum',
    'wind_speed_10m_max',
  ],
};

/**
 * The subset every Open-Meteo model endpoint supports. Some models (and some
 * of the free API's mirrors) reject one of the optional variables above with a
 * flat `400 Bad Request`, so a rejected query is repeated once with only what
 * the widget cannot render without.
 */
const MINIMAL_VARIABLES = {
  current: ['temperature_2m', 'weather_code', 'is_day'],
  hourly: ['temperature_2m', 'weather_code'],
  daily: ['temperature_2m_max', 'temperature_2m_min', 'weather_code'],
};

type Variables = typeof FULL_VARIABLES;

export type OpenMeteoQuery = {
  /** default=FULL_VARIABLES Which variables to ask for. */
  variables?: Variables;
  /**
   * default=false Leave out the range and zone parameters an endpoint can
   * refuse on their own: `forecast_hours`, and a `timezone` other than `auto`.
   *
   * Only parameters that cannot change what the numbers *mean* are dropped --
   * the units stay, since a Celsius body read as Fahrenheit would render a
   * plausible, wrong temperature rather than an error.
   */
  omitOptional?: boolean;
};

export function buildOpenMeteoUrl(
  endpoint: string,
  request: ForecastRequest,
  query: OpenMeteoQuery | Variables = {}
): string {
  // Historically this took the variables directly; both shapes are accepted.
  const { variables = FULL_VARIABLES, omitOptional = false } =
    'current' in query ? { variables: query as Variables } : (query as OpenMeteoQuery);

  const params = new URLSearchParams({
    latitude: String(request.location.latitude),
    longitude: String(request.location.longitude),
    timezone: omitOptional ? 'auto' : request.timezone || 'auto',
    temperature_unit: request.temperatureUnit,
    wind_speed_unit: request.windSpeedUnit,
    forecast_days: String(request.forecastDays),
    ...(omitOptional ? {} : { forecast_hours: String(request.forecastHours) }),
    current: variables.current.join(','),
    hourly: variables.hourly.join(','),
    daily: variables.daily.join(','),
  });

  return `${endpoint}?${params.toString()}`;
}

/** Shape the widget needs; anything else in the payload is ignored. */
type OpenMeteoResponse = {
  timezone?: string;
  current?: Record<string, number | string>;
  hourly?: Record<string, (number | null)[] | string[]>;
  daily?: Record<string, (number | null)[] | string[]>;
};

function parse(data: OpenMeteoResponse, request: ForecastRequest): WeatherForecastData {
  if (!data?.current || !data?.hourly || !data?.daily) {
    throw new Error('Invalid weather response');
  }

  const current = data.current as Record<string, number>;
  const hourly = data.hourly as Record<string, number[]> & { time: string[] };
  const daily = data.daily as Record<string, number[]> & { time: string[] };

  return {
    location: {
      ...request.location,
      timezone: (data.timezone as string) || request.location.timezone,
    },
    current: {
      time: current.time as unknown as string,
      temperature: Math.round(current.temperature_2m),
      weatherCode: current.weather_code,
      icon: getWeatherIcon(current.weather_code, current.is_day),
      isDay: current.is_day,
      rain: current.rain,
      showers: current.showers,
      snowfall: current.snowfall,
      windSpeed: current.wind_speed_10m,
    },
    hourly: hourly.time.map((time, index) => ({
      time,
      temperature: Math.round(hourly.temperature_2m[index]),
      weatherCode: hourly.weather_code[index],
      precipitationProbability: hourly.precipitation_probability?.[index],
      rain: hourly.rain?.[index],
      showers: hourly.showers?.[index],
      snowfall: hourly.snowfall?.[index],
      icon: getWeatherIcon(hourly.weather_code[index]),
    })),
    daily: daily.time.map((date, index) => ({
      date,
      min: Math.round(daily.temperature_2m_min[index]),
      max: Math.round(daily.temperature_2m_max[index]),
      weatherCode: daily.weather_code[index],
      precipitationProbabilityMax: daily.precipitation_probability_max?.[index],
      precipitationSum: daily.precipitation_sum?.[index],
      windSpeedMax: daily.wind_speed_10m_max?.[index],
      icon: getWeatherIcon(daily.weather_code[index]),
    })),
  };
}

/**
 * Open-Meteo, the package's primary source.
 *
 * @param id Provider id, e.g. `open-meteo`.
 * @param label Name used in the aggregated error message.
 * @param endpoint Full endpoint URL; the model endpoints (`/v1/gfs` and
 *   friends) take the same query as `/v1/forecast`.
 */
export function createOpenMeteoProvider(id: string, label: string, endpoint: string): WeatherProvider {
  return {
    id,
    label,
    async fetchForecast(request) {
      // Each shape asks for less than the last, so an endpoint that refused one
      // part of the query gets a turn at answering the rest before the request
      // is handed to the next provider: the full query, then only the variables
      // every model supports, then that without the range and zone parameters.
      const shapes: OpenMeteoQuery[] = [
        {},
        { variables: MINIMAL_VARIABLES },
        { variables: MINIMAL_VARIABLES, omitOptional: true },
      ];

      let lastError: unknown;

      for (const [index, shape] of shapes.entries()) {
        try {
          const data = await grabJson<OpenMeteoResponse>(
            buildOpenMeteoUrl(endpoint, request, shape),
            'Weather request',
            request.transport
          );
          return parse(data, request);
        } catch (error) {
          lastError = error;

          // Only a query the endpoint called invalid is worth asking again in a
          // smaller shape. A body we could not parse, a rate limit or an
          // unreachable host is not a query problem, so it goes straight to the
          // next provider.
          if (!(error instanceof HttpRequestError)) throw error;
          const invalidQuery =
            error.status === 400 || /cannot initialize|invalid|not supported/i.test(error.message);
          if (!invalidQuery || index === shapes.length - 1) throw error;
        }
      }

      throw lastError;
    },
  };
}

/** `https://api.open-meteo.com/v1/forecast` -- the default, best-model source. */
export const openMeteoProvider = createOpenMeteoProvider(
  'open-meteo',
  'Open-Meteo',
  'https://api.open-meteo.com/v1/forecast'
);

/**
 * The GFS model endpoint on the same host. It answers when `/v1/forecast` is
 * rate-limited or refuses the query, and speaks exactly the same dialect.
 */
export const openMeteoGfsProvider = createOpenMeteoProvider(
  'open-meteo-gfs',
  'Open-Meteo (GFS)',
  'https://api.open-meteo.com/v1/gfs'
);

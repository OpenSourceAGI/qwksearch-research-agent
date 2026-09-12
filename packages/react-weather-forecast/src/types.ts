import type React from 'react';
import type { GeoProvider } from './api/geolocation';
import type { WeatherProvider } from './api/providers/types';

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'mph' | 'ms' | 'kn';

export type WeatherLocation = {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  latitude: number;
  longitude: number;
};

export type WeatherLocationInput = {
  label?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export type WeatherCondition =
  | 'sun'
  | 'cloud-sun'
  | 'clouds'
  | 'cloud-fog'
  | 'cloud-drizzle'
  | 'cloud-showers'
  | 'cloud-showers-heavy'
  | 'cloud-sleet'
  | 'cloud-snow'
  | 'snowflake'
  | 'cloud-bolt'
  | 'cloud-hail';

export type CurrentWeather = {
  time: string;
  temperature: number;
  weatherCode: number;
  icon: WeatherCondition;
  isDay?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  windSpeed?: number;
};

export type HourlyWeather = {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  icon: WeatherCondition;
};

export type DailyWeather = {
  date: string;
  min: number;
  max: number;
  weatherCode: number;
  precipitationProbabilityMax?: number;
  /** Total precipitation for the day, in millimetres. */
  precipitationSum?: number;
  /** Peak wind speed for the day, in the requested wind speed unit. */
  windSpeedMax?: number;
  icon: WeatherCondition;
};

export type WeatherForecastData = {
  location?: WeatherLocation;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
};

/** Ids of the weather upstreams bundled with the package. */
export type WeatherProviderId = 'open-meteo' | 'open-meteo-gfs' | 'met-no' | 'wttr';

/** Ids of the IP geolocation upstreams bundled with the package. */
export type GeoProviderId = 'ipapi' | 'ipwho' | 'geojs' | 'freeipapi';

export type WeatherForecastOptions = {
  latitude?: number;
  longitude?: number;
  location?: Partial<WeatherLocation>;
  locations?: WeatherLocationInput[];
  geoEndpoint?: string;
  ip?: string;
  /** default=5 Days of daily forecast, 1-16. Anything outside that is clamped. */
  forecastDays?: number;
  /** default=24 Hours of hourly forecast, 1-384. Anything outside that is clamped. */
  forecastHours?: number;
  temperatureUnit?: TemperatureUnit;
  windSpeedUnit?: WindSpeedUnit;
  /**
   * default=['open-meteo', 'open-meteo-gfs', 'met-no', 'wttr'] Weather
   * upstreams, tried in order until one answers.
   */
  weatherProviders?: (WeatherProviderId | WeatherProvider)[];
  /**
   * default=['ipapi', 'ipwho', 'geojs', 'freeipapi'] IP geolocation upstreams,
   * tried in order. `geoEndpoint`, when given, is always tried first.
   */
  geoProviders?: (GeoProviderId | GeoProvider)[];
  /** default=3 Tries per upstream request before it is treated as failed. */
  retryAttempts?: number;
  /** default=400 Milliseconds before the first retry; each further wait doubles. */
  retryDelay?: number;
  /** default=15 Seconds before a single request is aborted. */
  timeout?: number;
  /** Used when every geolocation provider failed, instead of throwing. */
  fallbackLocation?: Partial<WeatherLocation>;
  /**
   * default=true Serve a cached forecast up to a day old when every weather
   * provider failed, rather than throwing.
   */
  allowStaleCache?: boolean;
  /**
   * default=2 Whole reloads the component attempts after a load that failed on
   * every provider, on top of the per-request retries. It stays in the loading
   * state in between, so a failure that clears on its own never reaches the
   * user. `0` surfaces the error as soon as the first load fails.
   */
  reloadAttempts?: number;
  /** default=3000 Milliseconds before the first reload; each further wait doubles. */
  reloadDelay?: number;
  /** Called for each upstream that failed, before the next one is tried. */
  onProviderError?: (info: {
    provider: string;
    error: Error;
    stage: 'geolocation' | 'forecast';
  }) => void;
};

export type IconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

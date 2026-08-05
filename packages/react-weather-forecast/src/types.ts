import type React from 'react';

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
  icon: WeatherCondition;
};

export type WeatherForecastData = {
  location?: WeatherLocation;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
};

export type WeatherForecastOptions = {
  latitude?: number;
  longitude?: number;
  location?: Partial<WeatherLocation>;
  geoEndpoint?: string;
  ip?: string;
  forecastDays?: number;
  forecastHours?: number;
  temperatureUnit?: TemperatureUnit;
  windSpeedUnit?: WindSpeedUnit;
};

export type IconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

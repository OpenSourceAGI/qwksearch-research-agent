import type { WeatherForecastData, WeatherForecastOptions, WeatherLocation } from '../types';
import { getWeatherIcon } from '../weatherCodes';
import { getClientLocation } from './geolocation';
import { readCachedForecast, writeCachedForecast } from '../lib/cache';

function buildUrl(latitude: number, longitude: number, options: WeatherForecastOptions) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: options.location?.timezone || 'auto',
    temperature_unit: options.temperatureUnit || 'fahrenheit',
    wind_speed_unit: options.windSpeedUnit || 'mph',
    forecast_days: String(options.forecastDays ?? 5),
    forecast_hours: String(options.forecastHours ?? 24),
    current: [
      'temperature_2m',
      'weather_code',
      'is_day',
      'rain',
      'showers',
      'snowfall',
      'wind_speed_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'weather_code',
      'precipitation_probability',
      'rain',
      'showers',
      'snowfall',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'weather_code',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
    ].join(','),
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export async function getWeatherForecast(
  options: WeatherForecastOptions = {}
): Promise<WeatherForecastData> {
  let location: WeatherLocation;

  if (typeof options.latitude === 'number' && typeof options.longitude === 'number') {
    location = {
      ...options.location,
      latitude: options.latitude,
      longitude: options.longitude,
    };
  } else {
    location = await getClientLocation(options.geoEndpoint, options.ip);
  }

  const url = buildUrl(location.latitude, location.longitude, { ...options, location });

  const cached = readCachedForecast<WeatherForecastData>(url);
  if (cached) return cached;

  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });

  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data?.current || !data?.hourly || !data?.daily) {
    throw new Error('Invalid weather response');
  }

  const result: WeatherForecastData = {
    location: { ...location, timezone: data.timezone || location.timezone },
    current: {
      time: data.current.time,
      temperature: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
      icon: getWeatherIcon(data.current.weather_code, data.current.is_day),
      isDay: data.current.is_day,
      rain: data.current.rain,
      showers: data.current.showers,
      snowfall: data.current.snowfall,
      windSpeed: data.current.wind_speed_10m,
    },
    hourly: data.hourly.time.map((time: string, index: number) => ({
      time,
      temperature: Math.round(data.hourly.temperature_2m[index]),
      weatherCode: data.hourly.weather_code[index],
      precipitationProbability: data.hourly.precipitation_probability?.[index],
      rain: data.hourly.rain?.[index],
      showers: data.hourly.showers?.[index],
      snowfall: data.hourly.snowfall?.[index],
      icon: getWeatherIcon(data.hourly.weather_code[index]),
    })),
    daily: data.daily.time.map((date: string, index: number) => ({
      date,
      min: Math.round(data.daily.temperature_2m_min[index]),
      max: Math.round(data.daily.temperature_2m_max[index]),
      weatherCode: data.daily.weather_code[index],
      precipitationProbabilityMax: data.daily.precipitation_probability_max?.[index],
      precipitationSum: data.daily.precipitation_sum?.[index],
      windSpeedMax: data.daily.wind_speed_10m_max?.[index],
      icon: getWeatherIcon(data.daily.weather_code[index]),
    })),
  };

  writeCachedForecast(url, result);
  return result;
}

import type { WeatherCondition } from './types';

export function getWeatherIcon(code: number, isDay = 1): WeatherCondition {
  if (code === 0) return 'sun';
  if ([1, 2].includes(code)) return isDay ? 'cloud-sun' : 'clouds';
  if (code === 3) return 'clouds';
  if ([45, 48].includes(code)) return 'cloud-fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'cloud-drizzle';
  if ([61, 63].includes(code)) return 'cloud-showers';
  if ([65, 66, 67, 80, 81, 82].includes(code)) return 'cloud-showers-heavy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'cloud-snow';
  if (code === 95) return 'cloud-bolt';
  if ([96, 99].includes(code)) return 'cloud-hail';
  return 'clouds';
}

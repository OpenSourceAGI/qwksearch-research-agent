import { useEffect, useState } from 'react';
import type { WeatherForecastData, WeatherForecastOptions } from '../types';
import { getWeatherForecast } from '../api/forecast';

export function useWeatherForecast(options: WeatherForecastOptions = {}) {
  const [data, setData] = useState<WeatherForecastData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getWeatherForecast(options)
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err : new Error('Unknown error')); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [
    options.latitude,
    options.longitude,
    options.geoEndpoint,
    options.ip,
    options.forecastDays,
    options.forecastHours,
    options.temperatureUnit,
    options.windSpeedUnit,
    options.location?.timezone,
  ]);

  return { data, error, loading };
}

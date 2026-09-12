import { useEffect, useState } from 'react';
import type { WeatherForecastData, WeatherForecastOptions } from '../types';
import { getWeatherForecast } from '../api/forecast';

/**
 * default=2 Whole reloads attempted after a failed load, on top of the retries
 * each upstream request already does for itself.
 *
 * The chain below a single `getWeatherForecast` is already deep -- every
 * provider, every query shape, every transport attempt -- so a failure that
 * reaches here means all of it failed at once. That is nearly always something
 * that clears on its own (a flaky network on first paint, every free upstream
 * rate-limited in the same second), and a widget that heals itself a few
 * seconds later is worth more than one that shows `Error: ...` until the page
 * is reloaded by hand.
 */
const DEFAULT_RELOAD_ATTEMPTS = 2;

/** default=3000 Milliseconds before the first reload; each further wait doubles. */
const DEFAULT_RELOAD_DELAY_MS = 3000;

/** Provider lists are usually inline arrays, so the effect keys off their ids. */
function providerKey(options: WeatherForecastOptions): string {
  const ids = (list: WeatherForecastOptions['weatherProviders'] | WeatherForecastOptions['geoProviders']) =>
    (list ?? []).map((provider) => (typeof provider === 'string' ? provider : provider.id)).join(',');

  return `${ids(options.weatherProviders)}|${ids(options.geoProviders)}`;
}

/**
 * Everything that changes what would be fetched, as one string.
 *
 * The effect keys off this rather than a long dependency array so the reload
 * counter can be reset in the same step: a different key is a different
 * forecast, which gets its own fresh set of reload attempts.
 */
function requestKey(options: WeatherForecastOptions): string {
  return [
    options.latitude,
    options.longitude,
    options.location?.latitude,
    options.location?.longitude,
    options.geoEndpoint,
    options.ip,
    options.forecastDays,
    options.forecastHours,
    options.temperatureUnit,
    options.windSpeedUnit,
    options.location?.timezone,
    options.retryAttempts,
    options.retryDelay,
    options.timeout,
    options.allowStaleCache,
    options.reloadAttempts,
    options.reloadDelay,
    options.fallbackLocation?.latitude,
    options.fallbackLocation?.longitude,
    providerKey(options),
  ].join('|');
}

/**
 * Fetch a forecast for `options`, refetching whenever they change.
 *
 * The last good forecast is kept while a refetch is in flight *and* if that
 * refetch fails, so a rate-limited upstream leaves the widget showing the
 * previous data rather than replacing it with an error. A first load that
 * fails outright is retried `reloadAttempts` times with a growing pause, and
 * stays in the loading state while a retry is pending -- the widget renders
 * nothing for a few seconds rather than flashing an error it is about to
 * recover from.
 */
export function useWeatherForecast(options: WeatherForecastOptions = {}) {
  const [data, setData] = useState<WeatherForecastData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadAttempts = Math.max(0, Math.trunc(options.reloadAttempts ?? DEFAULT_RELOAD_ATTEMPTS));
  const reloadDelay = Math.max(0, options.reloadDelay ?? DEFAULT_RELOAD_DELAY_MS);

  const key = requestKey(options);
  // `reload` is bumped to run the effect again; a key change resets it during
  // render, so the new request starts from a full set of attempts without
  // firing a throwaway fetch on the old key first.
  const [reload, setReload] = useState({ key, count: 0 });
  if (reload.key !== key) setReload({ key, count: 0 });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setError(null);

    getWeatherForecast(options)
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error('Unknown error'));

        if (reload.count >= reloadAttempts) {
          setLoading(false);
          return;
        }

        // Exponential backoff: 1x, 2x, 4x ... of the configured delay. Loading
        // stays on so the widget waits for the retry instead of rendering an
        // error between the two.
        timer = setTimeout(
          () => setReload((current) => ({ key: current.key, count: current.count + 1 })),
          reloadDelay * 2 ** reload.count
        );
      });

    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands in
    // for every option that changes what is fetched; see `requestKey`.
  }, [key, reload.count]);

  return { data, error, loading };
}

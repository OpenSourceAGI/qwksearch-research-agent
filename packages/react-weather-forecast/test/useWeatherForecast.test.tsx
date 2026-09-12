import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeatherForecast } from '../src/hooks/useWeatherForecast';
import * as forecastApi from '../src/api/forecast';
import type { WeatherForecastData } from '../src/types';

const FORECAST = {
  location: { city: 'Austin', latitude: 30.27, longitude: -97.74 },
  current: { time: '2024-01-01T12:00', temperature: 72, weatherCode: 0, icon: 'sun', isDay: 1 },
  hourly: [],
  daily: [],
} as unknown as WeatherForecastData;

describe('useWeatherForecast', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in the loading state', () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWeatherForecast({ latitude: 1, longitude: 2 }));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes the resolved forecast and clears loading', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(FORECAST);

    const { result } = renderHook(() => useWeatherForecast({ latitude: 1, longitude: 2 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(FORECAST);
    expect(result.current.error).toBeNull();
  });

  it('forwards the options through to getWeatherForecast', async () => {
    const spy = vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(FORECAST);

    const { result } = renderHook(() =>
      useWeatherForecast({ latitude: 1, longitude: 2, temperatureUnit: 'celsius' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 1, longitude: 2, temperatureUnit: 'celsius' })
    );
  });

  it('surfaces a rejection as an Error', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() =>
      useWeatherForecast({ latitude: 1, longitude: 2, reloadAttempts: 0 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('network down');
    expect(result.current.data).toBeNull();
  });

  it('wraps a non-Error rejection value', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockRejectedValue('just a string');

    const { result } = renderHook(() =>
      useWeatherForecast({ latitude: 1, longitude: 2, reloadAttempts: 0 })
    );

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('Unknown error');
  });

  it('refetches when the coordinates change', async () => {
    const spy = vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(FORECAST);

    const { result, rerender } = renderHook((props: { latitude: number }) => useWeatherForecast(props), {
      initialProps: { latitude: 1 },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ latitude: 5 });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it('does not refetch when an unrelated option object identity changes', async () => {
    const spy = vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(FORECAST);

    const { result, rerender } = renderHook(() => useWeatherForecast({ latitude: 1, longitude: 2 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('ignores a resolution that lands after unmount', async () => {
    let resolve!: (value: WeatherForecastData) => void;
    vi.spyOn(forecastApi, 'getWeatherForecast').mockReturnValue(
      new Promise<WeatherForecastData>((r) => {
        resolve = r;
      })
    );

    const { result, unmount } = renderHook(() => useWeatherForecast({ latitude: 1, longitude: 2 }));
    unmount();
    resolve(FORECAST);

    // No state update should be attempted after unmount; the last observed
    // render still shows the initial loading state.
    expect(result.current.data).toBeNull();
  });

  describe('reloading a failed load', () => {
    it('recovers without an error when a reload succeeds', async () => {
      const spy = vi
        .spyOn(forecastApi, 'getWeatherForecast')
        .mockRejectedValueOnce(new Error('every provider failed'))
        .mockResolvedValue(FORECAST);

      const { result } = renderHook(() =>
        useWeatherForecast({ latitude: 1, longitude: 2, reloadDelay: 0 })
      );

      await waitFor(() => expect(result.current.data).toEqual(FORECAST));
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('stays in the loading state while a reload is pending', async () => {
      vi.spyOn(forecastApi, 'getWeatherForecast').mockRejectedValue(new Error('every provider failed'));

      const { result } = renderHook(() =>
        useWeatherForecast({ latitude: 1, longitude: 2, reloadDelay: 60_000 })
      );

      // The error is recorded, but the widget is told to keep waiting rather
      // than render something it is about to recover from.
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.loading).toBe(true);
    });

    it('gives up after the configured number of reloads', async () => {
      const spy = vi
        .spyOn(forecastApi, 'getWeatherForecast')
        .mockRejectedValue(new Error('every provider failed'));

      const { result } = renderHook(() =>
        useWeatherForecast({ latitude: 1, longitude: 2, reloadDelay: 0, reloadAttempts: 2 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      // The first load plus its two reloads.
      expect(spy).toHaveBeenCalledTimes(3);
      expect(result.current.error?.message).toBe('every provider failed');
    });

    it('gives a changed request its own fresh set of reloads', async () => {
      const spy = vi
        .spyOn(forecastApi, 'getWeatherForecast')
        .mockRejectedValue(new Error('every provider failed'));

      const { result, rerender } = renderHook(
        (props: { latitude: number }) =>
          useWeatherForecast({ ...props, longitude: 2, reloadDelay: 0, reloadAttempts: 1 }),
        { initialProps: { latitude: 1 } }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(spy).toHaveBeenCalledTimes(2);

      spy.mockClear();
      rerender({ latitude: 40 });

      await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
      expect(spy.mock.calls.every(([options]) => options?.latitude === 40)).toBe(true);
    });
  });
});

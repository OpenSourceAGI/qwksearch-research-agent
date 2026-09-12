import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { getClientLocation } from '../src/api/geolocation';
import grab from 'grab-url';
import { requestedUrl } from './requested-url';

vi.mock('grab-url');
const mockGrab = grab as MockedFunction<typeof grab>;

/** grab-url resolves with the parsed body, or with `{ error }` when a request failed. */
function grabResolves(...responses: unknown[]) {
  for (const response of responses) mockGrab.mockResolvedValueOnce(response as never);
  return mockGrab;
}

/** No delay between tries: the repeat behaviour is what is under test, not the backoff. */
const noDelay = { retryDelay: 0 };

describe('getClientLocation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('via the bundled geo worker', () => {
    it('requests the endpoint and normalizes the payload', async () => {
      grabResolves({
        city: 'Austin',
        region: 'Texas',
        country: 'United States',
        timezone: 'America/Chicago',
        latitude: 30.27,
        longitude: -97.74,
      });

      const location = await getClientLocation('https://geo.example.workers.dev');

      expect(mockGrab.mock.calls[0][0]).toBe('https://geo.example.workers.dev');
      expect(location).toEqual({
        city: 'Austin',
        region: 'Texas',
        country: 'United States',
        timezone: 'America/Chicago',
        latitude: 30.27,
        longitude: -97.74,
      });
    });

    it('coerces string coordinates to numbers', async () => {
      grabResolves({ latitude: '30.27', longitude: '-97.74' });

      const location = await getClientLocation('https://geo.example.workers.dev');

      expect(location.latitude).toBe(30.27);
      expect(location.longitude).toBe(-97.74);
    });

    it('passes an explicit IP through as a URL-encoded query param', async () => {
      grabResolves({ latitude: 1, longitude: 2 });

      await getClientLocation('https://geo.example.workers.dev', '8.8.8.8');

      expect(requestedUrl(mockGrab.mock.calls[0] as never)).toBe(
        'https://geo.example.workers.dev?ip=8.8.8.8'
      );
    });

    it('throws with the status code when the worker errors', async () => {
      grabResolves({ error: 'HTTP error: 502 Bad Gateway' });

      await expect(
        getClientLocation('https://geo.example.workers.dev', undefined, { attempts: 1 })
      ).rejects.toThrow('Geolocation worker lookup failed: 502 Bad Gateway');
    });
  });

  describe('via ipapi.co (default)', () => {
    it('hits the json endpoint and maps country_name to country', async () => {
      grabResolves({
        city: 'Berlin',
        region: 'Berlin',
        country_name: 'Germany',
        timezone: 'Europe/Berlin',
        latitude: 52.52,
        longitude: 13.4,
      });

      const location = await getClientLocation();

      expect(mockGrab.mock.calls[0][0]).toBe('https://ipapi.co/json/');
      expect(location).toEqual({
        city: 'Berlin',
        region: 'Berlin',
        country: 'Germany',
        timezone: 'Europe/Berlin',
        latitude: 52.52,
        longitude: 13.4,
      });
    });

    it('scopes the lookup to an explicit IP', async () => {
      grabResolves({ latitude: 1, longitude: 2 });

      await getClientLocation(undefined, '1.1.1.1');

      expect(mockGrab.mock.calls[0][0]).toBe('https://ipapi.co/1.1.1.1/json/');
    });

    it('throws on a failed request', async () => {
      grabResolves({ error: 'HTTP error: 429 Too Many Requests' });

      await expect(getClientLocation(undefined, undefined, { attempts: 1 })).rejects.toThrow(
        'ipapi.co lookup failed: 429 Too Many Requests'
      );
    });

    it('throws on a 200 response carrying an error flag', async () => {
      grabResolves({ error: true, reason: 'RateLimited' });

      await expect(getClientLocation(undefined, undefined, { attempts: 1 })).rejects.toThrow(
        'ipapi.co lookup failed: RateLimited'
      );
    });

    it('falls back to a generic message when no reason is given', async () => {
      grabResolves({ error: true });

      await expect(getClientLocation(undefined, undefined, { attempts: 1 })).rejects.toThrow(
        'ipapi.co lookup failed: unknown error'
      );
    });

    it('throws when the response is empty', async () => {
      grabResolves(null);

      await expect(getClientLocation(undefined, undefined, { attempts: 1 })).rejects.toThrow(
        'ipapi.co lookup failed: empty response'
      );
    });
  });

  describe('repeating a failed lookup', () => {
    it('retries a rate-limited lookup and returns the first good response', async () => {
      grabResolves(
        { error: true, reason: 'RateLimited' },
        { city: 'Austin', latitude: 30.27, longitude: -97.74 }
      );

      const location = await getClientLocation(undefined, undefined, noDelay);

      expect(mockGrab).toHaveBeenCalledTimes(2);
      expect(location.city).toBe('Austin');
    });

    it('tries each provider twice by default before moving to the next one', async () => {
      mockGrab.mockResolvedValue({ error: true, reason: 'RateLimited' } as never);

      await expect(
        getClientLocation(undefined, undefined, { ...noDelay, providers: ['ipapi'] })
      ).rejects.toThrow('ipapi.co lookup failed: RateLimited');
      expect(mockGrab).toHaveBeenCalledTimes(2);
    });

    it('honours a custom attempt count', async () => {
      mockGrab.mockResolvedValue({ error: true, reason: 'RateLimited' } as never);

      await expect(
        getClientLocation(undefined, undefined, { attempts: 5, retryDelay: 0, providers: ['ipapi'] })
      ).rejects.toThrow('ipapi.co lookup failed: RateLimited');
      expect(mockGrab).toHaveBeenCalledTimes(5);
    });

    it('repeats a worker lookup too', async () => {
      grabResolves({ error: 'HTTP error: 502 Bad Gateway' }, { latitude: 1, longitude: 2 });

      const location = await getClientLocation('https://geo.example.workers.dev', undefined, noDelay);

      expect(mockGrab).toHaveBeenCalledTimes(2);
      expect(location.latitude).toBe(1);
    });

    it('does not repeat a lookup the provider rejected as invalid', async () => {
      mockGrab.mockResolvedValue({ error: 'HTTP error: 404 Not Found' } as never);

      await expect(
        getClientLocation(undefined, undefined, { ...noDelay, providers: ['ipapi'] })
      ).rejects.toThrow('ipapi.co lookup failed: 404 Not Found');
      expect(mockGrab).toHaveBeenCalledTimes(1);
    });

    it('waits between tries when a delay is configured', async () => {
      grabResolves({ error: true, reason: 'RateLimited' }, { latitude: 1, longitude: 2 });

      // The delay asked for, not the time that passed -- see the note on
      // `recordDelays` in http.test.ts.
      const delays: number[] = [];
      const timeout = globalThis.setTimeout;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, ms?: number) => {
        if (ms !== undefined) delays.push(ms);
        return timeout(handler, 0);
      }) as typeof globalThis.setTimeout);

      await getClientLocation(undefined, undefined, { retryDelay: 20 });

      expect(delays).toEqual([20]);
      expect(mockGrab).toHaveBeenCalledTimes(2);
    });

    it('never repeats a lookup that succeeded', async () => {
      grabResolves({ latitude: 1, longitude: 2 });

      await getClientLocation(undefined, undefined, noDelay);

      expect(mockGrab).toHaveBeenCalledTimes(1);
    });
  });

  describe('falling back to the next provider', () => {
    it('moves on to ipwho.is when ipapi.co stays rate-limited', async () => {
      grabResolves(
        { error: true, reason: 'RateLimited' },
        { error: true, reason: 'RateLimited' },
        { success: true, city: 'Berlin', timezone: { id: 'Europe/Berlin' }, latitude: 52.52, longitude: 13.4 }
      );

      const location = await getClientLocation(undefined, undefined, noDelay);

      expect(mockGrab.mock.calls[2][0]).toBe('https://ipwho.is/');
      expect(location).toEqual({
        city: 'Berlin',
        region: undefined,
        country: undefined,
        timezone: 'Europe/Berlin',
        latitude: 52.52,
        longitude: 13.4,
      });
    });

    it('treats a 200 without coordinates as a failure instead of returning NaN', async () => {
      // This is the response that used to become `latitude=NaN` in the
      // forecast URL and surface as `Weather request failed: 400 Bad Request`.
      grabResolves(
        { city: 'Nowhere' },
        { city: 'Nowhere' },
        { success: true, city: 'Austin', latitude: 30.27, longitude: -97.74 }
      );

      const location = await getClientLocation(undefined, undefined, noDelay);

      expect(location.latitude).toBe(30.27);
      expect(Number.isFinite(location.latitude)).toBe(true);
    });

    it('rejects coordinates that are off the globe', async () => {
      grabResolves({ latitude: 999, longitude: 0 }, { latitude: 999, longitude: 0 });

      await expect(
        getClientLocation(undefined, undefined, { ...noDelay, providers: ['ipapi'] })
      ).rejects.toThrow('no coordinates in the response');
    });

    it('canonicalizes a legacy timezone alias', async () => {
      grabResolves({ latitude: 1, longitude: 2, timezone: 'US/Pacific' });

      const location = await getClientLocation(undefined, undefined, noDelay);

      expect(location.timezone).toBe('America/Los_Angeles');
    });

    it('drops a timezone the runtime does not recognise', async () => {
      grabResolves({ latitude: 1, longitude: 2, timezone: 'Mars/Phobos' });

      const location = await getClientLocation(undefined, undefined, noDelay);

      expect(location.timezone).toBeUndefined();
    });

    it('rounds coordinates to the precision every upstream accepts', async () => {
      grabResolves({ latitude: 30.267_153_3, longitude: -97.743_057_9 });

      const location = await getClientLocation(undefined, undefined, noDelay);

      expect(location.latitude).toBe(30.2672);
      expect(location.longitude).toBe(-97.7431);
    });

    it('tries the worker first and the public providers after it', async () => {
      grabResolves(
        { error: 'HTTP error: 502 Bad Gateway' },
        { error: 'HTTP error: 502 Bad Gateway' },
        { city: 'Austin', latitude: 30.27, longitude: -97.74 }
      );

      const location = await getClientLocation('https://geo.example.workers.dev', undefined, noDelay);

      expect(mockGrab.mock.calls[0][0]).toBe('https://geo.example.workers.dev');
      expect(mockGrab.mock.calls[2][0]).toBe('https://ipapi.co/json/');
      expect(location.city).toBe('Austin');
    });

    it('reports every provider that failed', async () => {
      mockGrab.mockResolvedValue({ error: true, reason: 'RateLimited' } as never);

      await expect(
        getClientLocation(undefined, undefined, { ...noDelay, providers: ['ipapi', 'ipwho'] })
      ).rejects.toThrow(
        'Geolocation lookup failed: ipapi.co lookup failed: RateLimited; ipwho.is lookup failed: RateLimited'
      );
    });

    it('notifies onProviderError for each failed provider', async () => {
      mockGrab.mockResolvedValue({ error: true, reason: 'RateLimited' } as never);
      const onProviderError = vi.fn();

      await expect(
        getClientLocation(undefined, undefined, { ...noDelay, providers: ['ipapi', 'ipwho'], onProviderError })
      ).rejects.toThrow();

      expect(onProviderError.mock.calls.map(([info]) => info.provider)).toEqual(['ipapi', 'ipwho']);
    });

    it('falls back to the configured location when every provider fails', async () => {
      mockGrab.mockResolvedValue({ error: true, reason: 'RateLimited' } as never);

      const location = await getClientLocation(undefined, undefined, {
        ...noDelay,
        providers: ['ipapi'],
        fallbackLocation: { city: 'Austin', latitude: 30.27, longitude: -97.74 },
      });

      expect(location).toEqual({ city: 'Austin', timezone: undefined, latitude: 30.27, longitude: -97.74 });
    });

    it('still throws when the fallback location has no usable coordinates', async () => {
      mockGrab.mockResolvedValue({ error: true, reason: 'RateLimited' } as never);

      await expect(
        getClientLocation(undefined, undefined, {
          ...noDelay,
          providers: ['ipapi'],
          fallbackLocation: { city: 'Austin' },
        })
      ).rejects.toThrow('ipapi.co lookup failed: RateLimited');
    });
  });
});

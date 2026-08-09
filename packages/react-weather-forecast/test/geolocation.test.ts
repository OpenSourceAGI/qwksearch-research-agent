import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientLocation } from '../src/api/geolocation';

function mockFetch(response: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => response,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('getClientLocation', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  describe('via the bundled geo worker', () => {
    it('requests the endpoint and normalizes the payload', async () => {
      const fetchMock = mockFetch({
        city: 'Austin',
        region: 'Texas',
        country: 'United States',
        timezone: 'America/Chicago',
        latitude: 30.27,
        longitude: -97.74,
      });

      const location = await getClientLocation('https://geo.example.workers.dev');

      expect(fetchMock).toHaveBeenCalledWith('https://geo.example.workers.dev');
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
      mockFetch({ latitude: '30.27', longitude: '-97.74' });

      const location = await getClientLocation('https://geo.example.workers.dev');

      expect(location.latitude).toBe(30.27);
      expect(location.longitude).toBe(-97.74);
    });

    it('passes an explicit IP through as a URL-encoded query param', async () => {
      const fetchMock = mockFetch({ latitude: 1, longitude: 2 });

      await getClientLocation('https://geo.example.workers.dev', '8.8.8.8');

      expect(fetchMock).toHaveBeenCalledWith('https://geo.example.workers.dev?ip=8.8.8.8');
    });

    it('throws with the status code when the worker errors', async () => {
      mockFetch({}, { ok: false, status: 502 });

      await expect(getClientLocation('https://geo.example.workers.dev')).rejects.toThrow(
        'Geolocation worker lookup failed: 502'
      );
    });
  });

  describe('via ipapi.co (default)', () => {
    it('hits the json endpoint and maps country_name to country', async () => {
      const fetchMock = mockFetch({
        city: 'Berlin',
        region: 'Berlin',
        country_name: 'Germany',
        timezone: 'Europe/Berlin',
        latitude: 52.52,
        longitude: 13.4,
      });

      const location = await getClientLocation();

      expect(fetchMock).toHaveBeenCalledWith('https://ipapi.co/json/');
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
      const fetchMock = mockFetch({ latitude: 1, longitude: 2 });

      await getClientLocation(undefined, '1.1.1.1');

      expect(fetchMock).toHaveBeenCalledWith('https://ipapi.co/1.1.1.1/json/');
    });

    it('throws on a non-ok response', async () => {
      mockFetch({}, { ok: false, status: 429 });

      await expect(getClientLocation()).rejects.toThrow('ipapi.co lookup failed: 429');
    });

    it('throws on a 200 response carrying an error flag', async () => {
      mockFetch({ error: true, reason: 'RateLimited' });

      await expect(getClientLocation()).rejects.toThrow('ipapi.co lookup failed: RateLimited');
    });

    it('falls back to a generic message when no reason is given', async () => {
      mockFetch({ error: true });

      await expect(getClientLocation()).rejects.toThrow('ipapi.co lookup failed: unknown error');
    });
  });
});

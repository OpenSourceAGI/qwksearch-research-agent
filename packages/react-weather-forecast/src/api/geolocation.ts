import type { WeatherLocation } from '../types';

// ip-api.com's free tier only serves plain HTTP (HTTPS requires their paid plan),
// so this default will be blocked as mixed content on pages served over HTTPS.
// Deploy worker/geo-worker.ts and pass its URL as `geoEndpoint` to avoid that.
const DEFAULT_IP_API_URL = 'http://ip-api.com/json/';

type IpApiResponse = {
  status: 'success' | 'fail';
  city?: string;
  regionName?: string;
  country?: string;
  timezone?: string;
  lat?: number;
  lon?: number;
  message?: string;
};

type GeoWorkerResponse = {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  latitude?: number | string;
  longitude?: number | string;
};

export async function getClientLocation(geoEndpoint?: string, ip?: string): Promise<WeatherLocation> {
  if (geoEndpoint) {
    const url = ip ? `${geoEndpoint}?ip=${encodeURIComponent(ip)}` : geoEndpoint;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geolocation worker lookup failed: ${res.status}`);
    const data: GeoWorkerResponse = await res.json();

    return {
      city: data.city,
      region: data.region,
      country: data.country,
      timezone: data.timezone,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    };
  }

  const res = await fetch(`${DEFAULT_IP_API_URL}${ip ? encodeURIComponent(ip) : ''}`);
  if (!res.ok) throw new Error(`ip-api lookup failed: ${res.status}`);
  const data: IpApiResponse = await res.json();

  if (data.status === 'fail') {
    throw new Error(`ip-api lookup failed: ${data.message ?? 'unknown error'}`);
  }

  return {
    city: data.city,
    region: data.regionName,
    country: data.country,
    timezone: data.timezone,
    latitude: Number(data.lat),
    longitude: Number(data.lon),
  };
}

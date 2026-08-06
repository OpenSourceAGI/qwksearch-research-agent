import type { WeatherLocation } from '../types';

const DEFAULT_IP_API_URL = 'https://ipapi.co';

type IpApiResponse = {
  city?: string;
  region?: string;
  country_name?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  error?: boolean;
  reason?: string;
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

  const res = await fetch(`${DEFAULT_IP_API_URL}/${ip ? `${encodeURIComponent(ip)}/` : ''}json/`);
  if (!res.ok) throw new Error(`ipapi.co lookup failed: ${res.status}`);
  const data: IpApiResponse = await res.json();

  if (data.error) {
    throw new Error(`ipapi.co lookup failed: ${data.reason ?? 'unknown error'}`);
  }

  return {
    city: data.city,
    region: data.region,
    country: data.country_name,
    timezone: data.timezone,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
  };
}

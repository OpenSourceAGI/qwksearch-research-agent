import type { WeatherLocation } from '../types';

export async function getClientLocation(ipInfoToken?: string): Promise<WeatherLocation> {
  if (ipInfoToken) {
    const res = await fetch(`https://api.ipinfo.io/lookup/me?token=${ipInfoToken}`);
    if (!res.ok) throw new Error(`IPinfo lookup failed: ${res.status}`);
    const data = await res.json();

    return {
      city: data.geo?.city,
      region: data.geo?.region,
      country: data.geo?.country,
      timezone: data.geo?.timezone,
      latitude: Number(data.geo?.latitude),
      longitude: Number(data.geo?.longitude),
    };
  }

  const res = await fetch('https://ipinfo.io/json');
  if (!res.ok) throw new Error(`IPinfo legacy lookup failed: ${res.status}`);
  const data = await res.json();
  const [latitude, longitude] = String(data.loc).split(',');

  return {
    city: data.city,
    region: data.region,
    country: data.country,
    timezone: data.timezone,
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
}

export interface Env {}

type CloudflareGeo = {
  country?: string;
  region?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  postalCode?: string;
};

type IpApiResponse = {
  status: 'success' | 'fail';
  query?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  message?: string;
};

async function lookupIpApi(ip: string): Promise<IpApiResponse> {
  const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
  if (!res.ok) throw new Error(`ip-api HTTP ${res.status}`);
  return res.json() as Promise<IpApiResponse>;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip');

    if (ip) {
      const data = await lookupIpApi(ip);
      return Response.json(
        {
          source: 'ip-api',
          ip: data.query ?? ip,
          country: data.country,
          countryCode: data.countryCode,
          region: data.regionName,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          isp: data.isp,
          org: data.org,
          as: data.as,
          status: data.status,
          message: data.message,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cf = request.cf as CloudflareGeo | undefined;

    return Response.json(
      {
        source: 'cloudflare',
        ip: request.headers.get('CF-Connecting-IP'),
        country: request.headers.get('CF-IPCountry'),
        region: cf?.region,
        city: cf?.city,
        latitude: cf?.latitude,
        longitude: cf?.longitude,
        timezone: cf?.timezone,
        postalCode: cf?.postalCode,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
} satisfies ExportedHandler<Env>;

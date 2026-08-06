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
  ip?: string;
  country_name?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
  asn?: string;
  error?: boolean;
  reason?: string;
};

async function lookupIpApi(ip: string): Promise<IpApiResponse> {
  const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!res.ok) throw new Error(`ipapi.co HTTP ${res.status}`);
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
          source: 'ipapi.co',
          ip: data.ip ?? ip,
          country: data.country_name,
          countryCode: data.country_code,
          region: data.region,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          org: data.org,
          asn: data.asn,
          error: data.error,
          reason: data.reason,
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

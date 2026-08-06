# use-weather-forecast

React weather forecast component using Open-Meteo for current, hourly, and daily forecasts and Cloudflare/ipapi.co for IP geolocation.

## Features

- Current weather.
- Next hours forecast.
- Next days forecast.
- IP geolocation fallback.
- Latitude/longitude override.
- Split SVG weather icon components.
- TypeScript + tsup library scaffold.

## Install

```bash
npm install use-weather-forecast
```

## Usage

```tsx
import { WeatherForecast } from 'use-weather-forecast';

export default function App() {
  return (
    <WeatherForecast
      forecastDays={5}
      forecastHours={12}
      temperatureUnit="fahrenheit"
      geoEndpoint={import.meta.env.VITE_GEO_WORKER_URL}
    />
  );
}
```

## Direct API usage

```ts
import { getWeatherForecast } from 'use-weather-forecast';

const data = await getWeatherForecast({
  latitude: 37.3688,
  longitude: -122.0363,
  forecastDays: 5,
  forecastHours: 12,
  temperatureUnit: 'fahrenheit',
});
```

## Build

```bash
npm install
npm run build
```

## IP geolocation

This package no longer uses ipinfo.io. Instead:

- Pass `geoEndpoint` pointing at a deployed instance of the bundled Cloudflare Worker
  (`worker/geo-worker.ts`) for accurate results. The worker reads Cloudflare's built-in
  geolocation (`request.cf`) for the visitor's own IP, and falls back to `ipapi.co`
  when a `?ip=` query param (or the `ip` prop) is supplied for an arbitrary address.
- If `geoEndpoint` is omitted, the package falls back to calling `ipapi.co` directly
  from the browser (`https://ipapi.co/json/`, or `https://ipapi.co/<ip>/json/` when an
  `ip` is supplied). Unlike the previous ip-api.com fallback, this works over HTTPS with
  no mixed-content issues, though ipapi.co's free tier is rate-limited (1,000
  requests/day) — deploy the worker and pass `geoEndpoint` for higher-volume or
  production use.

### Deploying the geo worker

```bash
cd packages/react-weather-forecast
npm run worker:deploy
```

This deploys `worker/geo-worker.ts` via Wrangler. Use the resulting `*.workers.dev` URL
(or a custom route) as `geoEndpoint`.

## Caching

`getWeatherForecast` caches each response in `localStorage` for 30 minutes, keyed by
the exact request URL (location + units + forecast range). Repeated calls for the same
location/options within that window are served from the cache instead of hitting
Open-Meteo again, which keeps the widget well under Open-Meteo's rate limits. Call
`clearWeatherForecastCache()` to evict everything (e.g. in tests). The cache is a no-op
in non-browser environments (SSR) or when `localStorage` is unavailable/full.

## Notes

- Open-Meteo powers the forecast data.
- Cloudflare's `request.cf` and ipapi.co power IP geolocation (see above).

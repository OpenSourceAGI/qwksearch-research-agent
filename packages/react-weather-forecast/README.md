# use-weather-forecast

React weather forecast component using Open-Meteo for current, hourly, and daily forecasts and Cloudflare/ip-api for IP geolocation.

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
  geolocation (`request.cf`) for the visitor's own IP, and falls back to `ip-api.com`
  when a `?ip=` query param (or the `ip` prop) is supplied for an arbitrary address.
- If `geoEndpoint` is omitted, the package falls back to calling `ip-api.com` directly
  from the browser. **Note:** ip-api.com's free tier only serves plain HTTP, so this
  fallback will be blocked as mixed content on pages served over HTTPS — deploy the
  worker and pass `geoEndpoint` for any HTTPS site.

### Deploying the geo worker

```bash
cd packages/react-weather-forecast
npm run worker:deploy
```

This deploys `worker/geo-worker.ts` via Wrangler. Use the resulting `*.workers.dev` URL
(or a custom route) as `geoEndpoint`.

## Notes

- Open-Meteo powers the forecast data.
- Cloudflare's `request.cf` and ip-api.com power IP geolocation (see above).

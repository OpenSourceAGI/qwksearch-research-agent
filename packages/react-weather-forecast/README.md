<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/react-weather-forecast"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/dm/use-weather-forecast.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/v/use-weather-forecast.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/dt/use-weather-forecast.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/types/use-weather-forecast" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=use-weather-forecast"><img src="https://packagephobia.com/badge?p=use-weather-forecast" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# use-weather-forecast

[![Coverage](https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent/graph/badge.svg?component=package-react-weather-forecast)](https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent)

React weather forecast component using Open-Meteo for current, hourly, and daily forecasts and Cloudflare/ipapi.co for IP geolocation, with a fallback chain behind both.

## Features

- Current weather.
- Next hours forecast.
- Next days forecast.
- Four weather upstreams tried in order, four IP geolocation upstreams behind that.
- Every request validated before it is sent, retried with backoff when it can recover.
- Stale-cache fallback so a total outage still renders a widget.
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

## Reliability

Nothing here needs configuring -- these are the defaults -- but this is what
the package does when an upstream misbehaves.

### `Weather request failed: 400 Bad Request`

Open-Meteo answers `400` for a query it cannot parse, and the usual way to
build one is not a typo in your props: an IP geolocation upstream answers
`200` with no coordinates in the body, `Number(undefined)` becomes `NaN`,
`latitude=NaN` goes out on the wire. Everything that goes into a request is
validated first now:

| Input | What happens to it |
| --- | --- |
| `latitude` / `longitude` | Must be finite and on the globe, and are rounded to 4 decimals. A geolocation response without them counts as a failed lookup, so the next provider gets a turn. Unusable props fall back to IP geolocation. |
| `location.timezone` | Canonicalized (`US/Pacific` becomes `America/Los_Angeles`); a zone the runtime cannot resolve is dropped rather than sent, and Open-Meteo resolves the zone from the coordinates instead. |
| `forecastDays` / `forecastHours` | Clamped to the 1-16 days and 1-384 hours the API accepts. |
| Variable list | A `400` from an endpoint that refused one of the optional variables is retried once with the minimal set the widget needs. |

### Retries

Requests go through [`grab-url`](https://www.npmjs.com/package/grab-url) rather
than `fetch`. Each one is tried up to `retryAttempts` times (3 by default for a
forecast, 2 per geolocation provider since that chain is longer) with
exponential backoff from `retryDelay` (400ms, then 800ms, ...). A `429`, a
`5xx`, a timeout or a dropped connection is repeated; a request the server
called invalid (`400`, `404`) is not, since replaying it only burns the
upstream's rate limit.

### Fallback APIs

| Order | Weather | IP geolocation |
| --- | --- | --- |
| 1 | `open-meteo` -- `api.open-meteo.com/v1/forecast` | `geoEndpoint` (the bundled worker), when given |
| 2 | `open-meteo-gfs` -- the GFS model endpoint | `ipapi` -- ipapi.co |
| 3 | `met-no` -- met.no, a different operator and model | `ipwho` -- ipwho.is |
| 4 | `wttr` -- wttr.in, no key required | `geojs` -- get.geojs.io |
| 5 | | `freeipapi` -- freeipapi.com |

The fallbacks normalize their own condition codes, units and timestamps into
the same shape Open-Meteo returns, so a failover is invisible in the rendered
widget (wttr.in is 3-hourly rather than hourly). If every provider fails, a
cached forecast up to a day old is served instead of throwing; only if there is
no cache either does an error reach the widget, listing what each provider
said.

```tsx
<WeatherForecast
  weatherProviders={['open-meteo', 'met-no']}
  geoProviders={['ipwho', 'geojs']}
  retryAttempts={3}
  retryDelay={400}
  timeout={15}
  fallbackLocation={{ city: 'Austin', latitude: 30.27, longitude: -97.74 }}
  allowStaleCache
  onProviderError={({ provider, stage, error }) => console.warn(stage, provider, error.message)}
/>
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
- A failed lookup is **repeated** before the chain moves on: `getClientLocation`
  tries each provider twice by default, waiting 500ms, then walks the rest of the
  chain (ipapi.co, ipwho.is, get.geojs.io, freeipapi.com) so a single rate-limited
  or cold-start response doesn't take the whole forecast down. Tune it with the
  third argument: `getClientLocation(geoEndpoint, ip, { attempts: 5, retryDelay: 250, providers: ['ipwho'] })`.
- A response **without usable coordinates counts as a failure** rather than being
  passed on as `NaN`, and `fallbackLocation` covers the case where every provider
  is down.
- The bundled worker does the same on its side: it falls back to the IP lookups
  when Cloudflare's own geolocation carries no coordinates, and answers `502` with
  a reason instead of a body the caller cannot use.

### Deploying the geo worker

```bash
cd packages/react-weather-forecast
npm run worker:deploy
```

This deploys `worker/geo-worker.ts` via Wrangler. Use the resulting `*.workers.dev` URL
(or a custom route) as `geoEndpoint`.

## Caching

`getWeatherForecast` caches each response in `localStorage` for 30 minutes, keyed by
the request itself (location + units + forecast range + timezone), so a fallback
provider's answer is reused exactly like the primary one's. Repeated calls for the same
location/options within that window are served from the cache instead of hitting
Open-Meteo again, which keeps the widget well under Open-Meteo's rate limits. Past
the 30 minutes an entry is kept for a day as the last-resort fallback described
above, and evicted after that. Call `clearWeatherForecastCache()` to evict
everything (e.g. in tests). The cache is a no-op in non-browser environments (SSR)
or when `localStorage` is unavailable/full.

## Notes

- Open-Meteo powers the forecast data, with met.no and wttr.in behind it.
- Cloudflare's `request.cf`, ipapi.co, ipwho.is, get.geojs.io and freeipapi.com
  power IP geolocation (see above).
- HTTP requests go through [`grab-url`](https://www.npmjs.com/package/grab-url), the
  repo-wide client, rather than raw `fetch`. It is the package's only runtime
  dependency.

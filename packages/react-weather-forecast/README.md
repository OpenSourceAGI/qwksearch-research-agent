<!-- template-git-repo:badges:start -->
<p align="center">
<img src="https://i.imgur.com/g0jThXd.png" />
        <br />
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/dm/use-weather-forecast.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/v/use-weather-forecast.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/dt/use-weather-forecast.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/use-weather-forecast"><img src="https://img.shields.io/npm/types/use-weather-forecast" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=use-weather-forecast"><img src="https://packagephobia.com/badge?p=use-weather-forecast" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
        <a href="https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent" aria-label="Coverage">
<img src="https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent/graph/badge.svg?component=package-react-weather-forecast" alt="Coverage">
</a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/react-weather-forecast"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflareworkers&logoColor=white" alt="Cloudflare Workers" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# use-weather-forecast

React weather forecast component using Open-Meteo for current, hourly, and daily forecasts and Cloudflare/ipwho.is for IP geolocation, with a fallback chain behind both.

## Features

- Current weather.
- Next hours forecast.
- Next days forecast.
- Four weather upstreams tried in order, four IP geolocation upstreams behind that.
- Every request validated before it is sent, retried with backoff when it can recover.
- A resolved location cached for 12 hours, so a refreshing widget never spends a
  lookup it has already made -- the difference between working all day and a `429`.
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

Two different things produced this, and both are fixed.

**A malformed URL.** Requests go through
[`grab-url`](https://www.npmjs.com/package/grab-url), which turns every option
it does not recognise into the GET query string and concatenates it onto the
path. Passing it a URL that already had a query gave the request *two* `?`, and
the last real parameter value absorbed the leftover option:

```text
...&daily=temperature_2m_max%2Cwind_speed_10m_max?retryAttempts=0
```

Open-Meteo read that as an unknown `daily` variable and answered `400`. It hit
every weather provider on every call, since all four build a query -- while the
geolocation lookups kept working, because their URLs carry no query of their own
for the stray `?` to collide with. The query is now handed over as grab-url's
own parameters, so grab-url writes the single `?` itself and there is no query
string of ours left to corrupt.

**A malformed query.** Open-Meteo also answers `400` for a query it cannot
parse, and the usual way to build one is not a typo in your props: an IP
geolocation upstream answers `200` with no coordinates in the body,
`Number(undefined)` becomes `NaN`, `latitude=NaN` goes out on the wire.
Everything that goes into a request is validated first:

| Input | What happens to it |
| --- | --- |
| `latitude` / `longitude` | Must be finite and on the globe, and are rounded to 4 decimals. A geolocation response without them counts as a failed lookup, so the next provider gets a turn. Unusable props fall back to IP geolocation. Coordinates on `location` are honoured like top-level ones, without an IP lookup. |
| `location.timezone` | Canonicalized (`US/Pacific` becomes `America/Los_Angeles`); a zone the runtime cannot resolve is dropped rather than sent. With no zone given, the one IP geolocation reported is used, and Open-Meteo resolves it from the coordinates if there is none. |
| `forecastDays` / `forecastHours` | Clamped to the 1-16 days and 1-384 hours the API accepts. |
| Variable list | A `400` from an endpoint that refused part of the query is asked again in a smaller shape: first only the variables every model supports, then that without `forecast_hours` and with `timezone=auto`. The units are never dropped -- a Celsius body read as Fahrenheit would render a plausible, wrong temperature. |

### Retries

Requests go through [`grab-url`](https://www.npmjs.com/package/grab-url) rather
than `fetch`. Each one is tried up to `retryAttempts` times (3 by default for a
forecast, 2 per geolocation provider since that chain is longer) with
exponential backoff from `retryDelay` (400ms, then 800ms, ...). A `429`, a
`5xx`, a timeout or a dropped connection is repeated; a request the server
called invalid (`400`, `404`) is not, since replaying it only burns the
upstream's rate limit.

One exception, in the geolocation chain: a provider that answered with a rate
limit is *not* retried while another provider is still to be tried. A free IP
lookup's limit is a daily quota, so the retry would be spent asking the one
operator that has already said no. The last provider in the chain, which has
nowhere left to move on to, still retries.

### Fallback APIs

| Order | Weather | IP geolocation |
| --- | --- | --- |
| 1 | `open-meteo` -- `api.open-meteo.com/v1/forecast` | `geoEndpoint` (the bundled worker), when given |
| 2 | `open-meteo-gfs` -- the GFS model endpoint | `ipwho` -- ipwho.is |
| 3 | `met-no` -- met.no, a different operator and model | `ipapi` -- ipapi.co |
| 4 | `wttr` -- wttr.in, no key required | `geojs` -- get.geojs.io |
| 5 | | `freeipapi` -- freeipapi.com |

ipwho.is leads the geolocation chain: it is free, keyless and CORS-enabled, and
unlike ipapi.co it does not spend the rest of the day answering `RateLimited` as
a `200` once the quota is gone. `browser` -- the device's own geolocation -- is
bundled too but deliberately left out of the default chain, since asking for it
raises the browser's permission prompt; name it first in `geoProviders` in a
place where asking is expected and the IP lookups stay behind it for everyone
who declines.

The fallbacks normalize their own condition codes, units and timestamps into
the same shape Open-Meteo returns, so a failover is invisible in the rendered
widget (wttr.in is 3-hourly rather than hourly). If every provider fails, a
cached forecast up to a day old is served instead of throwing.

### Reloading

If even that produces nothing, the component reloads the whole forecast
`reloadAttempts` more times (2 by default) with a growing pause -- 3s, then 6s.
A failure that reaches this point means every provider failed at once, which is
usually something that clears on its own: a flaky network on first paint, or
every free upstream rate-limited in the same second. The component stays in its
loading state while a reload is pending, so it renders nothing for a few
seconds rather than flashing an error it is about to recover from.

Only once the reloads are spent does an error reach the widget, listing what
each provider said. `reloadAttempts={0}` shows it immediately instead.

```tsx
<WeatherForecast
  weatherProviders={['open-meteo', 'met-no']}
  geoProviders={['ipwho', 'geojs']}
  retryAttempts={3}
  retryDelay={400}
  timeout={15}
  reloadAttempts={2}
  reloadDelay={3000}
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
  (`worker/geo-worker.ts`) for accurate results, and for production prefer it over any
  public IP API. The worker reads Cloudflare's built-in geolocation (`request.cf`) for
  the visitor's own IP: no third-party request, no shared quota, no CORS, and nothing
  an ad blocker recognises as a tracker. It falls back to the public lookups only for a
  `?ip=` query param (or the `ip` prop) naming an arbitrary address, or for the rare
  network Cloudflare has no coordinates for. A successful answer is returned
  `Cache-Control: private, max-age=43200`, so a reloaded page does not re-ask.
- If `geoEndpoint` is omitted, the package calls `ipwho.is` directly from the browser
  (`https://ipwho.is/?rate=1`, or `https://ipwho.is/<ip>?rate=1` when an `ip` is
  supplied). It is free, needs no key, supports CORS and works over HTTPS with no
  mixed-content issues; `rate=1` makes it report what is left of the quota alongside
  the location, which is useful while watching request volume. Its free tier allows
  1,000 requests/day, **shared by every visitor to your domain** for a browser call --
  deploy the worker and pass `geoEndpoint` for higher-volume or production use.
- A resolved location is **cached for 12 hours** (see [Caching](#caching)), so the
  quota is spent once per visitor per half-day rather than once per render. Turning
  this off with `cacheLocation={false}` is what re-creates the `429`.
- A failed lookup is **repeated** before the chain moves on: `getClientLocation`
  tries each provider twice by default, waiting 500ms, then walks the rest of the
  chain (ipwho.is, ipapi.co, get.geojs.io, freeipapi.com) so a single cold-start
  response doesn't take the whole forecast down. A rate-limited provider is not
  retried while another one is left to ask. Tune it with the third argument:
  `getClientLocation(geoEndpoint, ip, { attempts: 5, retryDelay: 250, providers: ['ipwho'] })`.
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

Two things are cached in `localStorage`, on different clocks, because they go
stale at different rates.

**The resolved location, for 12 hours.** The weather at a place changes through
the day; the place a visitor is looking from does not. Every free IP lookup
bills per request against a daily quota, and for a browser call that quota is
shared by everyone on the domain -- so a widget that re-resolves its location on
each refresh, each tab and each remount exhausts 1,000 requests without needing
many users, and then answers `429 Too Many Requests` for the rest of the day.
Caching the location is the single most effective thing against that, and it is
on by default. `cacheLocation={false}` forces a fresh lookup every time;
`locationCacheTtl` changes the window; `clearCachedLocations()` empties it.

Note that the forecast cache below cannot help here: it is keyed by coordinates,
so it can only be consulted *after* the location is known.

**The forecast itself, for 30 minutes.** `getWeatherForecast` caches each response
in `localStorage` for 30 minutes, keyed by
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
- Cloudflare's `request.cf`, ipwho.is, ipapi.co, get.geojs.io and freeipapi.com
  power IP geolocation (see above).
- HTTP requests go through [`grab-url`](https://www.npmjs.com/package/grab-url), the
  repo-wide client, rather than raw `fetch`. It is the package's only runtime
  dependency.

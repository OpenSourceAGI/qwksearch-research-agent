---
name: ask-weather-forecast
description: Guide to react-weather-forecast (packages/react-weather-forecast, published as use-weather-forecast), the Open-Meteo weather widget — getWeatherForecast and its location resolution (explicit coordinates, a geo Worker, or ipapi.co), getClientLocation, the useWeatherForecast hook, the WeatherForecast component and its compact mode, the WMO-code-to-icon mapping, the 30-minute localStorage cache, and the bundled Cloudflare geo Worker. Use when embedding or restyling the weather widget, when it resolves the wrong location or rate-limits, when adding a weather condition or icon, or when deploying the geo Worker.
---

# Working With react-weather-forecast

Directory `packages/react-weather-forecast`; the npm name is **`use-weather-forecast`**
— mind the mismatch when adding it as a dependency. Forecast data comes from
[Open-Meteo](https://open-meteo.com) (no API key), and the location comes from IP
geolocation.

## Setup

```tsx
import { WeatherForecast, useWeatherForecast, getWeatherForecast } from "use-weather-forecast";

<WeatherForecast compact temperatureUnit="celsius" windSpeedUnit="kmh" />
<WeatherForecast latitude={40.7} longitude={-74} />               // skip geolocation
<WeatherForecast geoEndpoint="https://geo.you.workers.dev" />     // use the bundled worker
```

Peers: `react`, `react-dom`. No key, no bundled data.

## Location resolution, in order

1. **`latitude` + `longitude`** given → used directly, no lookup.
2. **`geoEndpoint`** set → `GET {geoEndpoint}` (plus `?ip=` when `ip` is given). That is
   the bundled `worker/geo-worker.ts`, which uses Cloudflare's own `request.cf` geo data
   for the caller and falls back to ipapi.co for an explicit `ip`.
3. Otherwise → **`https://ipapi.co/json/`** directly from the browser.

Option 3 is the default and is the usual source of trouble: ipapi.co rate-limits by IP,
and calling it from the client exposes the visitor to a third party. Deploy the worker
(`bun run worker:deploy`) and pass `geoEndpoint` for anything real.

Either lookup is repeated before it throws — `getClientLocation(geoEndpoint, ip,
{ attempts, retryDelay })`, 3 tries with a 500ms, then 1s wait by default — because
ipapi.co answers a rate limit as HTTP 200 with `{ error: true, reason: 'RateLimited' }`
and a worker can drop a request while it cold-starts. Only the last error is thrown.

## Options and shapes

| Option | Default | Meaning |
| --- | --- | --- |
| `latitude` / `longitude` | — | Explicit coordinates; both required to skip geolocation |
| `location` | — | `Partial<WeatherLocation>`; its `timezone` overrides Open-Meteo's `auto` |
| `locations` | — | `WeatherLocationInput[]` for a multi-location widget |
| `geoEndpoint`, `ip` | — | See above |
| `forecastDays` | `5` | |
| `forecastHours` | `24` | |
| `temperatureUnit` | `"fahrenheit"` | or `"celsius"` |
| `windSpeedUnit` | `"mph"` | or `"kmh"`, `"ms"`, `"kn"` |
| `reloadAttempts` | `2` | Whole reloads after a load that failed on every provider; `0` shows the error at once |
| `reloadDelay` | `3000` | Milliseconds before the first reload, doubling after that |

The component adds `className`, `style` and `compact`.

Data: `WeatherForecastData { location, current, hourly[], daily[] }` with
`CurrentWeather { time, temperature, weatherCode, icon, isDay?, rain?, showers?,
snowfall?, windSpeed? }`, `HourlyWeather` (adds `precipitationProbability`) and
`DailyWeather`. `WeatherCondition` is the icon union — `sun`, `cloud-sun`, `clouds`,
`cloud-fog`, `cloud-drizzle`, `cloud-showers`, `cloud-showers-heavy`, `cloud-sleet`,
`cloud-snow`, `snowflake`, `cloud-bolt`, `cloud-hail`.

## The transport, and the `?` trap

Every request goes through `grabJson` in `src/api/http.ts`, which wraps
[`grab-url`](https://npmjs.com/package/grab-url) and adds the labelled error, the status
classification and the backoff. One thing in there is not incidental:

> **`grabJson` hands grab-url a bare path and passes the query as grab-url options.**
> Never build a URL with a query string and hand the whole thing over.

grab-url destructures the options it knows and turns **everything left** into the GET
query string, which it concatenates onto the path. So a path that already carries a `?`
comes back with two of them, and the last real parameter value silently swallows the
leftover option:

```text
...&daily=temperature_2m_max%2Cwind_speed_10m_max?retryAttempts=0
```

Open-Meteo reads that as an unknown `daily` variable and answers `400 Bad Request`. That
was the cause of `Error: Weather request failed: 400 Bad Request` — on every weather
provider, every call, since all four build a query. The geolocation lookups were
unaffected because their URLs have no query of their own for the stray `?` to collide
with, which is exactly why the widget could report a location and still never show a
forecast.

`splitUrl` now separates the two halves so grab-url writes the single `?` itself, and
`test/wire-url.test.ts` drives the real grab-url against a local server to assert the URL
that actually arrives. Mocking grab-url cannot catch this class of bug — the mock is
handed a perfectly good URL and never composes the query.

## Falling back

Three layers, tried in this order before an error reaches the user:

1. **Query shapes**, per Open-Meteo endpoint: the full variable list, then only the
   variables every model supports, then that without `forecast_hours` and with
   `timezone=auto`. Only a query the endpoint called invalid (a 400) shrinks; a rate
   limit or an unreachable host goes straight to the next provider. The units are never
   dropped — a Celsius body read as Fahrenheit renders a plausible, wrong temperature.
2. **Providers**: `open-meteo` → `open-meteo-gfs` → `met-no` → `wttr`, then a stale cache
   entry up to a day old (`allowStaleCache`).
3. **Whole reloads** from `useWeatherForecast`: `reloadAttempts` more tries with a
   growing pause. It stays in the loading state in between, so the widget renders nothing
   for a few seconds rather than flashing an error it is about to recover from.

## Recipes

**Icons.** Open-Meteo returns a numeric WMO `weather_code`; `getWeatherIcon` (in
`src/weatherCodes.ts`) maps it to a `WeatherCondition`, and `<WeatherIcon>` renders it.
Add a condition in both places.

**Caching.** 30 minutes in `localStorage`, keyed by the full Open-Meteo URL (prefix
`weather-forecast-cache:`). Any option that changes the URL is a different cache entry.
`clearWeatherForecastCache()` clears it.

**Timezones.** `timezone` defaults to `auto` (Open-Meteo infers it from the
coordinates). The component formats times with `Intl.DateTimeFormat` in that zone and
falls back to the browser's zone when the string is missing or invalid.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| The package isn't found as `react-weather-forecast` | The npm name is `use-weather-forecast`. |
| Wrong city, or the datacenter's location | IP geolocation resolved the server or a VPN exit. Pass explicit coordinates, or use `geoEndpoint` so Cloudflare's edge geo is used. |
| `ipapi.co lookup failed: …` | Rate-limited or blocked, and every repeat failed too. Deploy the geo worker and set `geoEndpoint`. |
| `Geolocation worker lookup failed: <status>` | The endpoint is wrong or not deployed. |
| `Invalid weather response` | Open-Meteo replied without `current`/`hourly`/`daily` — usually invalid coordinates (only one of lat/lon given, so the pair was ignored). |
| `Weather request failed: 400 Bad Request` | A malformed URL, not a malformed query. Check that nothing hands grab-url a path with a `?` on it — see the `?` trap above — then that the coordinates and timezone survived `src/lib/validate.ts`. |
| The widget shows nothing for a few seconds after a failure | `useWeatherForecast` is reloading; that is the point. `reloadAttempts={0}` surfaces the error immediately instead. |
| Stale data after changing units | Different units → different URL → different cache key, but an unchanged URL keeps its 30-minute entry. `clearWeatherForecastCache()`. |
| Times are in the wrong zone | Pass `location.timezone`, or let `auto` do its job — do not set a zone that disagrees with the coordinates. |
| SSR errors | The component is client-side and the cache guards on `typeof window`; mark the host boundary `'use client'`. |
| An unknown weather code renders no icon | Add the WMO code to `weatherCodes.ts` and, if needed, a new `WeatherCondition` plus its SVG. |
| Worker commands can't find a config | Use the `worker:*` scripts, which pass `--config worker/wrangler.jsonc`. |

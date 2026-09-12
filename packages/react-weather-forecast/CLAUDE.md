# CLAUDE.md — `use-weather-forecast` (`packages/react-weather-forecast`)

**npm name:** `use-weather-forecast`. **Read
[`skills/ask-weather-forecast`](../../skills/ask-weather-forecast/SKILL.md)
first.**

A React weather forecast component backed by **Open-Meteo** and IP geolocation.
Published.

## Rules

- **Open-Meteo is a free public API.** Cache, don't poll: a component that
  refetches on every render is abuse. Respect its rate limits and attribution.
- **IP geolocation is a privacy surface.** Location is inferred, not asked for —
  never send a user's coordinates anywhere but the forecast call, and don't log
  them.
- Geolocation fails often (VPNs, blocked requests, datacenter IPs). A wrong or
  missing location must degrade to a usable component, not an error state.
- Units and locale are user-visible: don't hardcode Fahrenheit or English.
- **Never hand `grabJson` a URL with a query string on the path it cannot split.**
  `grab-url` turns every option it does not recognise into the query string and
  concatenates it onto the path, so a second `?` corrupts the last real
  parameter — which is what made every forecast a `400 Bad Request`. Build the
  query, let `splitUrl` separate it, and keep `test/wire-url.test.ts` (the one
  test here that uses the real `grab-url`) green.
- A failure has three layers of fallback beneath it: query shapes, then
  providers, then whole reloads from the hook. Add to a layer; don't bypass them.


```bash
cd packages/react-weather-forecast && bun run test
```

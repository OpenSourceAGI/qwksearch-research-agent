# CLAUDE.md — `use-weather-forecast` (`packages/react-weather-forecast`)

**npm name:** `use-weather-forecast`. **Read
[`skills/ask-weather-forecast`](../../../skills/ask-weather-forecast/SKILL.md)
first.**

A React weather forecast component backed by **Open-Meteo** and IP geolocation.
Published.

## Rules

- **Open-Meteo is a free public API.** Cache, don't poll: a component that
  refetches on every render is abuse. Respect its rate limits and attribution.
- **IP geolocation is a privacy surface.** Location is inferred, not asked for —
  never send a user's coordinates anywhere but the forecast call, and don't log
  them. `browser` (the device's own geolocation) stays out of the default
  provider chain for the same reason: a weather widget must not make the page
  ask for permission just by rendering.
- **An IP lookup is metered; treat it that way.** Every free provider allows
  1,000 requests/day, and a browser call spends a quota shared by everyone on
  the domain — so a `429` is something this package causes, not something that
  happens to it. A resolved location is cached for 12 hours and reused before
  any provider is tried; the forecast cache cannot substitute for it, since it
  is keyed by coordinates and so is only reachable *after* the lookup. Do not
  move the location lookup back inside a per-render path, and do not default
  `cacheLocation` to false. A rate-limited provider is likewise not retried
  while another one is left to ask.
- Geolocation fails often (VPNs, blocked requests, datacenter IPs). A wrong or
  missing location must degrade to a usable component, not an error state.
- Units and locale are user-visible: don't hardcode Fahrenheit or English.
- **`compact` is a deliberately short card.** On the qwksearch homepage it sits
  under the news widget and above the chat input, so its height comes straight
  out of the input box's room on a laptop. Padding, the gap between its two rows
  and the two display sizes (temperature, clock) are what set that height —
  trim content before growing any of them.
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

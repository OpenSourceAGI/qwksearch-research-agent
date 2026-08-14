# react-weather-forecast

React weather forecast component using Open-Meteo for current, hourly, and daily forecasts and IPinfo for IP geolocation.

## Features

- Current weather, with a live clock in the location's own timezone.
- Click the `°F` / `°C` letter to switch temperature units.
- A calendar dropdown on the date for browsing months and years.
- Next hours forecast.
- Next days forecast, labelled by short weekday.
- Rain and wind are only shown once they are above a marginal amount.
- IP geolocation fallback.
- Latitude/longitude override.
- Split SVG weather icon components.
- TypeScript + tsup library scaffold.

## Install

```bash
npm install react-weather-forecast
```

## Usage

```tsx
import { WeatherForecast } from 'react-weather-forecast';

export default function App() {
  return (
    <WeatherForecast
      forecastDays={5}
      forecastHours={12}
      temperatureUnit="fahrenheit"
      ipInfoToken={import.meta.env.VITE_IPINFO_TOKEN}
    />
  );
}
```

## Direct API usage

```ts
import { getWeatherForecast } from 'react-weather-forecast';

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

## Notes

- Open-Meteo powers the forecast data.
- IPinfo is used for client IP geolocation.
- Pass `ipInfoToken` for the Core API path, otherwise the package falls back to `https://ipinfo.io/json`.

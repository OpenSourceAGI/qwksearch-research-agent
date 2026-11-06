/**
 * @file WeatherPreview.tsx
 * @description `<WeatherForecast />` for the docs pages. MDX renders on the
 * server, which cannot hand a provider object (a function) to a client
 * component, so the preview takes plain props and builds the fixture
 * provider here.
 */
'use client';
import { type TemperatureUnit, WeatherForecast, type WindSpeedUnit } from 'use-weather-forecast';
import {
  failingProviders,
  fixtureProvider,
  LIVE_CITIES,
  OFFLINE_LOCATION,
  SCENARIO_LOCATIONS,
  type Scenario,
  scenarioLocation,
} from '@/lib/fixtures';

export type WeatherPreviewProps = {
  /** Sample-data scenario. Ignored when `live` is set. */
  scenario?: Scenario;
  /** Call Open-Meteo for real. `city` picks one of the live presets; omit it to locate by IP. */
  live?: boolean;
  city?: (typeof LIVE_CITIES)[number]['label'];
  /** One card per sample scenario. */
  multi?: boolean;
  /** Every provider down. */
  error?: boolean;
  compact?: boolean;
  temperatureUnit?: TemperatureUnit;
  windSpeedUnit?: WindSpeedUnit;
  forecastDays?: number;
  forecastHours?: number;
  /** Dark gradient behind the card. */
  dark?: boolean;
};

export function WeatherPreview({
  scenario = 'sunny',
  live,
  city,
  multi,
  error,
  dark,
  compact,
  temperatureUnit = 'fahrenheit',
  windSpeedUnit = 'mph',
  forecastDays = 5,
  forecastHours = 12,
}: WeatherPreviewProps) {
  const common = { compact, temperatureUnit, windSpeedUnit, forecastDays, forecastHours };

  let widget;
  if (error) {
    widget = (
      <WeatherForecast
        {...common}
        {...OFFLINE_LOCATION}
        weatherProviders={failingProviders}
        allowStaleCache={false}
        reloadAttempts={0}
        retryAttempts={1}
      />
    );
  } else if (live) {
    const preset = LIVE_CITIES.find((c) => c.label === city);
    widget = preset ? (
      <WeatherForecast
        {...common}
        latitude={preset.latitude}
        longitude={preset.longitude}
        location={{ city: preset.label, timezone: preset.timezone }}
      />
    ) : (
      <WeatherForecast {...common} />
    );
  } else if (multi) {
    widget = <WeatherForecast {...common} locations={SCENARIO_LOCATIONS} weatherProviders={[fixtureProvider(scenario)]} />;
  } else {
    widget = <WeatherForecast {...common} {...scenarioLocation(scenario)} weatherProviders={[fixtureProvider(scenario)]} />;
  }

  return (
    <div
      className="not-prose my-6 rounded-xl border border-fd-border p-4"
      style={
        dark
          ? { background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#f8fafc' }
          : { background: compact ? undefined : 'var(--color-fd-muted)' }
      }
    >
      {widget}
      <p className="mt-3 text-xs opacity-60">{live ? 'Live data from Open-Meteo.' : 'Sample data — see lib/fixtures.ts.'}</p>
    </div>
  );
}

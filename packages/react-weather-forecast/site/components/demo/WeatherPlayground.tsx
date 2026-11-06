/**
 * @file WeatherPlayground.tsx
 * @description The `/demo` page: every prop of `<WeatherForecast />` as a
 * control, the widget it produces, and the JSX to paste.
 *
 * "Live" calls Open-Meteo (and an IP lookup when no city is picked) exactly as
 * the npm package does in your app. "Sample data" answers from
 * `lib/fixtures.ts`, for trying layouts without spending anyone's quota.
 */
'use client';
import { Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type TemperatureUnit, WeatherForecast, type WindSpeedUnit } from 'use-weather-forecast';
import {
  fixtureProvider,
  LIVE_CITIES,
  SCENARIO_LOCATIONS,
  SCENARIO_NAMES,
  SCENARIOS,
  type Scenario,
  scenarioLocation,
} from '@/lib/fixtures';
import { cn } from '@/lib/utils';

type Source = 'live' | 'sample';
type Place = 'auto' | 'multi' | string;

const WIND_UNITS: WindSpeedUnit[] = ['mph', 'kmh', 'ms', 'kn'];

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-fd-border bg-fd-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm transition-colors',
            value === option.value ? 'bg-fd-background font-medium shadow-sm' : 'text-fd-muted-foreground hover:text-fd-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-fd-muted-foreground">{hint}</span>}
    </div>
  );
}

export function WeatherPlayground() {
  const [source, setSource] = useState<Source>('live');
  const [place, setPlace] = useState<Place>('auto');
  const [compact, setCompact] = useState(false);
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('fahrenheit');
  const [windSpeedUnit, setWindSpeedUnit] = useState<WindSpeedUnit>('mph');
  const [forecastDays, setForecastDays] = useState(5);
  const [forecastHours, setForecastHours] = useState(12);
  const [copied, setCopied] = useState(false);

  const places: { value: Place; label: string }[] =
    source === 'live'
      ? [
          { value: 'auto', label: 'My location (IP)' },
          ...LIVE_CITIES.map((c) => ({ value: c.label, label: c.label })),
          { value: 'multi', label: 'Several cities' },
        ]
      : [
          ...SCENARIO_NAMES.map((s) => ({ value: s, label: `${SCENARIOS[s].city} (${s})` })),
          { value: 'multi', label: 'All four' },
        ];

  const switchSource = (next: Source) => {
    setSource(next);
    setPlace(next === 'live' ? 'auto' : 'sunny');
  };

  // Everything the widget gets, minus the fixture provider (a function).
  const props = useMemo(() => {
    const base: Record<string, unknown> = { forecastDays, forecastHours, temperatureUnit, windSpeedUnit };
    if (compact) base.compact = true;
    if (source === 'live') {
      if (place === 'multi') base.locations = LIVE_CITIES.slice(0, 4).map((c) => ({ ...c }));
      else if (place !== 'auto') {
        const c = LIVE_CITIES.find((city) => city.label === place)!;
        Object.assign(base, { latitude: c.latitude, longitude: c.longitude, location: { city: c.label, timezone: c.timezone } });
      }
    } else if (place === 'multi') {
      base.locations = SCENARIO_LOCATIONS;
    } else {
      Object.assign(base, scenarioLocation(place as Scenario));
    }
    return base;
  }, [source, place, compact, temperatureUnit, windSpeedUnit, forecastDays, forecastHours]);

  const weatherProviders = useMemo(
    () => (source === 'sample' ? [fixtureProvider(place === 'multi' ? 'sunny' : (place as Scenario))] : undefined),
    [source, place]
  );

  const code = useMemo(() => {
    const lines = Object.entries(props).map(([key, value]) => {
      if (value === true) return `  ${key}`;
      if (typeof value === 'string') return `  ${key}="${value}"`;
      if (typeof value === 'number') return `  ${key}={${value}}`;
      return `  ${key}={${JSON.stringify(value)}}`;
    });
    return `import { WeatherForecast } from 'use-weather-forecast';\n\n<WeatherForecast\n${lines.join('\n')}\n/>`;
  }, [props]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the code is still selectable */
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-5 rounded-xl border border-fd-border bg-fd-card p-5">
        <Field label="Data" hint={source === 'live' ? 'Open-Meteo, located by IP unless you pick a city.' : 'Fixed sample forecasts. No network.'}>
          <Segmented
            label="Data source"
            value={source}
            onChange={switchSource}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'sample', label: 'Sample data' },
            ]}
          />
        </Field>

        <Field label="Location">
          <select
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm"
          >
            {places.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Layout">
          <Segmented
            label="Layout"
            value={compact ? 'compact' : 'full'}
            onChange={(v) => setCompact(v === 'compact')}
            options={[
              { value: 'full', label: 'Full' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </Field>

        <Field label="Temperature">
          <Segmented
            label="Temperature unit"
            value={temperatureUnit}
            onChange={setTemperatureUnit}
            options={[
              { value: 'fahrenheit', label: '°F' },
              { value: 'celsius', label: '°C' },
            ]}
          />
        </Field>

        <Field label="Wind">
          <Segmented
            label="Wind speed unit"
            value={windSpeedUnit}
            onChange={setWindSpeedUnit}
            options={WIND_UNITS.map((u) => ({ value: u, label: u === 'ms' ? 'm/s' : u === 'kmh' ? 'km/h' : u }))}
          />
        </Field>

        <Field label={`Days: ${forecastDays}`}>
          <input type="range" min={1} max={16} value={forecastDays} onChange={(e) => setForecastDays(Number(e.target.value))} />
        </Field>

        <Field label={`Hours: ${forecastHours}`} hint={compact ? 'The compact card shows days only.' : undefined}>
          <input type="range" min={1} max={48} value={forecastHours} onChange={(e) => setForecastHours(Number(e.target.value))} />
        </Field>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        <div className="min-h-48 rounded-xl border border-fd-border bg-fd-muted/40 p-4 sm:p-6">
          <WeatherForecast {...props} weatherProviders={weatherProviders} />
        </div>

        <div className="relative rounded-xl border border-fd-border bg-fd-card">
          <button
            type="button"
            onClick={copy}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-xs"
            aria-label="Copy code"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <pre className="overflow-x-auto p-4 pr-20 text-sm">
            <code>{code}</code>
          </pre>
        </div>
        {source === 'sample' && (
          <p className="text-xs text-fd-muted-foreground">
            Sample data comes from a custom provider passed as <code>weatherProviders</code>; the snippet leaves it out, so in your
            app the same props fetch live weather.
          </p>
        )}
      </section>
    </div>
  );
}

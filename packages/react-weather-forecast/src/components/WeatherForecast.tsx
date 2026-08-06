import React, { useEffect, useState } from 'react';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import type { HourlyWeather, TemperatureUnit, WeatherForecastOptions, WindSpeedUnit } from '../types';
import { WeatherIcon } from '../icons/WeatherIcon';
import { WindIcon } from '../icons/weather-icons';

type Props = WeatherForecastOptions & {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
};

const WIND_SPEED_UNIT_LABELS: Record<WindSpeedUnit, string> = {
  kmh: 'km/h',
  mph: 'mph',
  ms: 'm/s',
  kn: 'kn',
};

function closestHour(hourly: HourlyWeather[], targetTime: Date): HourlyWeather | undefined {
  return hourly.reduce<HourlyWeather | undefined>((closest, hour) => {
    const diff = Math.abs(new Date(hour.time).getTime() - targetTime.getTime());
    const closestDiff = closest ? Math.abs(new Date(closest.time).getTime() - targetTime.getTime()) : Infinity;
    return diff < closestDiff ? hour : closest;
  }, undefined);
}

// Format a real instant in a specific IANA timezone, falling back to the
// browser's local zone if the timezone string is missing or invalid.
function formatInZone(instant: Date, timezone: string | undefined, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat([], { ...options, timeZone: timezone || undefined }).format(instant);
  } catch {
    return new Intl.DateTimeFormat([], options).format(instant);
  }
}

const styles = {
  root: {
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    background: '#fff',
    color: '#111827',
    maxWidth: 640,
  } as React.CSSProperties,
  row: { display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  hours: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 } as React.CSSProperties,
  hourCard: { minWidth: 72, textAlign: 'center' as const, padding: 8, borderRadius: 8, background: '#f9fafb' },
  dayRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' } as React.CSSProperties,
  compactRoot: { fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', borderRadius: 8 } as React.CSSProperties,
  compactHeader: { display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
  compactHeaderText: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } as React.CSSProperties,
  compactDateTime: { fontSize: 11, opacity: 0.7 } as React.CSSProperties,
  compactStats: { display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  compactStat: { display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' } as React.CSSProperties,
  unitSwitch: { display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' } as React.CSSProperties,
  rain: { color: '#2563eb', whiteSpace: 'nowrap' } as React.CSSProperties,
  tz: { fontSize: 12, opacity: 0.7, marginTop: 2 } as React.CSSProperties,
  list: { display: 'flex', flexDirection: 'column' } as React.CSSProperties,
};

// Precipitation chance is only surfaced when there is a non-zero chance of it.
function RainBadge({ probability, compact }: { probability?: number; compact?: boolean }) {
  if (probability === undefined || probability === null || probability <= 0) return null;
  return <span style={styles.rain}>{compact ? ` · ${probability}%` : ` · ${probability}% rain`}</span>;
}

/**
 * Renders one location's forecast: a live current time (ticking, in the
 * location's own timezone), a clickable degF / degC unit switch, high/low and
 * precipitation for the next hours and days.
 */
function SingleWeatherForecast(props: Props) {
  // Temperature unit is local state so the degF / degC switch can toggle it;
  // it is seeded from (and re-synced to) the temperatureUnit prop.
  const [unit, setUnit] = useState<TemperatureUnit>(props.temperatureUnit ?? 'fahrenheit');
  useEffect(() => {
    setUnit(props.temperatureUnit ?? 'fahrenheit');
  }, [props.temperatureUnit]);

  const { data, loading, error } = useWeatherForecast({ ...props, temperatureUnit: unit });

  // A ticking clock so the displayed current time stays accurate to the second.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleUnit = () => setUnit((u) => (u === 'celsius' ? 'fahrenheit' : 'celsius'));

  const renderUnitSwitch = (fontSize: number) => (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        toggleUnit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleUnit();
        }
      }}
      title="Switch temperature units"
      aria-label={`Switch temperature units, currently ${unit === 'celsius' ? 'Celsius' : 'Fahrenheit'}`}
      style={{ ...styles.unitSwitch, fontSize }}
    >
      <span style={{ fontWeight: unit === 'fahrenheit' ? 700 : 400, opacity: unit === 'fahrenheit' ? 1 : 0.45 }}>&deg;F</span>
      <span style={{ opacity: 0.4, margin: '0 3px' }}>|</span>
      <span style={{ fontWeight: unit === 'celsius' ? 700 : 400, opacity: unit === 'celsius' ? 1 : 0.45 }}>&deg;C</span>
    </span>
  );

  // Keep showing the last forecast while a unit switch refetches in the
  // background; only suppress output on the very first load.
  if (loading && !data) return null;
  if (error) return <div className={props.className} style={props.style}>Error: {error.message}</div>;
  if (!data) return <div className={props.className} style={props.style}>No forecast available.</div>;

  const timezone = data.location?.timezone;
  const currentDate = formatInZone(now, timezone, { weekday: 'short', month: 'short', day: 'numeric' });
  const currentTime = formatInZone(now, timezone, { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });

  if (props.compact) {
    const forecastBase = new Date(data.current.time);
    const today = data.daily[0];
    const tomorrow = data.daily[1];
    const in6Hours = closestHour(data.hourly, new Date(forecastBase.getTime() + 6 * 60 * 60 * 1000));
    const windSpeedUnitLabel = WIND_SPEED_UNIT_LABELS[props.windSpeedUnit ?? 'mph'];

    return (
      <div className={props.className} style={{ ...styles.compactRoot, ...props.style }}>
        <div style={styles.compactHeader}>
          <WeatherIcon condition={data.current.icon} width={24} height={24} title="Current weather" />
          <div>
            <div style={styles.compactHeaderText}>
              <strong style={{ fontSize: 16 }}>{data.current.temperature}</strong>
              {renderUnitSwitch(12)}
              <span style={{ fontSize: 14, opacity: 0.8 }}>
                {data.location?.city || 'Current location'}
              </span>
            </div>
            <div style={styles.compactDateTime}>
              {currentDate}
              {' · '}
              {currentTime}
            </div>
          </div>
        </div>

        <div style={styles.compactStats}>
          {today && (
            <span style={styles.compactStat}>
              <WeatherIcon condition={today.icon} width={16} height={16} title="Today's high and low" />
              {today.max}&deg; / {today.min}&deg;
              <RainBadge probability={today.precipitationProbabilityMax} compact />
            </span>
          )}
          {tomorrow && (
            <span style={styles.compactStat}>
              <WeatherIcon condition={tomorrow.icon} width={16} height={16} title="Tomorrow's high and low" />
              Tomorrow {tomorrow.max}&deg; / {tomorrow.min}&deg;
              <RainBadge probability={tomorrow.precipitationProbabilityMax} compact />
            </span>
          )}
          <span style={styles.compactStat}>
            <WindIcon width={16} height={16} title="Wind speed" />
            {data.current.windSpeed !== undefined ? `${Math.round(data.current.windSpeed)} ${windSpeedUnitLabel}` : '—'}
          </span>
          {in6Hours && (
            <span style={styles.compactStat}>
              <WeatherIcon condition={in6Hours.icon} width={16} height={16} title="In 6 hours" />
              {in6Hours.temperature}&deg; in 6h
              <RainBadge probability={in6Hours.precipitationProbability} compact />
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={props.className} style={{ ...styles.root, ...props.style }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 20 }}>
          {data.location?.city || 'Current location'}
          {data.location?.region ? `, ${data.location.region}` : ''}
        </h3>
        <div style={styles.tz}>
          {currentDate} &middot; {currentTime}
          {timezone ? ` · ${timezone}` : ''}
        </div>
        <div style={{ ...styles.row, marginTop: 8 }}>
          <WeatherIcon condition={data.current.icon} width={28} height={28} title="Current weather" />
          <strong style={{ fontSize: 28 }}>{data.current.temperature}</strong>
          {renderUnitSwitch(14)}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Next hours</h4>
        <div style={styles.hours}>
          {data.hourly.slice(0, props.forecastHours ?? 12).map((hour) => (
            <div key={hour.time} style={styles.hourCard}>
              <div style={{ fontSize: 12 }}>{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}</div>
              <WeatherIcon condition={hour.icon} width={20} height={20} style={{ margin: '6px auto' }} />
              <div>{hour.temperature}&deg;</div>
              {hour.precipitationProbability !== undefined && hour.precipitationProbability > 0 && (
                <div style={{ ...styles.rain, fontSize: 12 }}>{hour.precipitationProbability}%</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Next days</h4>
        <div>
          {data.daily.map((day) => (
            <div key={day.date} style={styles.dayRow}>
              <div style={{ width: 120 }}>{new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              <WeatherIcon condition={day.icon} width={20} height={20} />
              <div>
                {day.min}&deg; / {day.max}&deg;
                {day.precipitationProbabilityMax !== undefined && day.precipitationProbabilityMax > 0 && (
                  <span style={styles.rain}> &middot; {day.precipitationProbabilityMax}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Weather forecast widget. When `locations` is provided, one forecast is
 * rendered per location; otherwise a single auto-detected forecast is shown.
 */
export function WeatherForecast(props: Props) {
  const { locations, ...rest } = props;

  if (locations && locations.length > 0) {
    const gap = props.compact ? 8 : 16;
    return (
      <div style={{ ...styles.list, gap }}>
        {locations.map((loc, index) => (
          <SingleWeatherForecast
            key={`${loc.label ?? ''}:${loc.latitude ?? ''}:${loc.longitude ?? ''}:${index}`}
            {...rest}
            latitude={typeof loc.latitude === 'number' ? loc.latitude : undefined}
            longitude={typeof loc.longitude === 'number' ? loc.longitude : undefined}
            location={{ city: loc.label, timezone: loc.timezone }}
          />
        ))}
      </div>
    );
  }

  return <SingleWeatherForecast {...rest} />;
}

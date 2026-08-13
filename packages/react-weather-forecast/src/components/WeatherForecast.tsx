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

// Just the zone abbreviation (e.g. "GMT+2"), so it can be shown apart from the
// clock itself.
function zoneLabel(instant: Date, timezone: string | undefined): string {
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', timeZoneName: 'short' };
  try {
    const format = (() => {
      try {
        return new Intl.DateTimeFormat([], { ...options, timeZone: timezone || undefined });
      } catch {
        return new Intl.DateTimeFormat([], options);
      }
    })();
    return format.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

// Daily dates arrive as plain "YYYY-MM-DD" calendar days; `new Date(...)` would
// read those as UTC midnight and roll back a day in western timezones, so build
// the date from its parts and let it stay a local calendar day.
function parseCalendarDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return new Date(date);
  return new Date(year, month - 1, day);
}

// The day right after today reads better as "Tomorrow" than as its weekday.
function upcomingDayLabel(date: string, offsetFromToday: number): string {
  if (offsetFromToday === 1) return 'Tomorrow';
  return parseCalendarDate(date).toLocaleDateString([], { weekday: 'long' });
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
  // Current conditions on the left, upcoming days on the right; both columns
  // wrap to full width when the widget is too narrow to hold them side by side.
  compactBody: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 } as React.CSSProperties,
  compactCurrent: { flex: '1 1 45%', minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 } as React.CSSProperties,
  compactHeader: { display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
  compactHeaderText: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } as React.CSSProperties,
  compactTime: { fontSize: 18, fontWeight: 600, lineHeight: 1.15 } as React.CSSProperties,
  compactDate: { fontSize: 11, opacity: 0.7 } as React.CSSProperties,
  compactStats: { display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, opacity: 0.9 } as React.CSSProperties,
  // A shared grid keeps the day / icon / temps / rain / wind columns aligned
  // across every upcoming row.
  // Columns are content-sized (so no column can be squeezed away) and the spare
  // width is spread between them; that also makes the grid's min-content width
  // large enough to wrap below the current conditions on narrow screens.
  upcoming: {
    flex: '1 1 260px',
    display: 'grid',
    gridTemplateColumns: 'auto auto auto auto auto',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 10,
    rowGap: 6,
    fontSize: 12,
  } as React.CSSProperties,
  upcomingDay: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.85 } as React.CSSProperties,
  upcomingTemps: { whiteSpace: 'nowrap', textAlign: 'right' } as React.CSSProperties,
  upcomingMetric: { whiteSpace: 'nowrap', textAlign: 'right', opacity: 0.7 } as React.CSSProperties,
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
  // The compact layout shows the clock at a larger size, so the zone label is
  // split off onto the smaller date line to keep the time on one line.
  const currentClock = formatInZone(now, timezone, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const currentZone = zoneLabel(now, timezone);

  if (props.compact) {
    const forecastBase = new Date(data.current.time);
    const today = data.daily[0];
    const in6Hours = closestHour(data.hourly, new Date(forecastBase.getTime() + 6 * 60 * 60 * 1000));
    const windSpeedUnitLabel = WIND_SPEED_UNIT_LABELS[props.windSpeedUnit ?? 'mph'];
    // Today already has its own column on the left, so the upcoming list starts
    // at tomorrow and stays short enough to sit beside it.
    const upcomingDays = data.daily.slice(1, 5);

    return (
      <div className={props.className} style={{ ...styles.compactRoot, ...props.style }}>
        <div style={styles.compactBody}>
          <div style={styles.compactCurrent}>
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
                <div style={styles.compactTime}>{currentClock}</div>
                <div style={styles.compactDate}>
                  {currentDate}
                  {currentZone ? ` · ${currentZone}` : ''}
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

          {upcomingDays.length > 0 && (
            <div style={styles.upcoming}>
              {upcomingDays.map((day, index) => (
                <React.Fragment key={day.date}>
                  <span style={styles.upcomingDay}>{upcomingDayLabel(day.date, index + 1)}</span>
                  <WeatherIcon condition={day.icon} width={16} height={16} />
                  <span style={styles.upcomingTemps}>
                    <strong>{day.max}&deg;</strong>
                    <span style={{ opacity: 0.7 }}> / {day.min}&deg;</span>
                  </span>
                  <span style={styles.upcomingMetric}>
                    {day.precipitationSum !== undefined ? `${day.precipitationSum.toFixed(1)} mm` : '—'}
                  </span>
                  <span style={styles.upcomingMetric}>
                    {day.windSpeedMax !== undefined ? `${day.windSpeedMax.toFixed(1)} ${windSpeedUnitLabel}` : '—'}
                  </span>
                </React.Fragment>
              ))}
            </div>
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

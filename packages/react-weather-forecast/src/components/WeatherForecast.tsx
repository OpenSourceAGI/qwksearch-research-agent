import React, { useEffect, useState } from 'react';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import type { DailyWeather, TemperatureUnit, WeatherForecastOptions, WindSpeedUnit } from '../types';
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

// Format a real instant in a specific IANA timezone, falling back to the
// browser's local zone if the timezone string is missing or invalid.
function formatInZone(instant: Date, timezone: string | undefined, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat([], { ...options, timeZone: timezone || undefined }).format(instant);
  } catch {
    return new Intl.DateTimeFormat([], options).format(instant);
  }
}

// The clock is shown with the hour and minute large and the seconds (plus any
// AM/PM marker) trailing in a smaller, dimmer size, so split it into those two
// halves. Falls back to one undivided string if the locale's parts are not
// where we expect them.
function clockParts(instant: Date, timezone: string | undefined): { main: string; tail: string } {
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit' };
  const format = (() => {
    try {
      return new Intl.DateTimeFormat([], { ...options, timeZone: timezone || undefined });
    } catch {
      return new Intl.DateTimeFormat([], options);
    }
  })();
  const parts = format.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  const hour = part('hour');
  const minute = part('minute');
  const second = part('second');
  if (!hour || !minute || !second) return { main: format.format(instant), tail: '' };
  const dayPeriod = part('dayPeriod');
  return { main: `${hour}:${minute}`, tail: `:${second}${dayPeriod ? ` ${dayPeriod}` : ''}` };
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

// The upcoming days share the compact card's single row, so they are labelled
// with the abbreviated weekday ("Fri") rather than a full name or "Tomorrow".
function upcomingDayLabel(date: string): string {
  return parseCalendarDate(date).toLocaleDateString([], { weekday: 'short' });
}

// Daily totals that have no room of their own in the one-row card are kept as
// hover text so the detail is still reachable.
function upcomingDayDetail(day: DailyWeather, windSpeedUnitLabel: string): string | undefined {
  const details: string[] = [];
  if (day.precipitationSum !== undefined) details.push(`${day.precipitationSum.toFixed(1)} mm`);
  if (day.windSpeedMax !== undefined) details.push(`${day.windSpeedMax.toFixed(1)} ${windSpeedUnitLabel} wind`);
  return details.length > 0 ? details.join(' · ') : undefined;
}

/** Height, in pixels, of the compact card's single row (and so of the whole card). */
const COMPACT_ROW_HEIGHT = 36;

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
  // The compact card is a **single row**: every piece of it sits on one line
  // of fixed height, so the card is never taller than `COMPACT_ROW_HEIGHT`.
  // On the homepage it sits under the trending-news widget and above the chat
  // input, and every pixel it takes is one the input box loses on a laptop
  // screen — so it never grows a second line.
  //
  // It is fluid in width. The cells are laid out in priority order (place,
  // temperature, today's range, wind, clock, the next three days, date) in a
  // wrapping flex row whose height is one row and whose overflow is hidden: when the
  // container is too narrow for everything, the trailing cells wrap onto a
  // second line that is clipped away, so whole cells drop off the end instead
  // of the card growing taller or a label being cut in half.
  compactRoot: {
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    columnGap: 9,
    rowGap: 0,
    height: COMPACT_ROW_HEIGHT,
    overflow: 'hidden',
    padding: '0 12px',
    borderRadius: 12,
    width: '100%',
    boxSizing: 'border-box',
    fontSize: 11,
    lineHeight: 1.2,
  } as React.CSSProperties,
  // Every top-level cell is exactly one row tall, which is what makes the
  // first flex line fill the card and pushes any wrapped cell out of view.
  compactCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    height: COMPACT_ROW_HEIGHT,
    whiteSpace: 'nowrap',
    flex: 'none',
  } as React.CSSProperties,
  // A long place name is cut with an ellipsis rather than pushing the rest of
  // the row off the card.
  compactCity: {
    fontSize: 12,
    fontWeight: 700,
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,
  compactTemp: { fontSize: 16, fontWeight: 600, lineHeight: 1 } as React.CSSProperties,
  compactTime: { fontSize: 13, fontWeight: 600, lineHeight: 1 } as React.CSSProperties,
  compactSeconds: { fontSize: 9, fontWeight: 500, opacity: 0.6, marginLeft: 1 } as React.CSSProperties,
  compactZone: { fontSize: 10, opacity: 0.6, marginLeft: 4 } as React.CSSProperties,
  // The date is the last cell and is pushed to the far right, so it is the
  // first thing to drop when the row runs out of room (it is also on the
  // clock's hover text).
  compactDate: { fontSize: 10, opacity: 0.6, marginLeft: 'auto' } as React.CSSProperties,
  // The first upcoming day carries the divider, so the divider drops away
  // together with the days when there is no room for them.
  upcomingFirst: {
    paddingLeft: 10,
    borderLeft: '1px solid currentColor',
    borderLeftColor: 'rgba(128,128,128,0.25)',
  } as React.CSSProperties,
  upcomingDay: { display: 'flex', alignItems: 'center', gap: 3, height: 20, whiteSpace: 'nowrap' } as React.CSSProperties,
  upcomingDayName: { opacity: 0.7 } as React.CSSProperties,
  upcomingTemps: { whiteSpace: 'nowrap' } as React.CSSProperties,
  unitSwitch: { display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' } as React.CSSProperties,
  rain: { color: '#2563eb', whiteSpace: 'nowrap' } as React.CSSProperties,
  tz: { fontSize: 12, opacity: 0.7, marginTop: 2 } as React.CSSProperties,
  list: { display: 'flex', flexDirection: 'column' } as React.CSSProperties,
};

// Precipitation chance is only surfaced once it represents a meaningful risk.
const RAIN_RISK_THRESHOLD = 2;

function RainBadge({ probability, compact }: { probability?: number; compact?: boolean }) {
  if (probability === undefined || probability === null || probability <= RAIN_RISK_THRESHOLD) return null;
  // The compact card puts the badge in a flex cell, where a leading space
  // would be trimmed, so it is spaced with a margin there instead.
  if (compact) return <span style={{ ...styles.rain, marginLeft: 6 }}>{probability}%</span>;
  return <span style={styles.rain}> · {probability}% rain</span>;
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
      <span style={{ opacity: 0.4, margin: '0 4px' }}>|</span>
      <span style={{ fontWeight: unit === 'celsius' ? 700 : 400, opacity: unit === 'celsius' ? 1 : 0.45 }}>&deg;C</span>
    </span>
  );

  // Keep showing the last forecast while a unit switch refetches in the
  // background; only suppress output on the very first load.
  if (loading && !data) return null;
  // A failed refetch (a rate limit, say) leaves the previous forecast on
  // screen; the error only takes over when there is nothing to show.
  if (error && !data) return <div className={props.className} style={props.style}>Error: {error.message}</div>;
  if (!data) return <div className={props.className} style={props.style}>No forecast available.</div>;

  const timezone = data.location?.timezone;
  const currentDate = formatInZone(now, timezone, { weekday: 'short', month: 'short', day: 'numeric' });
  const currentTime = formatInZone(now, timezone, { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  // The compact layout shows the clock at a larger size, so the zone label is
  // split off and shown beside it in a smaller size.
  const currentClock = clockParts(now, timezone);
  const currentZone = zoneLabel(now, timezone);

  if (props.compact) {
    const today = data.daily[0];
    const windSpeedUnitLabel = WIND_SPEED_UNIT_LABELS[props.windSpeedUnit ?? 'mph'];
    // Today is already summarised in its own cell, so the upcoming-days
    // section starts at tomorrow and shows the next three days.
    const upcomingDays = data.daily.slice(1, 4);
    const placeName = `${data.location?.city || 'Current location'}${data.location?.region ? `, ${data.location.region}` : ''}`;

    return (
      <div className={props.className} style={{ ...styles.compactRoot, ...props.style }}>
        <div style={{ ...styles.compactCell, ...styles.compactCity }} title={placeName}>
          {placeName}
        </div>

        <div style={styles.compactCell}>
          <WeatherIcon condition={data.current.icon} width={20} height={20} title="Current weather" />
          <strong style={styles.compactTemp}>{data.current.temperature}</strong>
          {renderUnitSwitch(11)}
        </div>

        {/* Today's range sits right after the current temperature, which
            already carries the condition icon, so it needs no icon of its own. */}
        {today && (
          <div style={{ ...styles.compactCell, gap: 0 }} title="Today's high and low">
            {today.max}&deg;<span style={{ opacity: 0.6 }}>&nbsp;/ {today.min}&deg;</span>
            <RainBadge probability={today.precipitationProbabilityMax} compact />
          </div>
        )}

        <div style={{ ...styles.compactCell, gap: 4 }}>
          <WindIcon width={14} height={14} title="Wind speed" />
          {data.current.windSpeed !== undefined ? `${Math.round(data.current.windSpeed)} ${windSpeedUnitLabel}` : '—'}
        </div>

        <div style={{ ...styles.compactCell, gap: 0 }} title={`${currentDate}${currentZone ? ` · ${currentZone}` : ''}`}>
          <span style={styles.compactTime}>{currentClock.main}</span>
          {currentClock.tail && <span style={styles.compactSeconds}>{currentClock.tail}</span>}
          {currentZone && <span style={styles.compactZone}>{currentZone}</span>}
        </div>

        {upcomingDays.map((day, index) => (
          <div key={day.date} style={{ ...styles.compactCell, gap: 0 }}>
            <div
              style={{ ...styles.upcomingDay, ...(index === 0 ? styles.upcomingFirst : null) }}
              title={upcomingDayDetail(day, windSpeedUnitLabel)}
            >
              <span style={styles.upcomingDayName}>{upcomingDayLabel(day.date)}</span>
              <WeatherIcon condition={day.icon} width={13} height={13} />
              <span style={styles.upcomingTemps}>
                <strong>{day.max}&deg;</strong>
                <span style={{ opacity: 0.6 }}>/{day.min}&deg;</span>
              </span>
              {day.precipitationProbabilityMax !== undefined && day.precipitationProbabilityMax > RAIN_RISK_THRESHOLD && (
                <span style={{ ...styles.rain, fontSize: 10 }}>{day.precipitationProbabilityMax}%</span>
              )}
            </div>
          </div>
        ))}

        <div style={{ ...styles.compactCell, ...styles.compactDate }}>{currentDate}</div>
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
                {day.precipitationProbabilityMax !== undefined && day.precipitationProbabilityMax > RAIN_RISK_THRESHOLD && (
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

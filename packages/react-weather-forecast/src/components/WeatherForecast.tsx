import React, { useEffect, useState } from 'react';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import type { DailyWeather, HourlyWeather, TemperatureUnit, WeatherForecastOptions, WindSpeedUnit } from '../types';
import { WeatherIcon } from '../icons/WeatherIcon';
import { WindIcon } from '../icons/weather-icons';
import { DateCalendar, isSameDay } from './DateCalendar';
import { formatPlace } from '../lib/regions';

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

// Wind speeds and rainfall below this are too marginal to be worth the space.
const MARGINAL_THRESHOLD = 1;

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

function partsInZone(
  instant: Date,
  timezone: string | undefined,
  options: Intl.DateTimeFormatOptions
): Record<string, string> {
  const build = () => {
    try {
      return new Intl.DateTimeFormat([], { ...options, timeZone: timezone || undefined });
    } catch {
      return new Intl.DateTimeFormat([], options);
    }
  };
  return build()
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
}

// Just the zone abbreviation (e.g. "GMT+2"), so it can be shown apart from the
// clock itself.
function zoneLabel(instant: Date, timezone: string | undefined): string {
  return partsInZone(instant, timezone, { hour: 'numeric', timeZoneName: 'short' }).timeZoneName ?? '';
}

// The location's own calendar day, as a Date in the browser's zone, so the
// calendar highlights the day it is *there* rather than here.
function calendarDayInZone(instant: Date, timezone: string | undefined): Date {
  const parts = partsInZone(instant, timezone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  if (!year || !month || !day) return new Date(instant);
  return new Date(year, month - 1, day);
}

// Daily dates arrive as plain "YYYY-MM-DD" calendar days; `new Date(...)` would
// read those as UTC midnight and roll back a day in western timezones, so build
// the date from its parts and let it stay a local calendar day.
function parseCalendarDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return new Date(date);
  return new Date(year, month - 1, day);
}

// Upcoming days read as short weekdays — "Wed", "Thu" — rather than "Tomorrow".
function shortWeekday(date: string): string {
  return parseCalendarDate(date).toLocaleDateString([], { weekday: 'short' });
}

const styles = {
  root: {
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 10,
    background: '#fff',
    color: '#111827',
    maxWidth: 460,
    boxSizing: 'border-box',
  } as React.CSSProperties,
  row: { display: 'flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  hours: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 } as React.CSSProperties,
  hourCard: { minWidth: 52, textAlign: 'center' as const, padding: 6, borderRadius: 8, background: '#f9fafb' },
  dayRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid #f3f4f6' } as React.CSSProperties,
  compactRoot: { fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', borderRadius: 8, maxWidth: 420, boxSizing: 'border-box' } as React.CSSProperties,
  // Current conditions on the left, upcoming days on the right; both columns
  // wrap to full width when the widget is too narrow to hold them side by side.
  compactBody: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 } as React.CSSProperties,
  compactCurrent: { flex: '1 1 150px', minWidth: 132, display: 'flex', flexDirection: 'column', gap: 2 } as React.CSSProperties,
  // The place name is the widget's title, so it gets its own line above the
  // reading rather than competing with it for space.
  compactTitle: { fontSize: 13, fontWeight: 600, lineHeight: 1.2 } as React.CSSProperties,
  compactHeader: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } as React.CSSProperties,
  compactTime: { fontSize: 16, fontWeight: 600, lineHeight: 1.15 } as React.CSSProperties,
  seconds: { fontSize: 9, opacity: 0.6, fontWeight: 400 } as React.CSSProperties,
  // No opacity on this row: it hosts the calendar popover, and an ancestor's
  // opacity would make the whole panel translucent. The pieces are dimmed
  // individually instead.
  compactDate: { fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 } as React.CSSProperties,
  zone: { opacity: 0.7 } as React.CSSProperties,
  compactStats: { display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, opacity: 0.9 } as React.CSSProperties,
  compactStat: { display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' } as React.CSSProperties,
  // A shared grid keeps the day / icon / temps / rain / wind columns aligned
  // across every upcoming row. Columns are content-sized so none can be
  // squeezed away, and the spare width is spread between them.
  upcoming: {
    flex: '1 1 190px',
    display: 'grid',
    gridTemplateColumns: 'auto auto auto auto auto',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 3,
    fontSize: 11,
  } as React.CSSProperties,
  upcomingDay: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.85 } as React.CSSProperties,
  upcomingTemps: { whiteSpace: 'nowrap', textAlign: 'right' } as React.CSSProperties,
  upcomingMetric: { whiteSpace: 'nowrap', textAlign: 'right', opacity: 0.7 } as React.CSSProperties,
  unitSwitch: { display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', fontWeight: 600 } as React.CSSProperties,
  rain: { color: '#2563eb', whiteSpace: 'nowrap' } as React.CSSProperties,
  tz: { fontSize: 11, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 } as React.CSSProperties,
};

// Precipitation chance is only surfaced once it is more than marginal.
function RainBadge({ probability, compact }: { probability?: number; compact?: boolean }) {
  if (probability === undefined || probability === null || probability <= MARGINAL_THRESHOLD) return null;
  return <span style={styles.rain}>{compact ? ` · ${probability}%` : ` · ${probability}% rain`}</span>;
}

/**
 * The location's current clock, ticking to the second, with the seconds
 * rendered small so the hour and minute stay the prominent part.
 */
function Clock({ now, timezone }: { now: Date; timezone?: string }) {
  const parts = partsInZone(now, timezone, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  return (
    <div style={styles.compactTime}>
      {parts.hour}:{parts.minute}
      <span style={styles.seconds}>:{parts.second}</span>
      {parts.dayPeriod ? <span style={{ fontSize: 10, opacity: 0.7 }}> {parts.dayPeriod}</span> : null}
    </div>
  );
}

/**
 * Renders one location's forecast: a live current time (ticking, in the
 * location's own timezone), a clickable degree-unit switch, a browsable
 * calendar on the date, and high/low, rain and wind for the days ahead.
 */
export function WeatherForecast(props: Props) {
  // Temperature unit is local state so the degree switch can toggle it; it is
  // seeded from (and re-synced to) the temperatureUnit prop.
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

  // A day picked from the calendar; when it falls inside the forecast range its
  // conditions replace today's in the summary line.
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const toggleUnit = () => setUnit((u) => (u === 'celsius' ? 'fahrenheit' : 'celsius'));

  // Only the unit in force is shown; clicking the letter swaps to the other one.
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
      title={`Switch to ${unit === 'celsius' ? 'Fahrenheit' : 'Celsius'}`}
      aria-label={`Switch temperature units, currently ${unit === 'celsius' ? 'Celsius' : 'Fahrenheit'}`}
      style={{ ...styles.unitSwitch, fontSize }}
    >
      &deg;{unit === 'celsius' ? 'C' : 'F'}
    </span>
  );

  // Keep showing the last forecast while a unit switch refetches in the
  // background; only suppress output on the very first load.
  if (loading && !data) return null;
  if (error) return <div className={props.className} style={props.style}>Error: {error.message}</div>;
  if (!data) return <div className={props.className} style={props.style}>No forecast available.</div>;

  const timezone = data.location?.timezone;
  const place = formatPlace(data.location?.city, data.location?.region);
  const currentDate = formatInZone(now, timezone, { weekday: 'short', month: 'short', day: 'numeric' });
  const currentZone = zoneLabel(now, timezone);
  const localToday = calendarDayInZone(now, timezone);
  const windSpeedUnitLabel = WIND_SPEED_UNIT_LABELS[props.windSpeedUnit ?? 'mph'];

  // A wind reading only earns its space once it is above a stiff breeze's worth
  // of rounding noise.
  const currentWind =
    data.current.windSpeed !== undefined && data.current.windSpeed > MARGINAL_THRESHOLD
      ? `${Math.round(data.current.windSpeed)} ${windSpeedUnitLabel}`
      : undefined;

  const calendar = (fontSize: number) => (
    <DateCalendar
      label={currentDate}
      today={localToday}
      selected={selectedDate}
      onSelect={setSelectedDate}
      fontSize={fontSize}
    />
  );

  if (props.compact) {
    const forecastBase = new Date(data.current.time);
    const in6Hours = closestHour(data.hourly, new Date(forecastBase.getTime() + 6 * 60 * 60 * 1000));
    // The calendar can point the summary line at any day in the forecast range;
    // otherwise it stays on today.
    const summaryDay: DailyWeather | undefined = selectedDate
      ? data.daily.find((day) => isSameDay(parseCalendarDate(day.date), selectedDate)) ?? data.daily[0]
      : data.daily[0];
    const summaryLabel =
      summaryDay && selectedDate && !isSameDay(parseCalendarDate(summaryDay.date), localToday)
        ? shortWeekday(summaryDay.date)
        : undefined;
    // Today already has its own column on the left, so the upcoming list starts
    // at tomorrow and stays short enough to sit beside it.
    const upcomingDays = data.daily.slice(1, 5);

    return (
      <div className={props.className} style={{ ...styles.compactRoot, ...props.style }}>
        <div style={styles.compactBody}>
          <div style={styles.compactCurrent}>
            <div style={styles.compactTitle}>{place}</div>

            <div style={styles.compactHeader}>
              <WeatherIcon condition={data.current.icon} width={20} height={20} title="Current weather" />
              <strong style={{ fontSize: 16 }}>{data.current.temperature}</strong>
              {renderUnitSwitch(11)}
              {in6Hours && (
                <span style={{ ...styles.compactStat, fontSize: 11, opacity: 0.75 }}>
                  <WeatherIcon condition={in6Hours.icon} width={14} height={14} title="In 6 hours" />
                  {in6Hours.temperature}&deg; 6h
                  <RainBadge probability={in6Hours.precipitationProbability} compact />
                </span>
              )}
            </div>

            <Clock now={now} timezone={timezone} />

            <div style={styles.compactDate}>
              {calendar(10)}
              {currentZone ? <span style={styles.zone}>&middot; {currentZone}</span> : null}
            </div>

            <div style={styles.compactStats}>
              {summaryDay && (
                <span style={styles.compactStat}>
                  <WeatherIcon condition={summaryDay.icon} width={14} height={14} title="High and low" />
                  {summaryLabel ? `${summaryLabel} ` : ''}
                  {summaryDay.max}&deg; / {summaryDay.min}&deg;
                  <RainBadge probability={summaryDay.precipitationProbabilityMax} compact />
                </span>
              )}
              {currentWind && (
                <span style={styles.compactStat}>
                  <WindIcon width={14} height={14} title="Wind speed" />
                  {currentWind}
                </span>
              )}
            </div>
          </div>

          {upcomingDays.length > 0 && (
            <div style={styles.upcoming}>
              {upcomingDays.map((day) => (
                <React.Fragment key={day.date}>
                  <span style={styles.upcomingDay}>{shortWeekday(day.date)}</span>
                  <WeatherIcon condition={day.icon} width={14} height={14} />
                  <span style={styles.upcomingTemps}>
                    <strong>{day.max}&deg;</strong>
                    <span style={{ opacity: 0.7 }}> / {day.min}&deg;</span>
                  </span>
                  <span style={styles.upcomingMetric}>
                    {day.precipitationSum !== undefined && day.precipitationSum > MARGINAL_THRESHOLD
                      ? `${day.precipitationSum.toFixed(1)} mm`
                      : ''}
                  </span>
                  <span style={styles.upcomingMetric}>
                    {day.windSpeedMax !== undefined && day.windSpeedMax > MARGINAL_THRESHOLD
                      ? `${Math.round(day.windSpeedMax)} ${windSpeedUnitLabel}`
                      : ''}
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
        <h3 style={{ margin: 0, fontSize: 18 }}>{place}</h3>
        <div style={styles.tz}>
          {calendar(11)}
          <Clock now={now} timezone={timezone} />
          {currentZone ? <span style={styles.zone}>&middot; {currentZone}</span> : null}
        </div>
        <div style={{ ...styles.row, marginTop: 6 }}>
          <WeatherIcon condition={data.current.icon} width={26} height={26} title="Current weather" />
          <strong style={{ fontSize: 26 }}>{data.current.temperature}</strong>
          {renderUnitSwitch(13)}
          {currentWind && (
            <span style={{ ...styles.compactStat, fontSize: 12, opacity: 0.8 }}>
              <WindIcon width={14} height={14} title="Wind speed" />
              {currentWind}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: 13 }}>Next hours</h4>
        <div style={styles.hours}>
          {data.hourly.slice(0, props.forecastHours ?? 12).map((hour) => (
            <div key={hour.time} style={styles.hourCard}>
              <div style={{ fontSize: 11 }}>{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}</div>
              <WeatherIcon condition={hour.icon} width={18} height={18} style={{ margin: '4px auto' }} />
              <div style={{ fontSize: 12 }}>{hour.temperature}&deg;</div>
              {hour.precipitationProbability !== undefined && hour.precipitationProbability > MARGINAL_THRESHOLD && (
                <div style={{ ...styles.rain, fontSize: 11 }}>{hour.precipitationProbability}%</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: 13 }}>Next days</h4>
        <div>
          {data.daily.map((day) => (
            <div key={day.date} style={styles.dayRow}>
              <div style={{ width: 44 }}>{shortWeekday(day.date)}</div>
              <WeatherIcon condition={day.icon} width={18} height={18} />
              <div style={{ fontSize: 12 }}>
                {day.min}&deg; / {day.max}&deg;
                <RainBadge probability={day.precipitationProbabilityMax} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {day.windSpeedMax !== undefined && day.windSpeedMax > MARGINAL_THRESHOLD
                  ? `${Math.round(day.windSpeedMax)} ${windSpeedUnitLabel}`
                  : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

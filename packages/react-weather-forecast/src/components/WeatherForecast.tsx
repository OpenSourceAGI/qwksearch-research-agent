import React from 'react';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import type { HourlyWeather, WeatherForecastOptions, WindSpeedUnit } from '../types';
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
};

export function WeatherForecast(props: Props) {
  const { data, loading, error } = useWeatherForecast(props);

  if (loading) return null;
  if (error) return <div className={props.className} style={props.style}>Error: {error.message}</div>;
  if (!data) return <div className={props.className} style={props.style}>No forecast available.</div>;

  if (props.compact) {
    const now = new Date(data.current.time);
    const today = data.daily[0];
    const tomorrow = data.daily[1];
    const in6Hours = closestHour(data.hourly, new Date(now.getTime() + 6 * 60 * 60 * 1000));
    const windSpeedUnitLabel = WIND_SPEED_UNIT_LABELS[props.windSpeedUnit ?? 'mph'];

    return (
      <div className={props.className} style={{ ...styles.compactRoot, ...props.style }}>
        <div style={styles.compactHeader}>
          <WeatherIcon condition={data.current.icon} width={24} height={24} title="Current weather" />
          <div>
            <div style={styles.compactHeaderText}>
              <strong style={{ fontSize: 16 }}>{data.current.temperature}°</strong>
              <span style={{ fontSize: 14, opacity: 0.8 }}>
                {data.location?.city || 'Current location'}
              </span>
            </div>
            <div style={styles.compactDateTime}>
              {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div style={styles.compactStats}>
          {today && (
            <span style={styles.compactStat}>
              <WeatherIcon condition={today.icon} width={16} height={16} title="Today's high and low" />
              {today.max}° / {today.min}°
            </span>
          )}
          {tomorrow && (
            <span style={styles.compactStat}>
              <WeatherIcon condition={tomorrow.icon} width={16} height={16} title="Tomorrow" />
              Tomorrow {tomorrow.max}°
            </span>
          )}
          <span style={styles.compactStat}>
            <WindIcon width={16} height={16} title="Wind speed" />
            {data.current.windSpeed !== undefined ? `${Math.round(data.current.windSpeed)} ${windSpeedUnitLabel}` : '—'}
          </span>
          {in6Hours && (
            <span style={styles.compactStat}>
              <WeatherIcon condition={in6Hours.icon} width={16} height={16} title="In 6 hours" />
              {in6Hours.temperature}° in 6h
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
        <div style={{ ...styles.row, marginTop: 8 }}>
          <WeatherIcon condition={data.current.icon} width={28} height={28} title="Current weather" />
          <strong style={{ fontSize: 28 }}>{data.current.temperature}°</strong>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Next hours</h4>
        <div style={styles.hours}>
          {data.hourly.slice(0, props.forecastHours ?? 12).map((hour) => (
            <div key={hour.time} style={styles.hourCard}>
              <div style={{ fontSize: 12 }}>{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}</div>
              <WeatherIcon condition={hour.icon} width={20} height={20} style={{ margin: '6px auto' }} />
              <div>{hour.temperature}°</div>
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
              <div>{day.min}° / {day.max}°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

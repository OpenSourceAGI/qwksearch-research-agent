import React from 'react';
import { useWeatherForecast } from '../hooks/useWeatherForecast';
import type { WeatherForecastOptions } from '../types';
import { WeatherIcon } from '../icons/WeatherIcon';

type Props = WeatherForecastOptions & {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
};

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
  compactRoot: { fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8 } as React.CSSProperties,
};

export function WeatherForecast(props: Props) {
  const { data, loading, error } = useWeatherForecast(props);

  if (loading) return <div className={props.className} style={props.style}>Loading weather...</div>;
  if (error) return <div className={props.className} style={props.style}>Error: {error.message}</div>;
  if (!data) return <div className={props.className} style={props.style}>No forecast available.</div>;

  if (props.compact) {
    return (
      <div className={props.className} style={{ ...styles.compactRoot, ...props.style }}>
        <WeatherIcon condition={data.current.icon} width={20} height={20} title="Current weather" />
        <strong style={{ fontSize: 16 }}>{data.current.temperature}°</strong>
        <span style={{ fontSize: 14, opacity: 0.8 }}>
          {data.location?.city || 'Current location'}
        </span>
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

/**
 * @file HeroWidget.tsx
 * @description The landing page's live widget: the visitor's own weather,
 * located by IP, in the compact layout.
 */
'use client';
import { WeatherForecast } from 'use-weather-forecast';

export function HeroWidget() {
  return (
    <div className="rounded-2xl border border-fd-border bg-fd-card/80 shadow-lg backdrop-blur">
      <WeatherForecast compact forecastDays={4} />
    </div>
  );
}

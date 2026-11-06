/**
 * @file page.tsx
 * @description The live demo: a playground for `<WeatherForecast />`.
 */
import type { Metadata } from 'next';
import { WeatherPlayground } from '@/components/demo/WeatherPlayground';
import { STORYBOOK_URL } from '@/lib/fumadocs/customize-docs';

export const metadata: Metadata = {
  title: 'Live demo | use-weather-forecast',
  description: 'Try every prop of the use-weather-forecast React widget against live Open-Meteo data or sample forecasts.',
};

export default function DemoPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Live demo</h1>
      <p className="mb-8 max-w-2xl text-fd-muted-foreground">
        Change the props on the left and copy the JSX underneath. Every variant is also in the{' '}
        <a className="underline" href={STORYBOOK_URL}>
          Storybook
        </a>
        .
      </p>
      <WeatherPlayground />
    </main>
  );
}

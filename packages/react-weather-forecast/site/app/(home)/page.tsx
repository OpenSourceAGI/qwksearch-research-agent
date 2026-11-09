/**
 * @file page.tsx
 * @description Landing page for the use-weather-forecast docs.
 */
import { BookOpen, CloudSun, Gauge, Globe, KeyRound, LayoutGrid, PlayCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { HeroWidget } from '@/components/DocsHomepage/HeroWidget';
import { buttonVariants } from '@/components/ui/button';
import { GithubIcon } from '@/components/ui/github-icon';
import { DEMO_URL, GITHUB_URL, NPM_URL, PACKAGE_GITHUB_URL, STORYBOOK_URL } from '@/lib/fumadocs/customize-docs';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: KeyRound, title: 'No API key', body: 'Open-Meteo for the forecast and ipwho.is for the location, both free and keyless.' },
  { icon: Globe, title: 'Four weather APIs', body: 'Open-Meteo, its GFS model, met.no and wttr.in, tried in order and normalized to one shape.' },
  { icon: Gauge, title: 'Cached, not polled', body: 'The forecast is cached for 30 minutes and the location for 12 hours, so a busy page stays under every quota.' },
  { icon: ShieldCheck, title: 'Fails soft', body: 'Validated requests, retries with backoff, a stale-cache fallback and whole reloads before an error is shown.' },
  { icon: CloudSun, title: 'Two layouts', body: 'A full card with hours and days, or a one-row compact card that fits above a chat box.' },
  { icon: LayoutGrid, title: 'Hook and icons', body: 'useWeatherForecast for your own UI, getWeatherForecast for no UI, and twelve SVG weather icons.' },
];

const CODE = `import { WeatherForecast } from 'use-weather-forecast';

export default function App() {
  return <WeatherForecast compact forecastDays={5} temperatureUnit="celsius" />;
}`;

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="container mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
        <div>
          <a href={NPM_URL} className="mb-4 inline-block rounded-full border border-fd-border px-3 py-1 font-mono text-xs text-fd-muted-foreground">
            npm install use-weather-forecast
          </a>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            The weather, in one <span className="text-fd-primary">React component</span>
          </h1>
          <p className="mb-8 max-w-xl text-lg text-fd-muted-foreground">
            Current conditions, the next hours and the next days for wherever your visitor is. No API key, no sign-up, and it
            keeps working when an upstream doesn&apos;t.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={DEMO_URL} className={cn(buttonVariants({ size: 'lg' }))}>
              <PlayCircle className="h-4 w-4" />
              Live demo
            </Link>
            <Link href="/docs" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              <BookOpen className="h-4 w-4" />
              Docs
            </Link>
            <a href={STORYBOOK_URL} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              <LayoutGrid className="h-4 w-4" />
              Storybook
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <HeroWidget />
          <p className="text-center text-xs text-fd-muted-foreground">Your weather, live, from the package on npm.</p>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-fd-border bg-fd-card p-5">
              <Icon className="mb-3 size-5 text-fd-primary" />
              <h2 className="mb-1 font-semibold">{title}</h2>
              <p className="text-sm text-fd-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 pb-20">
        <pre className="overflow-x-auto rounded-xl border border-fd-border bg-fd-card p-5 text-sm">
          <code>{CODE}</code>
        </pre>
      </section>

      <footer className="border-t border-fd-border py-8 text-center text-sm text-fd-muted-foreground">
        use-weather-forecast is part of the{' '}
        <a className="underline hover:text-fd-foreground" href={GITHUB_URL}>
          qwksearch-research-agent
        </a>{' '}
        monorepo ·{' '}
        <a className="inline-flex items-center gap-1 underline hover:text-fd-foreground" href={PACKAGE_GITHUB_URL}>
          <GithubIcon className="size-3.5" /> source
        </a>
      </footer>
    </main>
  );
}

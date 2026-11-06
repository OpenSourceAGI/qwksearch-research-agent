import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook for use-weather-forecast: every variant of `<WeatherForecast />`,
 * the icon set and the `useWeatherForecast` hook, each with an autodocs page.
 *
 * `npm run build-storybook` writes it into `public/storybook`, so the site's
 * Vercel build (`npm run build`) serves it at `/storybook/` beside `/docs`
 * and `/demo`. Most stories answer from `lib/fixtures.ts` through a custom
 * weather provider, so they render the same every time and spend no API
 * quota; the ones under "Live" call Open-Meteo for real.
 */
const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: { disableTelemetry: true },
  docs: { defaultName: 'Docs' },
};

export default config;

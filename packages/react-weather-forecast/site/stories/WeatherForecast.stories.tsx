import type { Meta, StoryObj } from '@storybook/react-vite';
import { WeatherForecast } from 'use-weather-forecast';
import {
  failingProviders,
  fixtureProvider,
  OFFLINE_LOCATION,
  SCENARIO_LOCATIONS,
  scenarioLocation,
} from '../lib/fixtures';

/**
 * `<WeatherForecast />` in every layout and unit it supports.
 *
 * These variants answer from sample data: `weatherProviders` takes a provider
 * object as well as an id, and `lib/fixtures.ts` supplies one that answers
 * from memory. Everything else -- validation, unit handling, the clock, the
 * degF/degC switch -- is the real component.
 */
const meta = {
  title: 'WeatherForecast/Variants',
  component: WeatherForecast,
  args: {
    ...scenarioLocation('sunny'),
    weatherProviders: [fixtureProvider('sunny')],
    forecastDays: 5,
    forecastHours: 12,
    temperatureUnit: 'fahrenheit',
    windSpeedUnit: 'mph',
    compact: false,
  },
  argTypes: {
    temperatureUnit: { control: 'inline-radio', options: ['fahrenheit', 'celsius'] },
    windSpeedUnit: { control: 'inline-radio', options: ['mph', 'kmh', 'ms', 'kn'] },
    forecastDays: { control: { type: 'range', min: 1, max: 16 } },
    forecastHours: { control: { type: 'range', min: 1, max: 48 } },
    compact: { control: 'boolean' },
    weatherProviders: { control: false },
    geoProviders: { control: false },
    onProviderError: { control: false },
    locations: { control: false },
  },
} satisfies Meta<typeof WeatherForecast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full card: current conditions, the next hours and the next days. */
export const Default: Story = {};

/**
 * `compact`: the short two-column card the qwksearch homepage uses. Current
 * conditions on the left, the next three days on the right; the halves stack
 * when the container is narrow.
 */
export const Compact: Story = {
  args: { compact: true },
};

/** Celsius and km/h. The degF/degC switch on the card toggles it too. */
export const Metric: Story = {
  args: {
    ...scenarioLocation('rainy'),
    weatherProviders: [fixtureProvider('rainy')],
    temperatureUnit: 'celsius',
    windSpeedUnit: 'kmh',
  },
};

/** Snow below freezing, with metres per second for wind. */
export const Snow: Story = {
  args: {
    ...scenarioLocation('snowy'),
    weatherProviders: [fixtureProvider('snowy')],
    temperatureUnit: 'celsius',
    windSpeedUnit: 'ms',
  },
};

/** Thunderstorms and hail, wind in knots, compact. */
export const Storms: Story = {
  args: {
    ...scenarioLocation('stormy'),
    weatherProviders: [fixtureProvider('stormy')],
    windSpeedUnit: 'kn',
    compact: true,
  },
};

/** `locations`: one card per place, each in its own timezone. */
export const MultipleLocations: Story = {
  args: {
    locations: SCENARIO_LOCATIONS,
    compact: true,
  },
};

/** `locations` with the full card. */
export const MultipleLocationsFull: Story = {
  args: {
    locations: SCENARIO_LOCATIONS.slice(0, 2),
    forecastDays: 3,
    forecastHours: 8,
  },
};

/** The longest range the API allows: 16 days. Hours scroll sideways. */
export const LongRange: Story = {
  args: { forecastDays: 16, forecastHours: 48 },
};

/** The compact card takes its colours from its container. */
export const OnDarkBackground: Story = {
  args: { ...scenarioLocation('stormy'), weatherProviders: [fixtureProvider('stormy')], compact: true },
  decorators: [
    (Story) => (
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#f8fafc', borderRadius: 20, padding: 12 }}>
        <Story />
      </div>
    ),
  ],
};

/** `style` and `className` pass through to the card. */
export const CustomStyle: Story = {
  args: {
    compact: true,
    style: { background: '#fef3c7', color: '#78350f', border: '1px solid #f59e0b' },
  },
};

/** A narrow container: the compact card's halves stack. */
export const Narrow: Story = {
  args: { compact: true },
  decorators: [
    (Story) => (
      <div style={{ width: 340, border: '1px dashed #cbd5e1', borderRadius: 18 }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Every provider failed and there is nothing cached: the error lists what
 * each upstream said. `reloadAttempts={0}` shows it at once instead of after
 * the default two reloads.
 */
export const ProvidersDown: Story = {
  args: {
    ...OFFLINE_LOCATION,
    weatherProviders: failingProviders,
    allowStaleCache: false,
    reloadAttempts: 0,
    retryAttempts: 1,
  },
};

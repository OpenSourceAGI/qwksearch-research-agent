import type { Meta, StoryObj } from '@storybook/react-vite';
import { WeatherForecast } from 'use-weather-forecast';
import { LIVE_CITIES } from '../lib/fixtures';

/**
 * The component against the real APIs, exactly as installed from npm.
 * Forecasts are cached in `localStorage` for 30 minutes and the IP location
 * for 12 hours, so flipping between these stories does not refetch.
 */
const meta = {
  title: 'WeatherForecast/Live',
  component: WeatherForecast,
  args: {
    forecastDays: 5,
    forecastHours: 12,
    temperatureUnit: 'fahrenheit',
    windSpeedUnit: 'mph',
  },
  argTypes: {
    temperatureUnit: { control: 'inline-radio', options: ['fahrenheit', 'celsius'] },
    windSpeedUnit: { control: 'inline-radio', options: ['mph', 'kmh', 'ms', 'kn'] },
    forecastDays: { control: { type: 'range', min: 1, max: 16 } },
    forecastHours: { control: { type: 'range', min: 1, max: 48 } },
    weatherProviders: { control: false },
    geoProviders: { control: false },
    onProviderError: { control: false },
  },
  tags: ['live'],
} satisfies Meta<typeof WeatherForecast>;

export default meta;
type Story = StoryObj<typeof meta>;

const sf = LIVE_CITIES[0];

/** A fixed city from Open-Meteo: no IP lookup is made when coordinates are given. */
export const FixedCity: Story = {
  args: {
    latitude: sf.latitude,
    longitude: sf.longitude,
    location: { city: sf.label, timezone: sf.timezone },
  },
};

/** No coordinates: your location is found by IP (ipwho.is first). */
export const AutoDetect: Story = {
  args: { compact: true },
};

/** Several real cities, compact, each in its own timezone. */
export const WorldClock: Story = {
  args: {
    compact: true,
    temperatureUnit: 'celsius',
    windSpeedUnit: 'kmh',
    locations: LIVE_CITIES.slice(1, 5).map((city) => ({ ...city })),
  },
};

/** Open-Meteo skipped: met.no answers, normalized into the same shape. */
export const MetNoFallback: Story = {
  args: {
    latitude: LIVE_CITIES[2].latitude + 0.01,
    longitude: LIVE_CITIES[2].longitude + 0.01,
    location: { city: 'London (met.no)', timezone: LIVE_CITIES[2].timezone },
    weatherProviders: ['met-no'],
  },
};

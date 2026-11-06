import type { Meta, StoryObj } from '@storybook/react-vite';
import { WeatherIcon, type WeatherCondition } from 'use-weather-forecast';

const CONDITIONS: WeatherCondition[] = [
  'sun',
  'cloud-sun',
  'clouds',
  'cloud-fog',
  'cloud-drizzle',
  'cloud-showers',
  'cloud-showers-heavy',
  'cloud-sleet',
  'cloud-snow',
  'snowflake',
  'cloud-bolt',
  'cloud-hail',
];

/**
 * The SVG icon for a weather condition. `getWeatherIcon(code, isDay)` maps a
 * WMO weather code to one of these; every other SVG prop passes through.
 */
const meta = {
  title: 'WeatherIcon',
  component: WeatherIcon,
  args: { condition: 'cloud-sun', width: 64, height: 64, title: 'Weather' },
  argTypes: {
    condition: { control: 'select', options: CONDITIONS },
    width: { control: { type: 'range', min: 12, max: 160 } },
    height: { control: { type: 'range', min: 12, max: 160 } },
  },
} satisfies Meta<typeof WeatherIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One icon; pick the condition and size in Controls. */
export const Single: Story = {};

/** Every condition the forecast can report. */
export const AllConditions: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
      {CONDITIONS.map((condition) => (
        <figure key={condition} style={{ margin: 0, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <WeatherIcon {...args} condition={condition} title={condition} />
          <figcaption style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{condition}</figcaption>
        </figure>
      ))}
    </div>
  ),
  args: { width: 48, height: 48 },
};

/** Icons inherit `color`, so they follow text colour and dark mode. */
export const Coloured: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 20 }}>
      {['#f59e0b', '#0ea5e9', '#64748b', '#a855f7'].map((color) => (
        <span key={color} style={{ color }}>
          <WeatherIcon {...args} />
        </span>
      ))}
    </div>
  ),
};

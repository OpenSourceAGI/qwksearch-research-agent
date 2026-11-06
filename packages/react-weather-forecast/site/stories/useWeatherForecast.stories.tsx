import type { Meta, StoryObj } from '@storybook/react-vite';
import { clearWeatherForecastCache, useWeatherForecast, WeatherIcon, type WeatherForecastOptions } from 'use-weather-forecast';
import { fixtureProvider, scenarioLocation, type Scenario, SCENARIO_NAMES } from '../lib/fixtures';

/**
 * Build your own UI on the hook. It returns `{ data, error, loading }`, keeps
 * the last good forecast while a refetch is in flight, and reloads a failed
 * first load on its own.
 */
function CustomWeather(props: WeatherForecastOptions) {
  const { data, error, loading } = useWeatherForecast(props);

  const card: React.CSSProperties = {
    fontFamily: 'system-ui, sans-serif',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 16,
    padding: '14px 20px',
    borderRadius: 999,
    background: '#0ea5e9',
    color: '#fff',
    minWidth: 260,
    minHeight: 64,
    boxSizing: 'border-box',
  };

  if (loading && !data) {
    return (
      <div style={{ ...card, background: '#e2e8f0', color: '#64748b' }} aria-busy="true">
        Loading forecast…
      </div>
    );
  }
  if (error && !data) return <div style={{ ...card, background: '#fee2e2', color: '#991b1b' }}>{error.message}</div>;
  if (!data) return null;

  const today = data.daily[0];
  return (
    <div style={card}>
      <WeatherIcon condition={data.current.icon} width={40} height={40} />
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{data.current.temperature}°</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>
          {data.location?.city} · H {today?.max}° L {today?.min}°
        </div>
      </div>
    </div>
  );
}

type Args = WeatherForecastOptions & { scenario: Scenario; delayMs: number };

const meta = {
  title: 'useWeatherForecast',
  args: { scenario: 'sunny', delayMs: 1200, temperatureUnit: 'fahrenheit' },
  argTypes: {
    scenario: { control: 'inline-radio', options: SCENARIO_NAMES },
    delayMs: { control: { type: 'range', min: 0, max: 5000, step: 100 }, description: 'Fixture latency, to see the loading state.' },
    temperatureUnit: { control: 'inline-radio', options: ['fahrenheit', 'celsius'] },
  },
  render: ({ scenario, delayMs, ...options }: Args) => (
    <CustomWeather
      key={`${scenario}:${delayMs}`}
      {...scenarioLocation(scenario)}
      {...options}
      // A new id per latency keeps the hook from treating it as the same request.
      weatherProviders={[{ ...fixtureProvider(scenario, delayMs), id: `fixture-${scenario}-${delayMs}` }]}
    />
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A custom pill built on the hook, with a loading skeleton. The forecast cache
 * is cleared when the story opens, so the skeleton shows on every visit.
 */
export const CustomUI: Story = {
  loaders: [
    async () => {
      clearWeatherForecastCache();
      return {};
    },
  ],
};

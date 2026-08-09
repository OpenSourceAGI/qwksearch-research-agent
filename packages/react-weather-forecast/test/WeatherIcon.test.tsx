import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeatherIcon } from '../src/icons/WeatherIcon';
import * as icons from '../src/icons/weather-icons';
import type { WeatherCondition } from '../src/types';

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

describe('WeatherIcon', () => {
  it.each(CONDITIONS)('renders an svg for the %s condition', (condition) => {
    const { container } = render(<WeatherIcon condition={condition} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders distinct markup for distinct conditions', () => {
    const sun = render(<WeatherIcon condition="sun" />).container.innerHTML;
    const snow = render(<WeatherIcon condition="cloud-snow" />).container.innerHTML;
    expect(sun).not.toBe(snow);
  });

  it('falls back to the clouds icon for an unknown condition', () => {
    const fallback = render(<WeatherIcon condition={'not-a-condition' as WeatherCondition} />)
      .container.innerHTML;
    const clouds = render(<WeatherIcon condition="clouds" />).container.innerHTML;
    expect(fallback).toBe(clouds);
  });

  it('forwards sizing props to the underlying svg', () => {
    const { container } = render(<WeatherIcon condition="sun" width={40} height={40} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('40');
    expect(svg.getAttribute('height')).toBe('40');
  });

  it('renders a title element when a title is supplied', () => {
    const { container } = render(<WeatherIcon condition="sun" title="Current weather" />);
    expect(container.querySelector('title')?.textContent).toBe('Current weather');
  });
});

describe('weather-icons module', () => {
  it('exports a component for every mapped condition plus the wind icon', () => {
    const exported = Object.entries(icons).filter(([, value]) => typeof value === 'function');
    // 12 weather conditions + WindIcon, all renderable.
    expect(exported.length).toBeGreaterThanOrEqual(13);

    for (const [name, Component] of exported) {
      const { container } = render(<Component />);
      expect(container.querySelector('svg'), `${name} should render an svg`).not.toBeNull();
    }
  });
});

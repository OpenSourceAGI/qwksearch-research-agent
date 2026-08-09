import { describe, expect, it } from 'vitest';
import { getWeatherIcon } from '../src/weatherCodes';

// WMO weather interpretation codes -> icon names used by <WeatherIcon />.
describe('getWeatherIcon', () => {
  it('maps clear sky to the sun icon', () => {
    expect(getWeatherIcon(0)).toBe('sun');
  });

  it('distinguishes day and night for partly cloudy codes', () => {
    expect(getWeatherIcon(1, 1)).toBe('cloud-sun');
    expect(getWeatherIcon(2, 1)).toBe('cloud-sun');
    expect(getWeatherIcon(1, 0)).toBe('clouds');
    expect(getWeatherIcon(2, 0)).toBe('clouds');
  });

  it('defaults to daytime when isDay is omitted', () => {
    expect(getWeatherIcon(1)).toBe('cloud-sun');
  });

  it('maps overcast to clouds regardless of time of day', () => {
    expect(getWeatherIcon(3, 1)).toBe('clouds');
    expect(getWeatherIcon(3, 0)).toBe('clouds');
  });

  it('maps fog codes', () => {
    expect(getWeatherIcon(45)).toBe('cloud-fog');
    expect(getWeatherIcon(48)).toBe('cloud-fog');
  });

  it('maps drizzle and freezing drizzle codes', () => {
    for (const code of [51, 53, 55, 56, 57]) {
      expect(getWeatherIcon(code)).toBe('cloud-drizzle');
    }
  });

  it('separates light rain from heavy rain and showers', () => {
    expect(getWeatherIcon(61)).toBe('cloud-showers');
    expect(getWeatherIcon(63)).toBe('cloud-showers');
    for (const code of [65, 66, 67, 80, 81, 82]) {
      expect(getWeatherIcon(code)).toBe('cloud-showers-heavy');
    }
  });

  it('maps every snow code', () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(getWeatherIcon(code)).toBe('cloud-snow');
    }
  });

  it('separates plain thunderstorms from hail', () => {
    expect(getWeatherIcon(95)).toBe('cloud-bolt');
    expect(getWeatherIcon(96)).toBe('cloud-hail');
    expect(getWeatherIcon(99)).toBe('cloud-hail');
  });

  it('falls back to clouds for unknown codes', () => {
    expect(getWeatherIcon(-1)).toBe('clouds');
    expect(getWeatherIcon(1234)).toBe('clouds');
  });
});

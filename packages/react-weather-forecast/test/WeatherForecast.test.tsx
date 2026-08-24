import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeatherForecast } from '../src/components/WeatherForecast';
import * as forecastApi from '../src/api/forecast';
import type { WeatherForecastData } from '../src/types';

function forecast(overrides: Partial<WeatherForecastData> = {}): WeatherForecastData {
  return {
    location: { city: 'Austin', region: 'Texas', timezone: 'America/Chicago', latitude: 30.27, longitude: -97.74 },
    current: {
      time: '2024-01-01T12:00',
      temperature: 72,
      weatherCode: 0,
      icon: 'sun',
      isDay: 1,
      windSpeed: 8.4,
    },
    hourly: [
      { time: '2024-01-01T12:00', temperature: 72, weatherCode: 0, icon: 'sun', precipitationProbability: 0 },
      { time: '2024-01-01T18:00', temperature: 68, weatherCode: 61, icon: 'cloud-showers', precipitationProbability: 40 },
    ],
    daily: [
      { date: '2024-01-01', min: 55, max: 79, weatherCode: 0, icon: 'sun', precipitationProbabilityMax: 10 },
      {
        date: '2024-01-02',
        min: 58,
        max: 80,
        weatherCode: 95,
        icon: 'cloud-bolt',
        precipitationProbabilityMax: 70,
        precipitationSum: 0.5,
        windSpeedMax: 4.5,
      },
      { date: '2024-01-03', min: 57, max: 77, weatherCode: 3, icon: 'clouds', precipitationSum: 0, windSpeedMax: 3.5 },
      { date: '2024-01-04', min: 51, max: 75, weatherCode: 3, icon: 'clouds' },
      { date: '2024-01-05', min: 50, max: 74, weatherCode: 3, icon: 'clouds' },
    ],
    ...overrides,
  } as WeatherForecastData;
}

describe('<WeatherForecast />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing while the first forecast is loading', () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockReturnValue(new Promise(() => {}));

    const { container } = render(<WeatherForecast latitude={1} longitude={2} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders the error message when the request fails', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockRejectedValue(new Error('network down'));

    render(<WeatherForecast latitude={1} longitude={2} />);

    expect(await screen.findByText('Error: network down')).toBeTruthy();
  });

  it('renders the city, region and current temperature', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} />);

    expect(await screen.findByText('Austin, Texas')).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
  });

  it('renders the next hours and next days sections', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} />);

    expect(await screen.findByText('Next hours')).toBeTruthy();
    expect(screen.getByText('Next days')).toBeTruthy();
    // Precipitation is only surfaced when the chance is non-zero.
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('toggles the temperature unit when the F/C switch is clicked', async () => {
    const spy = vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} />);

    const toggle = await screen.findByRole('button', {
      name: /Switch temperature units, currently Fahrenheit/,
    });
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ temperatureUnit: 'celsius' }))
    );
    expect(
      screen.getByRole('button', { name: /Switch temperature units, currently Celsius/ })
    ).toBeTruthy();
  });

  it('toggles the unit from the keyboard', async () => {
    const spy = vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} />);
    const toggle = await screen.findByRole('button', { name: /Switch temperature units/ });

    fireEvent.keyDown(toggle, { key: 'Enter' });
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ temperatureUnit: 'celsius' }))
    );

    fireEvent.keyDown(toggle, { key: ' ' });
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ temperatureUnit: 'fahrenheit' }))
    );
  });

  it('ignores unrelated keys on the unit switch', async () => {
    const spy = vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} />);
    const toggle = await screen.findByRole('button', { name: /Switch temperature units/ });
    const callsBefore = spy.mock.calls.length;

    fireEvent.keyDown(toggle, { key: 'a' });

    expect(spy.mock.calls.length).toBe(callsBefore);
  });

  it('renders the compact card with the location, today and wind', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} compact />);

    expect(await screen.findByText('Austin, Texas')).toBeTruthy();
    // windSpeed 8.4 mph, rounded, with the default unit label.
    expect(screen.getByText('8 mph')).toBeTruthy();
    // The compact layout omits the full hour/day breakdown.
    expect(screen.queryByText('Next hours')).toBeNull();
  });

  it('shows the next three days, by abbreviated weekday, along the bottom', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} compact />);

    // Today (Monday) is summarised above; the row starts at the day after.
    expect(await screen.findByText('Tue')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
    expect(screen.getByText('Thu')).toBeTruthy();
    // Only three days fit the bottom row, so the fifth day is dropped.
    expect(screen.queryByText('Fri')).toBeNull();
    expect(screen.queryByText('Mon')).toBeNull();
  });

  it('keeps daily precipitation and peak wind as hover text on each day', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} compact />);

    const tuesday = (await screen.findByText('Tue')).parentElement;
    expect(tuesday?.getAttribute('title')).toBe('0.5 mm · 4.5 mph wind');
    // Days without those totals carry no hover text at all.
    expect(screen.getByText('Thu').parentElement?.getAttribute('title')).toBeNull();
  });

  it('shows the precipitation chance for upcoming days only when non-zero', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} compact />);

    // Tomorrow's 70% chance is shown; Wednesday has no chance recorded.
    expect(await screen.findByText('70%')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('shows a wind placeholder when wind speed is missing', async () => {
    const data = forecast();
    delete (data.current as Record<string, unknown>).windSpeed;
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(data);

    render(<WeatherForecast latitude={1} longitude={2} compact />);

    expect(await screen.findByText('—')).toBeTruthy();
  });

  it('uses the requested wind speed unit label', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast latitude={1} longitude={2} compact windSpeedUnit="kmh" />);

    expect(await screen.findByText('8 km/h')).toBeTruthy();
  });

  it('falls back to a generic label when the city is unknown', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(
      forecast({ location: { latitude: 1, longitude: 2 } })
    );

    render(<WeatherForecast latitude={1} longitude={2} />);

    expect(await screen.findByText('Current location')).toBeTruthy();
  });

  it('renders one forecast per entry when `locations` is supplied', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockImplementation(async (options) =>
      forecast({
        location: {
          city: options?.location?.city ?? 'Unknown',
          latitude: options?.latitude ?? 0,
          longitude: options?.longitude ?? 0,
        },
      })
    );

    render(
      <WeatherForecast
        compact
        locations={[
          { label: 'Austin', latitude: 30.27, longitude: -97.74 },
          { label: 'Berlin', latitude: 52.52, longitude: 13.4 },
        ]}
      />
    );

    expect(await screen.findByText('Austin')).toBeTruthy();
    expect(await screen.findByText('Berlin')).toBeTruthy();
  });

  it('falls back to a single auto-detected forecast for an empty locations array', async () => {
    const spy = vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(forecast());

    render(<WeatherForecast locations={[]} />);

    await screen.findByText('Austin, Texas');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the local timezone when the location timezone is invalid', async () => {
    vi.spyOn(forecastApi, 'getWeatherForecast').mockResolvedValue(
      forecast({ location: { city: 'Nowhere', timezone: 'Not/AZone', latitude: 0, longitude: 0 } })
    );

    render(<WeatherForecast latitude={1} longitude={2} />);

    // Rendering must not throw on the bad IANA zone.
    expect(await screen.findByText('Nowhere')).toBeTruthy();
  });
});

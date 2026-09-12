import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildOpenMeteoUrl } from '../src/api/providers/open-meteo';
import { grabJson } from '../src/api/http';
import type { ForecastRequest } from '../src/api/providers';

/**
 * The one test in this package that uses the real `grab-url` instead of a mock,
 * against a local server, and asserts on the URL that actually arrives.
 *
 * It exists because of a bug no mocked test could see: grab-url turns every
 * option it does not recognise into the GET query string and concatenates that
 * onto the path, so passing it `retryAttempts` alongside a URL that already had
 * a query produced two `?` and folded the option into the last real value --
 *
 *   ...&daily=temperature_2m_max%2Cwind_speed_10m_max?retryAttempts=0
 *
 * which Open-Meteo answered with `400 Bad Request`, on every weather provider,
 * every time. Mocking grab-url hid it completely: the mock was handed a
 * perfectly good URL and never composed the query itself.
 *
 * So this asserts the property that keeps the widget working -- one `?`, every
 * parameter intact, nothing extra -- against whatever grab-url does today.
 */
const request: ForecastRequest = {
  location: { latitude: 30.27, longitude: -97.74, city: 'Austin' },
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  forecastDays: 5,
  forecastHours: 24,
  timezone: 'America/Chicago',
  transport: { attempts: 1, retryDelay: 0 },
};

let server: Server;
let origin = '';
let received: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    received.push(req.url ?? '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('the URL grab-url puts on the wire', () => {
  beforeAll(() => {
    received = [];
  });

  it('sends an Open-Meteo forecast query with exactly one query separator', async () => {
    const url = buildOpenMeteoUrl(`${origin}/v1/forecast`, request);

    await grabJson(url, 'Weather request', request.transport);

    const sent = received.at(-1) as string;
    expect(sent.split('?')).toHaveLength(2);
  });

  it('sends every forecast parameter with its value unchanged', async () => {
    const url = buildOpenMeteoUrl(`${origin}/v1/forecast`, request);

    await grabJson(url, 'Weather request', request.transport);

    const sent = received.at(-1) as string;
    const expected = new URL(url).searchParams;
    const actual = new URL(sent, origin).searchParams;

    for (const [key, value] of expected) expect(actual.get(key)).toBe(value);
    // The last parameter is the one a stray `?` used to corrupt.
    expect(actual.get('daily')).toBe(expected.get('daily'));
    expect(actual.get('daily')).toContain('wind_speed_10m_max');
  });

  it('adds no parameter of its own, including a forwarded transport option', async () => {
    const url = buildOpenMeteoUrl(`${origin}/v1/forecast`, request);

    await grabJson(url, 'Weather request', { ...request.transport, retryAttempts: 2 });

    const sent = received.at(-1) as string;
    const expected = [...new URL(url).searchParams.keys()].sort();
    const actual = [...new URL(sent, origin).searchParams.keys()].sort();

    expect(actual).toEqual(expected);
    expect(sent).not.toContain('retryAttempts');
  });

  it('leaves a URL that carries no query of its own alone', async () => {
    await grabJson(`${origin}/v1/geo/`, 'Geolocation lookup', { attempts: 1, retryDelay: 0 });

    expect(received.at(-1)).toBe('/v1/geo/');
  });
});

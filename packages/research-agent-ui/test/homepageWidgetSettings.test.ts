/**
 * @fileoverview The homepage widget settings, where a schema entry and the
 * component that reads it have to agree on a string.
 *
 * `search.json` declares the settings; `ChatHomepage` reads them out of
 * `localStorage` by key. Nothing connects the two but the spelling, so a
 * renamed key leaves a settings field that silently controls nothing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { searchSettingsFields } from '../src/settings';
import { researchAgentUIConfig } from '../src/config';

// Vitest runs with the package root as cwd; the jsdom environment does not
// give this file a `file:` URL to resolve against.
const homepageSource = readFileSync(
  resolve(process.cwd(), 'src/components/ChatConversation/ChatHomepage.tsx'),
  'utf8',
);

const fieldFor = (key: string) => searchSettingsFields.find((field) => field.key === key);

/** The widget settings the homepage is responsible for reading. */
const WIDGET_KEYS = [
  'showWeatherWidget',
  'weatherLocations',
  'weatherForecastDays',
  'weatherForecastHours',
  'weatherTemperatureUnit',
  'showTrendingNewsWidget',
  'trendingNewsApiUrl',
  'trendingNewsMaxTopics',
  'trendingNewsShowImages',
  'trendingNewsCustomTopics',
];

describe('homepage widget settings', () => {
  it('declares every widget setting the homepage reads', () => {
    for (const key of WIDGET_KEYS) {
      expect(fieldFor(key), `missing settings field: ${key}`).toBeDefined();
      expect(fieldFor(key)!.scope).toBe('client');
    }
  });

  it('is read by the homepage under exactly those keys', () => {
    for (const key of WIDGET_KEYS) {
      expect(homepageSource, `ChatHomepage never reads ${key}`).toContain(`'${key}'`);
    }
  });

  it('offers custom news topics as a free-text list', () => {
    const field = fieldFor('trendingNewsCustomTopics');

    expect(field!.type).toBe('textarea');
    // Blank means "whatever the site shows by default" — the widget must not
    // start out following an opinionated list nobody chose.
    expect(field!.default).toBe('');
  });
});

describe('news widget configuration', () => {
  it('defaults both news endpoints to the host app’s own routes', () => {
    expect(researchAgentUIConfig.trendingNewsApiUrl).toBe('/api/news/trending');
    expect(researchAgentUIConfig.trendingNewsSettingsUrl).toBe('/api/news/settings');
  });

  it('lets a host with no settings route opt out by blanking the URL', () => {
    // The homepage skips the fetch on an empty string rather than requesting a
    // route that does not exist on the desktop app or the extension.
    expect(homepageSource).toContain('if (!url) return;');
  });
});

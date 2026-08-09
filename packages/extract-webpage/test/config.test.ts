/**
 * @fileoverview Unit tests for the in-memory ConfigManager and the
 * server-side convenience accessors built on top of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnv } from '../src/config/env';

/**
 * The manager is a module-level singleton whose search defaults are read from
 * the environment on first access, so each test group gets a fresh module
 * registry with the env it needs.
 */
async function freshConfig(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const configManager = (await import('../src/config/index')).default;
  const registry = await import('../src/config/serverRegistry');
  return { configManager, registry };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getEnv', () => {
  it('reads process.env', () => {
    vi.stubEnv('QWK_TEST_KEY', 'value');

    expect(getEnv('QWK_TEST_KEY')).toBe('value');
  });

  it('returns undefined for a missing key', () => {
    expect(getEnv('QWK_DEFINITELY_NOT_SET')).toBeUndefined();
  });
});

describe('ConfigManager.getConfig', () => {
  it('reads a nested key', async () => {
    const { configManager } = await freshConfig();

    expect(configManager.getConfig('search.sourceScrapeCount')).toBe(3);
  });

  it('returns the default for a missing key', async () => {
    const { configManager } = await freshConfig();

    expect(configManager.getConfig('nope.missing', 'fallback')).toBe('fallback');
  });

  it('returns the default when a path segment is null', async () => {
    const { configManager } = await freshConfig();
    configManager.updateConfig('nullable', null);

    expect(configManager.getConfig('nullable.deep', 'fallback')).toBe('fallback');
  });

  it('seeds search settings from the environment', async () => {
    const { configManager } = await freshConfig({
      SEARXNG_API_URL: 'http://searx.test',
      TAVILY_API_KEY: 'tvly-abc',
    });

    expect(configManager.getConfig('search.searxngURL')).toBe('http://searx.test');
    expect(configManager.getConfig('search.tavilyApiKey')).toBe('tvly-abc');
  });

  it('falls back to the declared default when the env var is unset', async () => {
    const { configManager } = await freshConfig();

    expect(configManager.getConfig('search.searxngURL')).toBe('');
  });
});

describe('ConfigManager.updateConfig', () => {
  it('sets a top-level value', async () => {
    const { configManager } = await freshConfig();

    configManager.updateConfig('setupComplete', true);

    expect(configManager.getConfig('setupComplete')).toBe(true);
  });

  it('sets a nested value', async () => {
    const { configManager } = await freshConfig();

    configManager.updateConfig('search.searxngURL', 'http://updated.test');

    expect(configManager.getConfig('search.searxngURL')).toBe('http://updated.test');
  });

  it('creates intermediate objects as needed', async () => {
    const { configManager } = await freshConfig();

    configManager.updateConfig('preferences.theme.mode', 'dark');

    expect(configManager.getConfig('preferences.theme.mode')).toBe('dark');
  });
});

describe('ConfigManager model providers', () => {
  it('adds a provider with a stable content hash', async () => {
    const { configManager } = await freshConfig();

    const first = configManager.addModelProvider('openai', { apiKey: 'a' });
    const second = configManager.addModelProvider('openai', { apiKey: 'a' });

    expect(first.id).toBe(second.id);
    expect(first.type).toBe('openai');
    expect(first.chatModels).toEqual([]);
  });

  it('gives different configs different hashes', async () => {
    const { configManager } = await freshConfig();

    const a = configManager.addModelProvider('openai', { apiKey: 'a' });
    const b = configManager.addModelProvider('openai', { apiKey: 'b' });

    expect(a.id).not.toBe(b.id);
  });

  it('removes a provider by id', async () => {
    const { configManager } = await freshConfig();
    const provider = configManager.addModelProvider('openai', { apiKey: 'a' });

    configManager.removeModelProvider(provider.id);

    expect(configManager.getConfig('modelProviders')).toEqual([]);
  });

  it('updates a provider config', async () => {
    const { configManager } = await freshConfig();
    const provider = configManager.addModelProvider('openai', { apiKey: 'a' });

    const updated = await configManager.updateModelProvider(provider.id, { apiKey: 'b' });

    expect(updated.config).toEqual({ apiKey: 'b' });
  });

  it('rejects an update for an unknown provider', async () => {
    const { configManager } = await freshConfig();

    await expect(configManager.updateModelProvider('nope', {})).rejects.toThrow(
      'Provider not found'
    );
  });

  it('adds and removes chat models on a provider', async () => {
    const { configManager } = await freshConfig();
    const provider = configManager.addModelProvider('openai', { apiKey: 'a' });

    const model = configManager.addProviderModel(provider.id, 'chat', {
      key: 'gpt',
      type: 'chat',
    });

    expect(model).not.toHaveProperty('type');
    expect(provider.chatModels).toHaveLength(1);

    configManager.removeProviderModel(provider.id, 'chat', 'gpt');

    expect(provider.chatModels).toHaveLength(0);
  });

  it('rejects model operations against an unknown provider', async () => {
    const { configManager } = await freshConfig();

    expect(() => configManager.addProviderModel('nope', 'chat', {})).toThrow(
      'Invalid provider id'
    );
    expect(() => configManager.removeProviderModel('nope', 'chat', 'gpt')).toThrow(
      'Invalid provider id'
    );
  });
});

describe('ConfigManager setup state', () => {
  it('starts incomplete and can be marked complete', async () => {
    const { configManager } = await freshConfig();

    expect(configManager.isSetupComplete()).toBe(false);

    configManager.markSetupComplete();
    expect(configManager.isSetupComplete()).toBe(true);

    // Idempotent.
    configManager.markSetupComplete();
    expect(configManager.isSetupComplete()).toBe(true);
  });

  it('reads SETUP_COMPLETE from the environment', async () => {
    const { configManager } = await freshConfig({ SETUP_COMPLETE: 'true' });

    expect(configManager.isSetupComplete()).toBe(true);
  });
});

describe('ConfigManager snapshots', () => {
  it('exposes the UI config sections', async () => {
    const { configManager } = await freshConfig();

    const sections = configManager.getUIConfigSections();

    expect(sections.search.map((field: any) => field.key)).toEqual([
      'searxngURL',
      'tavilyApiKey',
      'sourceScrapeTimeout',
    ]);
  });

  it('returns a deep copy of the current config', async () => {
    const { configManager } = await freshConfig();

    const snapshot = configManager.getCurrentConfig();
    snapshot.search.searxngURL = 'mutated';

    expect(configManager.getConfig('search.searxngURL')).not.toBe('mutated');
  });
});

describe('serverRegistry accessors', () => {
  it('reads the configured providers', async () => {
    const { configManager, registry } = await freshConfig();
    const provider = configManager.addModelProvider('openai', { apiKey: 'a' });

    expect(registry.getConfiguredModelProviders()).toHaveLength(1);
    expect(registry.getConfiguredModelProviderById(provider.id)?.type).toBe('openai');
    expect(registry.getConfiguredModelProviderById('nope')).toBeUndefined();
  });

  it('reads the search backend settings', async () => {
    const { registry } = await freshConfig({
      SEARXNG_API_URL: 'http://searx.test',
      TAVILY_API_KEY: 'tvly-abc',
    });

    expect(registry.getSearxngURL()).toBe('http://searx.test');
    expect(registry.getTavilyApiKey()).toBe('tvly-abc');
  });

  it('coerces the scrape limits to numbers', async () => {
    const { registry } = await freshConfig();

    expect(registry.getSourceScrapeCount()).toBe(3);
    expect(registry.getSourceScrapeTimeout()).toBe(5);
  });

  it('falls back when a scrape limit is unparseable', async () => {
    const { configManager, registry } = await freshConfig();
    configManager.updateConfig('search.sourceScrapeCount', 'not-a-number');
    configManager.updateConfig('search.sourceScrapeTimeout', 'not-a-number');

    expect(registry.getSourceScrapeCount()).toBe(3);
    expect(registry.getSourceScrapeTimeout()).toBe(5);
  });
});

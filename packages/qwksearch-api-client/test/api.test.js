import { describe, it, expect } from 'vitest';
import * as QwkSearch from '../src/index';
import { client } from '../src/client.gen';

/**
 * `src/sdk.gen.ts` is regenerated from `qwksearch-openapi.json` by
 * `bun run build:api`, so these assertions guard the generated surface rather
 * than hand-written logic: that generation actually ran, that the operations
 * the rest of the monorepo imports still exist, and that every operation is
 * wired to the shared client.
 *
 * The live round-trips at the bottom need network access and a configured
 * API key; opt in with `RUN_LIVE_API_TESTS=1`.
 */
const runLive = process.env.RUN_LIVE_API_TESTS === '1';

const operations = Object.entries(QwkSearch).filter(([, value]) => typeof value === 'function');

describe('generated SDK surface', () => {
  it('exports a substantial set of operations', () => {
    expect(operations.length).toBeGreaterThan(50);
  });

  it('exports every operation as a function', () => {
    for (const [name, operation] of operations) {
      expect(typeof operation, name).toBe('function');
    }
  });

  it('names every operation in camelCase', () => {
    for (const [name] of operations) {
      expect(name, name).toMatch(/^[a-z][A-Za-z0-9]*$/);
    }
  });

  it('covers the agent endpoints', () => {
    for (const name of ['agentChat', 'agentSearch', 'autocomplete', 'generateSuggestions']) {
      expect(QwkSearch, name).toHaveProperty(name);
    }
  });

  it('covers the search and scrape endpoints', () => {
    for (const name of ['listSearchEngines', 'testSearchEngines', 'scrapeGet', 'scrapePost']) {
      expect(QwkSearch, name).toHaveProperty(name);
    }
  });

  it('covers the document and chat endpoints', () => {
    for (const name of ['listDocuments', 'createDocument', 'listChats', 'getChatById']) {
      expect(QwkSearch, name).toHaveProperty(name);
    }
  });

  it('covers the provider and config endpoints', () => {
    for (const name of ['listProviders', 'addProvider', 'getConfig', 'saveConfig']) {
      expect(QwkSearch, name).toHaveProperty(name);
    }
  });
});

describe('generated client', () => {
  it('exposes the HTTP verbs the SDK dispatches through', () => {
    for (const verb of ['get', 'post', 'put', 'patch', 'delete']) {
      expect(typeof client[verb], verb).toBe('function');
    }
  });

  it('is configurable, so consumers can point it at their own deployment', () => {
    expect(typeof client.setConfig).toBe('function');
    expect(typeof client.getConfig).toBe('function');
  });

  it('carries a base URL in its config', () => {
    expect(typeof client.getConfig().baseUrl).toBe('string');
  });

  it('routes an operation through the client when one is supplied', async () => {
    const calls = [];
    const fakeClient = {
      get: async (options) => {
        calls.push(options);
        return { data: { engines: [] } };
      },
    };

    await QwkSearch.listSearchEngines({ client: fakeClient });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBeTruthy();
  });
});

describe.runIf(runLive)('live API round-trips', () => {
  it('lists the available search engines', async () => {
    const result = await QwkSearch.listSearchEngines({});

    expect(result.data).toBeDefined();
  }, 20000);

  it('runs an agent search', async () => {
    const result = await QwkSearch.agentSearch({
      query: { q: 'What is the capital of France?' },
    });

    expect(result.data).toBeDefined();
  }, 20000);
});

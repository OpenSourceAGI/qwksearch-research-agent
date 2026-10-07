import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getHumanNamesDB,
  HUMAN_NAMES_DB_CDN_URL,
  loadHumanNamesDB,
  setHumanNamesDB,
} from '../src/html-to-cite/human-names-db';
import { extractHumanName } from '../src/html-to-cite/human-names-recognize';

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

afterEach(() => setHumanNamesDB(null));

describe('human names database', () => {
  it('is not loaded by the slim entry', async () => {
    await import('../src/index');
    expect(getHumanNamesDB()).toBeNull();
  });

  it('treats a three-word name as an organization without the database', () => {
    expect(extractHumanName('Mary Ann Smith').author_type).toBe(3);
  });

  it('recognizes a three-word person name once the database is set', () => {
    setHumanNamesDB({ mary: 1, smith: 2 });
    expect(extractHumanName('Mary Ann Smith').author_type).toBe(0);
  });

  it('lazy-loads from the CDN once and shares the request', async () => {
    const fetch = vi.fn(async () => okResponse({ smith: 2 }));
    const [a, b] = await Promise.all([
      loadHumanNamesDB({ fetch }),
      loadHumanNamesDB({ fetch }),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(HUMAN_NAMES_DB_CDN_URL);
    expect(a).toEqual({ smith: 2 });
    expect(b).toBe(a);
    expect(getHumanNamesDB()).toBe(a);

    await loadHumanNamesDB({ fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('resolves null on failure and retries on the next call', async () => {
    const failing = vi.fn(async () => ({ ok: false, status: 503 }) as Response);
    expect(await loadHumanNamesDB({ fetch: failing })).toBeNull();
    expect(getHumanNamesDB()).toBeNull();

    const throwing = vi.fn(() => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await loadHumanNamesDB({ fetch: throwing })).toBeNull();

    const ok = vi.fn(async () => okResponse({ smith: 2 }));
    expect(await loadHumanNamesDB({ fetch: ok, url: 'https://example.test/n.json' })).toEqual({ smith: 2 });
    expect(ok).toHaveBeenCalledWith('https://example.test/n.json');
  });

  it('bundles and registers the full database from the /full entry', async () => {
    await import('../src/full');
    const db = getHumanNamesDB();
    expect(db).not.toBeNull();
    expect(Object.keys(db!).length).toBeGreaterThan(90000);
    expect(extractHumanName('Mary Ann Smith').author_type).toBe(0);
    // A cold import transforms the whole ~90k-name JSON, which overruns the
    // 5s default on slower CI runners.
  }, 30_000);
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mode = { current: 'cdn' as 'cdn' | 'bundled' };

vi.mock('@/store/externalLibsMode', () => ({
  getExternalLibsMode: () => mode.current,
}));

const { loadKatex, loadMermaid, loadScript, loadStylesheet } = await import(
  '../src/utils/cdn-loader'
);

/**
 * jsdom never fetches `<script>`/`<link>` sources, so the loader's promises
 * would hang forever. Intercept the append and fire the handler the test wants.
 */
function interceptAppend(outcome: 'load' | 'error') {
  return vi.spyOn(document.head, 'appendChild').mockImplementation(((node: any) => {
    queueMicrotask(() => (outcome === 'load' ? node.onload?.() : node.onerror?.()));
    return node;
  }) as typeof document.head.appendChild);
}

beforeEach(() => {
  mode.current = 'cdn';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadScript', () => {
  it('appends a script tag and resolves once it loads', async () => {
    const append = interceptAppend('load');

    await expect(loadScript('https://cdn.test/a.js')).resolves.toBeUndefined();

    const node = append.mock.calls[0][0] as HTMLScriptElement;
    expect(node.tagName).toBe('SCRIPT');
    expect(node.src).toBe('https://cdn.test/a.js');
  });

  it('does not re-append a script that already loaded', async () => {
    interceptAppend('load');
    await loadScript('https://cdn.test/b.js');
    vi.restoreAllMocks();

    const append = interceptAppend('load');
    await loadScript('https://cdn.test/b.js');

    expect(append).not.toHaveBeenCalled();
  });

  it('shares one in-flight promise across concurrent callers', async () => {
    const append = interceptAppend('load');

    const [a, b] = [loadScript('https://cdn.test/c.js'), loadScript('https://cdn.test/c.js')];

    await Promise.all([a, b]);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it('rejects when the script fails to load, and allows a retry', async () => {
    interceptAppend('error');
    await expect(loadScript('https://cdn.test/d.js')).rejects.toThrow(
      'Failed to load script: https://cdn.test/d.js'
    );
    vi.restoreAllMocks();

    const append = interceptAppend('load');
    await expect(loadScript('https://cdn.test/d.js')).resolves.toBeUndefined();
    expect(append).toHaveBeenCalledTimes(1);
  });
});

describe('loadStylesheet', () => {
  it('appends a stylesheet link and resolves once it loads', async () => {
    const append = interceptAppend('load');

    await expect(loadStylesheet('https://cdn.test/a.css')).resolves.toBeUndefined();

    const node = append.mock.calls[0][0] as HTMLLinkElement;
    expect(node.tagName).toBe('LINK');
    expect(node.rel).toBe('stylesheet');
    expect(node.href).toBe('https://cdn.test/a.css');
  });

  it('does not re-append a stylesheet that already loaded', async () => {
    interceptAppend('load');
    await loadStylesheet('https://cdn.test/b.css');
    vi.restoreAllMocks();

    const append = interceptAppend('load');
    await loadStylesheet('https://cdn.test/b.css');

    expect(append).not.toHaveBeenCalled();
  });

  it('shares one in-flight promise across concurrent callers', async () => {
    const append = interceptAppend('load');

    await Promise.all([
      loadStylesheet('https://cdn.test/c.css'),
      loadStylesheet('https://cdn.test/c.css'),
    ]);

    expect(append).toHaveBeenCalledTimes(1);
  });

  it('rejects when the stylesheet fails to load', async () => {
    interceptAppend('error');

    await expect(loadStylesheet('https://cdn.test/d.css')).rejects.toThrow(
      'Failed to load stylesheet: https://cdn.test/d.css'
    );
  });
});

describe('loadKatex (cdn mode)', () => {
  it('loads the CDN bundle and returns window.katex', async () => {
    const append = interceptAppend('load');
    const katex = { renderToString: () => '' };
    vi.stubGlobal('katex', katex);

    await expect(loadKatex()).resolves.toBe(katex);

    const urls = append.mock.calls.map((call) => (call[0] as HTMLElement).getAttribute('href') ?? (call[0] as HTMLScriptElement).src);
    expect(urls.some((url) => url?.includes('katex.min.css'))).toBe(true);
    expect(urls.some((url) => url?.includes('katex.min.js'))).toBe(true);
  });
});

describe('loadMermaid (cdn mode)', () => {
  it('loads the CDN bundle and returns window.mermaid', async () => {
    const append = interceptAppend('load');
    const mermaid = { initialize: () => {} };
    vi.stubGlobal('mermaid', mermaid);

    await expect(loadMermaid()).resolves.toBe(mermaid);

    const node = append.mock.calls[0][0] as HTMLScriptElement;
    expect(node.src).toContain('mermaid.min.js');
  });
});

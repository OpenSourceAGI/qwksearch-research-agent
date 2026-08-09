import { describe, expect, it } from 'vitest';
import * as layout from '../src/routes/+layout.js';
import svelteConfig from '../svelte.config.js';

/**
 * Tauri ships the frontend as static files loaded from disk — there is no
 * Node server behind the app. These assertions pin the SSG configuration that
 * makes that work, so a future change that reintroduces SSR fails loudly here
 * rather than at package time.
 */
describe('root layout configuration', () => {
  it('prerenders the app', () => {
    expect(layout.prerender).toBe(true);
  });

  it('disables server-side rendering', () => {
    expect(layout.ssr).toBe(false);
  });

  it('exports both flags as booleans, not truthy values', () => {
    expect(typeof layout.prerender).toBe('boolean');
    expect(typeof layout.ssr).toBe('boolean');
  });

  it('does not opt out of client-side rendering', () => {
    // `csr = false` would ship a dead shell, since ssr is already off.
    expect(layout.csr).toBeUndefined();
  });
});

describe('svelte.config.js', () => {
  it('configures a kit adapter', () => {
    expect(svelteConfig.kit).toBeDefined();
    expect(svelteConfig.kit.adapter).toBeDefined();
  });

  it('uses adapter-static, which is what Tauri needs', () => {
    expect(svelteConfig.kit.adapter.name).toBe('@sveltejs/adapter-static');
  });

  it('exposes an adapt hook', () => {
    expect(typeof svelteConfig.kit.adapter.adapt).toBe('function');
  });
});

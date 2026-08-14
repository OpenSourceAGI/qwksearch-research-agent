import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../../../..');

describe('render-url-to-html scraper workspace registration', () => {
  it('is covered by the root package.json workspaces glob so `bun install` links its dependencies', () => {
    const rootPackageJson = JSON.parse(
      readFileSync(resolve(repoRoot, 'package.json'), 'utf-8'),
    );

    expect(rootPackageJson.workspaces).toContain(
      'packages/render-url-to-html/*',
    );
  });

  it('is listed as a project in the root vitest.config.mts', () => {
    const configSource = readFileSync(
      resolve(repoRoot, 'vitest.config.mts'),
      'utf-8',
    );

    expect(configSource).toContain('packages/render-url-to-html/scraper-jsdom');
    expect(configSource).toContain('packages/render-url-to-html/scraper-puppeteer');
  });

  it('can resolve jsdom, which src/scraper.ts imports', () => {
    const require = createRequire(import.meta.url);

    expect(() => require.resolve('jsdom')).not.toThrow();
  });
});

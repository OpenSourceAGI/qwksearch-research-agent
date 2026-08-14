/**
 * Guards the shape of the shadcn design tokens this package ships.
 *
 * `react-reason-editor/style.css` is loaded into host apps that have their own
 * shadcn theme, so two properties of the token block are load-bearing and easy
 * to regress by hand:
 *
 *  - values must be whole colors, not the legacy bare HSL channel triplets.
 *    Current shadcn maps `--color-popover: var(--popover)`, so a triplet is
 *    invalid at computed-value time and silently drops `bg-popover`,
 *    `text-popover-foreground` and friends — which is what left portalled
 *    tooltips rendering unformatted.
 *  - selectors must stay wrapped in `:where()` so a host's own `:root` /
 *    `.dark` always wins on specificity regardless of stylesheet order.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { THEME } from '../theme/theme';

const globalScss = fs.readFileSync(path.resolve(__dirname, 'global.scss'), 'utf-8');

/** Parses the `--name: value;` pairs declared under `selector { ... }`. */
function tokensOf(selector: string): Record<string, string> {
  const start = globalScss.indexOf(`${selector} {`);

  if (start === -1) return {};

  const block = globalScss.slice(start, globalScss.indexOf('\n}', start));
  const tokens: Record<string, string> = {};

  for (const [, name, value] of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }

  return tokens;
}

const LIGHT = tokensOf(':where(:root)');
const DARK = tokensOf(':where(.dark)');

// A bare `0 0% 100%` — the legacy shadcn-v3 convention that broke host themes.
const BARE_HSL_TRIPLET = /^-?[\d.]+(deg)? -?[\d.]+% -?[\d.]+%/;

describe('shipped shadcn design tokens', () => {
  it('defines the light and dark palettes', () => {
    expect(Object.keys(LIGHT).length).toBeGreaterThan(20);
    expect(Object.keys(DARK).length).toBeGreaterThan(20);
  });

  it('covers the token set the components reference', () => {
    for (const token of [
      '--background',
      '--foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--border',
      '--sidebar',
      '--sidebar-border',
    ]) {
      expect(LIGHT).toHaveProperty(token);
    }
  });

  it.each([
    ['light', LIGHT],
    ['dark', DARK],
  ])('states %s colors as whole colors, not bare HSL triplets', (_name, tokens) => {
    for (const [token, value] of Object.entries(tokens)) {
      if (token === '--radius') continue;

      expect(value, `${token} must be a whole color`).not.toMatch(BARE_HSL_TRIPLET);
      expect(value, `${token} must be a whole color`).toMatch(
        /^(oklch|hsl|rgb|color|var|#)/
      );
    }
  });

  it('keeps both blocks at zero specificity so host themes win', () => {
    // A `:root` / `.dark` selector that is not wrapped in `:where()` would
    // outrank the host app's own token block whenever this stylesheet happens
    // to be emitted last.
    const unscoped = globalScss.match(/^\s*(:root|\.dark)\s*\{/gm);

    expect(unscoped).toBeNull();
  });

  it('wraps the runtime theme palettes in hsl() rather than emitting triplets', () => {
    // ThemeColorReactive injects THEME entries as custom properties. The
    // palettes are stored as triplets, so the injector must add the hsl()
    // wrapper — see ThemeColorReactive for the emit site.
    const injector = fs.readFileSync(
      path.resolve(__dirname, '../store/ThemeColorReactive.tsx'),
      'utf-8'
    );

    expect(injector).toContain('hsl(${value})');
    expect(THEME.light.default.popover).toMatch(BARE_HSL_TRIPLET);
  });
});

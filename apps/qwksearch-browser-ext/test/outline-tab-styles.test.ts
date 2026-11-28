/**
 * @fileoverview The article reader's Outline tab is the Fumadocs table of
 * contents, which is styled with `fd-*` Tailwind tokens. The extension builds
 * its own stylesheet, so it has to define those tokens and tell Tailwind to
 * scan Fumadocs' compiled TOC. Without either, the outline renders as unstyled
 * text (this regressed once: the `@import` sat below `@config`, and Vite's
 * postcss-import silently dropped it).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../styles/globals.css'), 'utf8');
const statements = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('@'));

describe('extension stylesheet', () => {
  it('imports the Fumadocs tokens before any other at-rule', () => {
    const neutral = statements.findIndex((line) => line.includes('fumadocs-ui/css/neutral.css'));
    expect(neutral).toBeGreaterThan(-1);
    const lastImport = statements.reduce((last, line, i) => (line.startsWith('@import') ? i : last), -1);
    expect(lastImport).toBeLessThan(statements.findIndex((line) => !line.startsWith('@import')));
  });

  it('scans the compiled Fumadocs TOC for utilities', () => {
    expect(statements.some((line) => /^@source .*fumadocs-ui\/dist\/components\/toc/.test(line))).toBe(true);
  });
});

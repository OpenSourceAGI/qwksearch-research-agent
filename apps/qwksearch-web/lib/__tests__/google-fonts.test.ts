import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  GOOGLE_FONTS_IMPORT,
  GOOGLE_FONTS_STYLESHEETS,
  googleFontsLoaderScript,
  stripGoogleFontsImports,
} from '../fonts/google-fonts';

const appDir = fileURLToPath(new URL('../../', import.meta.url));

function googleFontsImports(css: string): string[] {
  return [...css.matchAll(GOOGLE_FONTS_IMPORT)].map((match) => match[1]);
}

describe('google fonts', () => {
  it('loads every stylesheet the theme package imports', () => {
    // The build strips this import, so if a theme-package bump changes it and
    // the list here is not updated, the new themes silently lose their fonts.
    const themesCss = readFileSync(
      createRequire(`${appDir}package.json`).resolve('shadcn-theme-menu/themes.css'),
      'utf8',
    );
    const imported = googleFontsImports(themesCss);

    expect(imported.length).toBeGreaterThan(0);
    for (const url of imported) expect(GOOGLE_FONTS_STYLESHEETS).toContain(url);
  });

  it('keeps remote font imports out of the global stylesheet', () => {
    const globalsCss = readFileSync(`${appDir}app/globals.css`, 'utf8');

    expect(googleFontsImports(globalsCss)).toEqual([]);
  });

  it('strips google fonts imports and leaves every other import', () => {
    const css = [
      '@layer vendor, base;',
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");',
      "@import url('https://fonts.googleapis.com/css2?family=Lora&display=swap');",
      '@import "tailwindcss";',
      '.a{color:red}',
    ].join('\n');

    const stripped = stripGoogleFontsImports(css);

    expect(stripped).not.toContain('fonts.googleapis.com');
    expect(stripped).toContain('@layer vendor, base;');
    expect(stripped).toContain('@import "tailwindcss";');
    expect(stripped).toContain('.a{color:red}');
  });

  it('appends each stylesheet from the loader script', () => {
    const appended: Array<{ rel: string; href: string }> = [];
    const document = {
      head: { appendChild: (link: { rel: string; href: string }) => appended.push(link) },
      createElement: () => ({ rel: '', href: '' }),
    };

    new Function('document', googleFontsLoaderScript())(document);

    expect(appended).toEqual(GOOGLE_FONTS_STYLESHEETS.map((href) => ({ rel: 'stylesheet', href })));
  });
});

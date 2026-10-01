/**
 * The Google Fonts stylesheets the site uses, loaded without blocking the
 * first paint.
 *
 * Both used to be CSS `@import url(...)`s: the app's own list at the top of
 * `app/globals.css` (the faces offered under Settings → Font Family) and the
 * one `shadcn-theme-menu/themes.css` opens with (the faces its color themes
 * name in `--font-sans` / `--font-serif` / `--font-mono`). An `@import` inside
 * a stylesheet is render-blocking and chained: the browser has to download the
 * app's CSS, find the imports, open a connection to fonts.googleapis.com and
 * download both font stylesheets before it paints anything — on every first
 * visit, for every page, whether or not the chosen theme uses a web font (the
 * default one doesn't).
 *
 * Now the build strips those imports (`vite.config.ts`,
 * `defer-google-fonts-imports`) and `app/layout.tsx` adds these stylesheets from
 * an inline script instead. A script-inserted stylesheet never blocks
 * rendering, so text paints in the fallback face at once and swaps when the
 * font arrives — the same `display=swap` behaviour, minus the blank page.
 *
 * `lib/__tests__/google-fonts.test.ts` fails if `themes.css` starts importing
 * a URL that is not listed here, so a theme-package bump cannot silently drop
 * its fonts.
 */

/** Settings → Font Family (`components/Settings/Sections/Account.tsx`). */
export const APP_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=Open+Sans:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=PT+Sans:wght@400;700&family=Raleway:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500;700&family=Roboto+Slab:wght@400;500;700&family=Source+Code+Pro:wght@400;500;700&family=Source+Sans+3:wght@400;500;600;700&family=Ubuntu:wght@400;500;700&display=swap';

/** Verbatim from the top of `shadcn-theme-menu/themes.css`. */
export const THEME_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=DM+Sans:wght@400;500;700&family=Fira+Code:wght@400;500;700&family=Geist+Mono:wght@400;500;700&family=Geist:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Libre+Baskerville:wght@400;700&family=Lora:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Oxanium:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;700&family=Roboto:wght@400;500;700&family=Source+Code+Pro:wght@400;500;700&family=Source+Serif+4:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Ubuntu+Mono:wght@400;700&display=swap';

export const GOOGLE_FONTS_STYLESHEETS = [APP_FONTS_STYLESHEET, THEME_FONTS_STYLESHEET] as const;

/** Matches a CSS `@import` of a Google Fonts stylesheet, with its trailing `;`. */
export const GOOGLE_FONTS_IMPORT = /@import\s+url\(\s*["']?(https:\/\/fonts\.googleapis\.com\/[^"')]+)["']?\s*\)\s*;?/g;

/** Removes every Google Fonts `@import` from a stylesheet's source. */
export function stripGoogleFontsImports(css: string): string {
  return css.replace(GOOGLE_FONTS_IMPORT, '');
}

/**
 * Inline `<head>` script that appends the stylesheets. Inline rather than a
 * `<link>` in the JSX: React hoists and orders stylesheet links as blocking
 * resources, which is exactly what this is here to avoid.
 */
export function googleFontsLoaderScript(): string {
  return `(function(){try{var h=document.head;${JSON.stringify(GOOGLE_FONTS_STYLESHEETS)}.forEach(function(u){var l=document.createElement('link');l.rel='stylesheet';l.href=u;h.appendChild(l);});}catch(e){}})();`;
}

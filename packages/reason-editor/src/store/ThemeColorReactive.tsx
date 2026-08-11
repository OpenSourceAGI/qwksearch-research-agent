/**
 * Headless component that applies the selected theme's color variables to the DOM. Watches the theme store and injects or removes CSS custom properties as the theme changes.
 */

import { useEffect } from 'react';

import { THEME, useTheme } from '@/theme/theme';
import { removeCSS, updateCSS } from '@/utils/dynamicCSS';

/**
 * Elements the theme tokens are applied to: the editor root, the standalone
 * theme scope, and the portalled surfaces (tooltips, dropdowns, bubble menus)
 * which render outside the editor's DOM subtree and so cannot inherit from it.
 */
const THEME_SCOPE = [
  '.reactjs-tiptap-editor',
  '.reactjs-tiptap-editor-theme',
  'div[data-richtext-portal]',
].join(', ');

export function ThemeColorReactive() {
  const { theme, color, borderRadius } = useTheme();

  useEffect(() => {
    const themeValue = theme || 'light';
    const colorValue = color || 'default';

    // @ts-ignore — indexed by the two signal values, both validated below.
    const themeObject = THEME[themeValue]?.[colorValue] ?? THEME.light.default;

    const declarations: string[] = [
      `--richtext-radius: ${typeof borderRadius === 'string' ? borderRadius : themeObject.radius};`,
    ];

    // `default` means "inherit the host application's theme". The static
    // tokens in `styles/global.scss` already alias `--richtext-*` onto the
    // app's own `--primary` / `--secondary` / `--background` / … so there is
    // nothing to inject: writing the packaged shadcn greys here would paint
    // over the product's palette (and its dark mode) with a fixed light one,
    // which is what used to leave the editor stubbornly white inside a themed
    // app. Only an explicitly chosen accent palette overrides the host.
    if (colorValue !== 'default') {
      for (const [key, value] of Object.entries(themeObject)) {
        if (key === 'radius') continue;
        // The palettes in `theme/theme.ts` store bare `H S L` channels, while
        // the tokens hold complete colours (a host may theme in any colour
        // space, so consumers can no longer wrap them in `hsl()`).
        declarations.push(`--richtext-${key}: hsl(${value});`);
      }
    }

    updateCSS(`${THEME_SCOPE} {\n${declarations.join('\n')}\n}`, 'richtext-theme', {
      priority: 50,
    });

    return () => {
      removeCSS('richtext-theme');
    };
  }, [theme, color, borderRadius]);

  return <></>;
}

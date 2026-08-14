/**
 * Headless component that applies the selected theme's color variables to the DOM. Watches the theme store and injects or removes CSS custom properties as the theme changes.
 */

import { useEffect } from 'react';

import { THEME, useTheme } from '@/theme/theme';
import { removeCSS, updateCSS } from '@/utils/dynamicCSS';

export function ThemeColorReactive() {
  const { theme, color, borderRadius } = useTheme();

  useEffect(() => {
    const themeValue = theme || 'light';
    const colorValue = color || 'default';

    //@ts-ignore
    let themeObject = THEME[themeValue][colorValue];

    if (!themeObject) {
      themeObject = THEME['light']['default'];
      return;
    }

    updateCSS(
      `
      .reactjs-tiptap-editor, .reactjs-tiptap-editor *,
      .reactjs-tiptap-editor-theme, .reactjs-tiptap-editor-theme *,
      div[data-richtext-portal], div[data-richtext-portal] * {
        ${Object.entries(themeObject)
          .map(([key, value]) => {
            if (key === 'radius') {
              return `--${key}: ${typeof borderRadius === 'string' ? borderRadius : value};`;
            }

            // THEME stores palettes as bare HSL channel triplets. Emit them as
            // whole `hsl()` colors so the variables match the shadcn token
            // format every consumer's Tailwind expects — a bare triplet in a
            // `background-color: var(--popover)` is invalid and drops the
            // declaration, leaving portalled surfaces unstyled.
            return `--${key}: hsl(${value});`;
          })
          .join('\n')}
      }
      `,
      'richtext-theme',
      {
        priority: 50,
      }
    );

    return () => {
      removeCSS('richtext-theme');
    };
  }, [theme, color, borderRadius]);

  return <></>;
}

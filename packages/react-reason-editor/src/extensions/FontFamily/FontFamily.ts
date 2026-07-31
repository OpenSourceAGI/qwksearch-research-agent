/**
 * Defines the FontFamily Tiptap extension, which adds font-family selection to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import {
  FontFamily as FontFamilyTiptap,
  type FontFamilyOptions as TiptapFontFamilyOptions,
} from '@tiptap/extension-text-style';

import { DEFAULT_FONT_FAMILY_LIST } from '@/constants';
import { ensureNameValueOptions } from '@/utils/utils';

import type { GeneralOptions, NameValueOption } from '@/types';

export * from './components/RichTextFontFamily';

export interface FontFamilyOptions
  extends TiptapFontFamilyOptions, GeneralOptions<FontFamilyOptions> {
  /**
   * Font family list.
   */
  fontFamilyList: (string | NameValueOption)[];
}

export const FontFamily =
   FontFamilyTiptap.extend<FontFamilyOptions>({
    //@ts-expect-error
    addOptions() {
      return {
        ...this.parent?.(),
        fontFamilyList: DEFAULT_FONT_FAMILY_LIST,
        button({ editor, extension, t }: any) {
          const fontFamilyList = ensureNameValueOptions(extension?.options?.fontFamilyList || []);

          const items = fontFamilyList
            .map((font) => ({
              action: () => {
                if (font.value === 'Default') {
                  editor.chain().focus().unsetFontFamily().run();
                  return;
                }
                editor.chain().focus().setFontFamily(font.value).run();
              },
              isActive: () => editor.isActive('textStyle', { fontFamily: font.value }) || false,
              // disabled: !editor.can().setFontFamily(font.value),
              title: font.value === 'Default' ? 'Inter' : font.name,
              font: font.value === 'Default' ? 'Inter' : font.value,
              default: font.value === 'Default',
            }))
            // Keep the "Default" reset entry pinned first, alphabetize the rest.
            .sort((a, b) => {
              if (a.default) return -1;
              if (b.default) return 1;
              return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
            });

          return {
            // component: FontFamilyButton,
            componentProps: {
              tooltip: t('editor.fontFamily.tooltip'),
              disabled: false,
              items,
              isActive: () => {
                const find: any = items?.find((k: any) => k.isActive());

                if (find && !find.default) {
                  return find;
                }

                const item = {
                  title: 'Inter',
                  font: 'Inter',
                  isActive: () => false,
                  disabled: false,
                };
                return item;
              },
              icon: 'MenuDown',
              fontFamilyList,
            },
          };
        },
      };
    },
  });

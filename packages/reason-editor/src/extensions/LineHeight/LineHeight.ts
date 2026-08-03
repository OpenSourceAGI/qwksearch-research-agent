/**
 * Defines the LineHeight Tiptap extension, which adds line-height/spacing control to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import {
  LineHeight as TiptapLineHeight,
  type LineHeightOptions as TiptapLineHeightOptions,
} from '@tiptap/extension-text-style';

import { DEFAULT_LINE_HEIGHT_LIST } from '@/constants';

import type { GeneralOptions } from '@/types';

export * from './components/RichTextLightHeight';

export interface LineHeightOptions extends GeneralOptions<TiptapLineHeightOptions> {
  lineHeights: string[];
}

export const LineHeight =
   TiptapLineHeight.extend<LineHeightOptions>({
    //@ts-expect-error
    addOptions() {
      return {
        ...this.parent?.(),
        lineHeights: DEFAULT_LINE_HEIGHT_LIST,
        button({ editor, extension, t }: any) {
          const items = extension?.options?.lineHeights?.map((item: any) => {
            return {
              label: item === 'Default' ? t('editor.default') : String(item),
              value: item,
              isActive: () => {
                const isDefault = item === 'Default';
                if (isDefault) {
                  return true;
                }
                return editor.isActive('textStyle', { lineHeight: item }) || false;
              },
              action: () => {
                if (item === 'Default') {
                  editor.chain().focus().unsetLineHeight().run();
                  return;
                }
                editor.chain().focus().toggleTextStyle({ lineHeight: item }).run();
              },
              // disabled: !editor.can().setFontSize(String(k.value)),
              default: item === 'Default' || false,
            };
          });

          return {
            componentProps: {
              tooltip: t('editor.lineheight.tooltip'),
              items,
              icon: 'LineHeight',
              isActive: () => {
                const find: any = (items || []).find((k: any) => k.isActive() && !k.default);
                if (find && !find.default) {
                  return find;
                }
                const item = {
                  value: 'Default',
                  isActive: () => false,
                };
                return item;
              },
            },
          };
        },
      };
    },
  });

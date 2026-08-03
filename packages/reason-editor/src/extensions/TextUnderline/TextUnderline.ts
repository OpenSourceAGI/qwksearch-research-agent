/**
 * Defines the TextUnderline Tiptap extension, which adds underline text formatting to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import TiptapUnderline from '@tiptap/extension-underline';

import type { GeneralOptions } from '@/types';
import type { UnderlineOptions as TiptapUnderlineOptions } from '@tiptap/extension-underline';

export * from './components/RichTextUnderline';

export interface UnderlineOptions
  extends TiptapUnderlineOptions, GeneralOptions<UnderlineOptions> {}

export const TextUnderline =
   TiptapUnderline.extend<UnderlineOptions>({
    //@ts-expect-error
    addOptions() {
      return {
        ...this.parent?.(),
        button({ editor, t, extension }: any) {
          return {
            componentProps: {
              action: () => editor.commands.toggleUnderline(),
              isActive: () => editor.isActive('underline') || false,
              disabled: false,
              icon: 'Underline',
              shortcutKeys: extension.options.shortcutKeys ?? ['mod', 'U'],
              tooltip: t('editor.underline.tooltip'),
            },
          };
        },
      };
    },
  });

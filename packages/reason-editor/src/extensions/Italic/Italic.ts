/**
 * Defines the Italic Tiptap extension, which adds italic text formatting to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import TiptapItalic from '@tiptap/extension-italic';

import type { GeneralOptions } from '@/types';
import type { ItalicOptions as TiptapItalicOptions } from '@tiptap/extension-italic';

export * from './components/RichTextItalic';

export interface ItalicOptions extends TiptapItalicOptions, GeneralOptions<ItalicOptions> {}

export const Italic =  TiptapItalic.extend<ItalicOptions>({
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button({ editor, t, extension }) {
        return {
          componentProps: {
            action: () => editor.commands.toggleItalic(),
            isActive: () => editor.isActive('italic') || false,
            disabled: false,
            shortcutKeys: extension.options.shortcutKeys ?? ['mod', 'I'],
            icon: 'Italic',
            tooltip: t('editor.italic.tooltip'),
          },
        };
      },
    };
  },
});

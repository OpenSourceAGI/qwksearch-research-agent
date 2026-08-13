/**
 * Defines the Bold Tiptap extension, which adds bold text formatting to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Bold as TiptapBold } from '@tiptap/extension-bold';

import { ActionButton } from '@/components';

import type { GeneralOptions } from '@/types';
import type { BoldOptions as TiptapImageOptions } from '@tiptap/extension-bold';

export * from './components/RichTextBold';

export interface BoldOptions extends TiptapImageOptions, GeneralOptions<BoldOptions> {}

export const Bold =  TiptapBold.extend<BoldOptions>({
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor, t, extension }: any) => ({
        component: ActionButton,
        componentProps: {
          action: () => editor.commands.toggleBold(),
          isActive: () => editor.isActive('bold'),
          icon: 'Bold',
          shortcutKeys: extension.options.shortcutKeys ?? ['mod', 'B'],
          tooltip: t('editor.bold.tooltip'),
        },
      }),
    };
  },
});

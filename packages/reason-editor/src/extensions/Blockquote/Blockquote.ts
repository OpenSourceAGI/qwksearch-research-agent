/**
 * Defines the Blockquote Tiptap extension, which adds blockquote formatting to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Blockquote as TiptapBlockquote } from '@tiptap/extension-blockquote';

import type { GeneralOptions } from '@/types';
import type { BlockquoteOptions as TiptapBlockquoteOptions } from '@tiptap/extension-blockquote';

export * from './components/RichTextBlockquote';

export interface BlockquoteOptions
  extends TiptapBlockquoteOptions, GeneralOptions<BlockquoteOptions> {}

export const Blockquote =
   TiptapBlockquote.extend<BlockquoteOptions>({
    //@ts-expect-error
    addOptions() {
      return {
        ...this.parent?.(),
        HTMLAttributes: {
          class: 'blockquote',
        },
        button: ({ editor, t, extension }: any) => ({
          componentProps: {
            action: () => editor.commands.toggleBlockquote(),
            isActive: () => editor.isActive('blockquote'),
            disabled: !editor.can().toggleBlockquote(),
            icon: 'TextQuote',
            shortcutKeys: extension.options.shortcutKeys ?? ['shift', 'mod', 'B'],
            tooltip: t('editor.blockquote.tooltip'),
          },
        }),
      };
    },
  });

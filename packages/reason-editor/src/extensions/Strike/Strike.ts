/**
 * Defines the Strike Tiptap extension, which adds strikethrough text formatting to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Strike as TiptapStrike } from '@tiptap/extension-strike';

import type { GeneralOptions } from '@/types';
import type { StrikeOptions as TiptapStrikeOptions } from '@tiptap/extension-strike';

export * from './components/RichTextStrike';

export interface StrikeOptions extends TiptapStrikeOptions, GeneralOptions<StrikeOptions> {}

export const Strike =  TiptapStrike.extend<StrikeOptions>({
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor, t, extension }: any) => ({
        componentProps: {
          action: () => editor.commands.toggleStrike(),
          isActive: () => editor.isActive('strike') || false,
          disabled: false,
          icon: 'Strikethrough',
          shortcutKeys: extension.options.shortcutKeys ?? ['shift', 'mod', 'S'],
          tooltip: t('editor.strike.tooltip'),
        },
      }),
    };
  },
});

/**
 * Defines the Code Tiptap extension, which adds inline code formatting to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Code as TiptapCode } from '@tiptap/extension-code';

import type { GeneralOptions } from '@/types';
import type { CodeOptions as TiptapCodeOptions } from '@tiptap/extension-code';

export * from './components/RichTextCode';

export interface CodeOptions extends TiptapCodeOptions, GeneralOptions<CodeOptions> {}

export const Code =  TiptapCode.extend<CodeOptions>({
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor, t, extension }) => ({
        componentProps: {
          action: () => editor.commands.toggleCode(),
          isActive: () => editor.isActive('code'),
          disabled: !editor.can().toggleCode(),
          icon: 'Code',
          shortcutKeys: extension.options.shortcutKeys ?? ['mod', 'E'],
          tooltip: t('editor.code.tooltip'),
        },
      }),
    };
  },
});

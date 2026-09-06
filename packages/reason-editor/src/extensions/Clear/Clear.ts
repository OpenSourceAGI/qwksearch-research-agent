/**
 * Defines the Clear Tiptap extension, which adds clearing inline formatting from a selection to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Node } from '@tiptap/core';

import type { GeneralOptions } from '@/types';

export interface ClearOptions extends GeneralOptions<ClearOptions> {}

export * from './components/RichTextClear';

export const Clear =  Node.create<ClearOptions>({
  name: 'clear',
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor, t, extension }: any) => ({
        // component: ActionButton,
        componentProps: {
          action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
          isActive: () => editor.can().chain().focus().clearNodes().unsetAllMarks().run(),
          icon: 'Eraser',
          shortcutKeys: extension.options.shortcutKeys ?? ['mod', '\\'],
          tooltip: t('editor.clear.tooltip'),
        },
      }),
    };
  },
});

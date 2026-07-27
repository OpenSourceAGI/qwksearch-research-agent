/**
 * Defines the BulletList Tiptap extension, which adds unordered (bullet) lists to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

// import type { BulletListOptions as TiptapBulletListOptions } from '@tiptap/extension-bullet-list';
// import { BulletList as TiptapBulletList } from '@tiptap/extension-bullet-list';
import {
  BulletList as TiptapBulletList,
  type BulletListOptions as TiptapBulletListOptions,
} from '@tiptap/extension-list';

import type { GeneralOptions } from '@/types';

export * from './components/RichTextBulletList';

export interface BulletListOptions
  extends TiptapBulletListOptions, GeneralOptions<BulletListOptions> {}

export const BulletList =
   TiptapBulletList.extend<BulletListOptions>({
    //@ts-expect-error
    addOptions() {
      return {
        ...this.parent?.(),
        button: ({ editor, t, extension }) => ({
          // component: ActionButton,
          componentProps: {
            action: () => editor.commands.toggleBulletList(),
            isActive: () => editor.isActive('bulletList'),
            disabled: false,
            shortcutKeys: extension.options.shortcutKeys ?? ['shift', 'mod', '8'],
            icon: 'List',
            tooltip: t('editor.bulletlist.tooltip'),
          },
        }),
      };
    },
  });

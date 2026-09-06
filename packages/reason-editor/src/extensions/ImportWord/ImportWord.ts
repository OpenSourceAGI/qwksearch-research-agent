/**
 * Defines the ImportWord Tiptap extension, which adds importing Word (.docx) documents to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Extension } from '@tiptap/core';

import type { GeneralOptions } from '@/types';

export * from '@/extensions/ImportWord/components/RichTextImportWord';

interface ImportWordOptions extends GeneralOptions<ImportWordOptions> {
  /** Function for converting Word files to HTML */
  convert?: (file: File) => Promise<string>;

  /** Function for uploading images */
  upload?: (files: File[]) => Promise<unknown>;

  /**
   * File Size limit(10 MB)
   *
   * @default 1024 * 1024 * 10
   */
  limit?: number;
}

export const ImportWord =  Extension.create<ImportWordOptions>({
  name: 'importWord',
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      upload: undefined,
      convert: undefined,
      limit: 1024 * 1024 * 10, // 10 MB
      button: ({ extension, t }) => {
        const { convert, limit } = extension.options;
        return {
          componentProps: {
            convert,
            limit,
            // action: () => editor.commands.setHorizontalRule(),
            // disabled: !editor.can().setHorizontalRule(),
            icon: 'Word',
            // No default combo: nothing binds one, and the old ['alt','mod','S']
            // collided with Horizontal Rule's real shortcut.
            shortcutKeys: extension.options.shortcutKeys,
            tooltip: t('editor.importWord.tooltip'),
          },
        };
      },
    };
  },
});

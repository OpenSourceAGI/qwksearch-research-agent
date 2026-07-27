/**
 * Defines the WordCount Tiptap extension, which adds word and character counting to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Extension } from '@tiptap/core';

import type { GeneralOptions } from '@/types';

export * from './components/RichTextWordCount';
export * from './utils/wordCount';

export interface WordCountOptions extends GeneralOptions<WordCountOptions> {}

export const WordCount = Extension.create<WordCountOptions>({
  name: 'wordCount',
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor }: any) => ({
        componentProps: {
          action: () => {
            return;
          },
          icon: 'WordCount',
          tooltip: 'Word Count',
          isActive: () => true,
          disabled: false,
          editor,
        },
      }),
    };
  },
});

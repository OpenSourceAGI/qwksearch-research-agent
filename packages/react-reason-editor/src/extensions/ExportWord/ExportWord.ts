/**
 * Defines the ExportWord Tiptap extension, which adds exporting the document to a Word (.docx) file to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Extension } from '@tiptap/core';

import { downloadFromBlob } from '@/utils/download';

import type { GeneralOptions } from '@/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    exportWord: {
      exportToWord: () => ReturnType;
    };
  }
}

interface ExportWordOptions extends GeneralOptions<ExportWordOptions> {}

export * from './components/RichTextExportWord';

export const ExportWord = Extension.create<ExportWordOptions>({
  name: 'exportWord',

  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor, t }: any) => ({
        componentProps: {
          icon: 'ExportWord',
          action: () => {
            return editor?.commands.exportToWord();
          },
          tooltip: t('editor.exportWord.tooltip'),
          isActive: () => false,
          disabled: false,
        },
      }),
    };
  },

  // @ts-expect-error
  addCommands() {
    return {
      exportToWord: () => async ({ editor }) => {
        try {
          const { default: htmlToDocx } = await import('html-to-docx');
          const html = editor.getHTML();
          const docxBuffer = await htmlToDocx(html, null, {});
          downloadFromBlob(new Blob([docxBuffer]), 'richtext-export-document.docx');
          return true;
        } catch (error) {
          console.error('Error exporting to Word:', error);
          return false;
        }
      },
    };
  },
});

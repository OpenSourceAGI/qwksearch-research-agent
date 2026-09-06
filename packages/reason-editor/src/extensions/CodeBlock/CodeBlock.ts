/**
 * Defines the CodeBlock Tiptap extension, which adds syntax-highlighted code blocks to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import CodeBlockLowlight, {
  type CodeBlockLowlightOptions,
} from '@tiptap/extension-code-block-lowlight';
export * from '@/extensions/CodeBlock/components/RichTextCodeBlock';
import { type GeneralOptions } from '@/types';

export interface CodeBlockOptions
  extends CodeBlockLowlightOptions, GeneralOptions<CodeBlockOptions> {}

export const CodeBlock = CodeBlockLowlight.extend<CodeBlockOptions>({
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor, t, extension }: any) => {
        return {
          componentProps: {
            action: () => editor.chain().focus().setCodeBlock({ language: 'plaintext' }).run(),
            isActive: () => editor.isActive('codeBlock'),
            disabled: false,
            icon: 'Code2',
            shortcutKeys: extension.options.shortcutKeys ?? ['mod', 'alt', 'C'],
            tooltip: t('editor.codeblock.tooltip'),
          },
        };
      },
    };
  },
});

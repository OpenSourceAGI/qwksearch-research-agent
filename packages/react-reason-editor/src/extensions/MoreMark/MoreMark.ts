/**
 * Defines the MoreMark Tiptap extension, which adds additional inline marks (superscript, subscript, and more) to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Extension } from '@tiptap/core';
import { Subscript as TiptapSubscript } from '@tiptap/extension-subscript';
import { Superscript as TiptapSuperscript } from '@tiptap/extension-superscript';

import type { Item } from '@/extensions/MoreMark/components/RichTextMoreMark';
import type { GeneralOptions } from '@/types';
import type { Extensions } from '@tiptap/core';
import type { SubscriptExtensionOptions as TiptapSubscriptOptions } from '@tiptap/extension-subscript';
import type { SuperscriptExtensionOptions as TiptapSuperscriptOptions } from '@tiptap/extension-superscript';

export * from './components/RichTextMoreMark';

export interface MoreMarkOptions extends GeneralOptions<MoreMarkOptions> {
  /**
   * // options for Subscript Extension
   *
   * @default true
   */
  subscript: Partial<TiptapSubscriptOptions> | false;
  /**
   * // options for Superscript Extension
   *
   * @default true
   */
  superscript: Partial<TiptapSuperscriptOptions> | false;
}

export const MoreMark =  Extension.create<MoreMarkOptions>({
  name: 'moreMark',
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button({ editor, extension, t }) {
        const subscript = extension.options.subscript;
        const superscript = extension.options.superscript;
        const subBtn: Item = {
          action: () => editor.commands.toggleSubscript(),
          isActive: () => editor.isActive('subscript') || false,
          disabled: !editor.can().toggleSubscript(),
          icon: 'Subscript',
          title: t('editor.subscript.tooltip'),
          shortcutKeys: (extension.options.shortcutKeys?.[0] ?? ['mod', '.']) as string[],
        };

        const superBtn: Item = {
          action: () => editor.commands.toggleSuperscript(),
          isActive: () => editor.isActive('superscript') || false,
          disabled: !editor.can().toggleSuperscript(),
          icon: 'Superscript',
          title: t('editor.superscript.tooltip'),
          shortcutKeys: (extension.options.shortcutKeys?.[1] ?? ['mod', ',']) as string[],
        };

        const items: Item[] = [];

        if (subscript !== false) {
          items.push(subBtn);
        }
        if (superscript !== false) {
          items.push(superBtn);
        }

        return {
          // component: ActionMoreButton,
          componentProps: {
            icon: 'Type',
            tooltip: t('editor.moremark'),
            disabled: !editor.isEditable,
            items,
            isActive: () => {
              const find: any = items?.find((k: any) => k.isActive());

              return find;
            },
          },
        };
      },
    };
  },

  addExtensions() {
    const extensions: Extensions = [];

    if (this.options.subscript !== false) {
      extensions.push(
        TiptapSubscript.extend({
          //@ts-expect-error - button comes from GeneralOptions defaults applied by the toolbar
          addOptions() {
            return {
              ...this.parent?.(),
              button: ({ editor, t }: any) => ({
                componentProps: {
                  action: () => editor.commands.toggleSubscript(),
                  isActive: () => editor.isActive('subscript') || false,
                  disabled: !editor.can().toggleSubscript(),
                  icon: 'Subscript',
                  tooltip: t('editor.subscript.tooltip'),
                  shortcutKeys: ['mod', ','],
                },
              }),
            };
          },
        }).configure(this.options.subscript),
      );
    }

    if (this.options.superscript !== false) {
      extensions.push(
        TiptapSuperscript.extend({
          //@ts-expect-error - button comes from GeneralOptions defaults applied by the toolbar
          addOptions() {
            return {
              ...this.parent?.(),
              button: ({ editor, t }: any) => ({
                componentProps: {
                  action: () => editor.commands.toggleSuperscript(),
                  isActive: () => editor.isActive('superscript') || false,
                  disabled: !editor.can().toggleSuperscript(),
                  icon: 'Superscript',
                  tooltip: t('editor.superscript.tooltip'),
                  shortcutKeys: ['mod', '.'],
                },
              }),
            };
          },
        }).configure(this.options.superscript),
      );
    }

    return extensions;
  },
});

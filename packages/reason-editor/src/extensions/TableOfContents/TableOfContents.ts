/**
 * Defines the TableOfContents Tiptap extension, which adds an automatic table of contents to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface TableOfContentsOptions {
  levels: number[];
}

export interface TocItem {
  id: string;
  level: number;
  title: string;
  textContent: string;
  position: number;
  isActive: boolean;
  isScrolledOver: boolean;
}

export const TableOfContents = Extension.create<TableOfContentsOptions>({
  name: 'tableOfContents',

  addOptions() {
    return {
      levels: [1, 2, 3],
    };
  },

  addStorage() {
    return {
      toc: [] as TocItem[],
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('tableOfContents'),
        state: {
          init() {
            return {
              toc: [] as TocItem[],
              decorationSet: DecorationSet.empty,
            };
          },
          apply(tr, value, oldState, newState) {
            const toc: TocItem[] = [];
            const decorations: Decoration[] = [];
            let position = 0;

            newState.doc.descendants((node, pos) => {
              if (node.type.name === 'heading') {
                const level = node.attrs.level;
                if (extension.options.levels.includes(level)) {
                  const id = node.attrs.id || `heading-${pos}`;
                  const textContent = node.textContent;
                  toc.push({
                    id,
                    level,
                    title: textContent,
                    textContent,
                    position: pos,
                    isActive: false,
                    isScrolledOver: false,
                  });
                }
              }
            });

            extension.storage.toc = toc;
            return { toc, decorationSet: DecorationSet.empty };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorationSet || DecorationSet.empty;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {};
  },
});

export default TableOfContents;

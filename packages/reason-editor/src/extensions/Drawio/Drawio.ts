/**
 * Defines the Drawio Tiptap extension, which adds draw.io / diagrams.net diagram embeds to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import NodeViewDrawio from '@/extensions/Drawio/components/NodeViewDrawio/NodeViewDrawio';
import { getDatasetAttribute, nodeAttrsToDataset } from '@/utils/dom-dataset';

export * from '@/extensions/Drawio/components/RichTextDrawio';

const DEFAULT_DIAGRAM_DATA = { xml: '' };

export interface IDrawioAttrs {
  defaultShowPicker?: boolean;
  createUser?: any;
  width?: number | string;
  height?: number;
  data?: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawio: {
      setDrawio: (attrs?: IDrawioAttrs) => ReturnType;
    };
  }
}

export const Drawio = Node.create({
  name: 'drawio',
  group: 'block',
  selectable: true,
  atom: true,
  draggable: true,
  inline: false,

  addAttributes() {
    return {
      defaultShowPicker: {
        default: false,
      },
      createUser: {
        default: null,
      },
      width: {
        default: '100%',
        parseHTML: getDatasetAttribute('width'),
      },
      height: {
        default: 400,
        parseHTML: getDatasetAttribute('height'),
      },
      data: {
        default: DEFAULT_DIAGRAM_DATA,
        parseHTML: getDatasetAttribute('data', true),
      },
    };
  },

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'drawio',
      },
      drawioProps: {},
      button: () => ({
        componentProps: {},
      }),
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[class=drawio]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }: any) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, nodeAttrsToDataset(node)),
    ];
  },

  addCommands() {
    return {
      setDrawio:
        (options) =>
        ({ tr, commands, chain }) => {
          options = options || {};
          options.data = options.data || DEFAULT_DIAGRAM_DATA;

          // @ts-ignore
          if (tr.selection?.node?.type?.name == this.name) {
            return commands.updateAttributes(this.name, options);
          }

          return chain()
            .insertContent({
              type: this.name,
              attrs: options,
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(NodeViewDrawio);
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^\$drawio\$$/,
        type: this.type,
        getAttributes: () => {
          return { width: '100%' };
        },
      }),
    ];
  },
});

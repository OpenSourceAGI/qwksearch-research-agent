/**
 * Defines the Mention Tiptap extension, which adds @-mentions to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import BulitInMention, { type MentionOptions } from '@tiptap/extension-mention';
import { Extension } from '@tiptap/react';

import { NodeViewMentionList } from '@/extensions/Mention/components/NodeViewMentionList';
import { renderNodeViewClosure } from '@/utils/renderNodeView';

export const Mention =  Extension.create<MentionOptions>({
  name: 'richTextMentionWrapper',

  addExtensions() {
    const config: any = {
      ...this.options,
    };

    if (this.options?.suggestion) {
      config['suggestion'] = {
        render: renderNodeViewClosure(NodeViewMentionList),
        ...this.options.suggestion,
      };
    }

    if (this.options?.suggestions?.length) {
      config['suggestions'] = this.options.suggestions?.map((s) => {
        return {
          render: renderNodeViewClosure(NodeViewMentionList),
          ...s,
        };
      });
    }

    return [
      BulitInMention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        ...config,
      }),
    ];
  },
});

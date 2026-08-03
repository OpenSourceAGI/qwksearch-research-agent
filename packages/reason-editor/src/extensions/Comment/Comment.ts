/**
 * Defines the Comment Tiptap extension, which adds inline comments and annotations to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { Mark } from '@tiptap/core';
import { ActionButton } from '@/components';
import type { GeneralOptions } from '@/types';

export * from './components/CommentView';

export interface CommentOptions extends GeneralOptions<CommentOptions> {
  HTMLAttributes: Record<string, any>;
  authorId?: string;
  authorName?: string;
  authorColor?: string;
  onCommentAdd?: (commentData: CommentData) => void;
  onCommentRemove?: (commentId: string) => void;
  onCommentResolve?: (commentId: string, resolved: boolean) => void;
}

export interface CommentData {
  id: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  text: string;
  timestamp: number;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  text: string;
  timestamp: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /** Wrap the current selection in a comment mark. */
      setComment: (attributes: Partial<CommentData>) => ReturnType;
      /** Remove the comment mark from the current selection. */
      removeComment: () => ReturnType;
    };
  }
}

export const Comment = Mark.create<CommentOptions>({
  name: 'comment',

  priority: 100,

  keepOnSplit: true,

  //@ts-expect-error - divider/spacer come from GeneralOptions defaults applied by the toolbar
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'tiptap-comment',
      },
      authorId: '',
      authorName: 'Anonymous',
      authorColor: '#4F46E5',
      onCommentAdd: undefined,
      onCommentRemove: undefined,
      onCommentResolve: undefined,
      button: ({ editor, t, extension }: any) => ({
        component: ActionButton,
        componentProps: {
          action: () => editor.commands.setComment({ id: `comment-${Date.now()}` }),
          isActive: () => editor.isActive('comment'),
          icon: 'MessageCircle',
          tooltip: t('editor.comment.tooltip') || 'Add comment',
        },
      }),
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          return {
            'data-comment-id': attributes.id,
          };
        },
      },
      authorId: {
        default: this.options.authorId,
        parseHTML: (element) => element.getAttribute('data-author-id'),
        renderHTML: (attributes) => {
          return {
            'data-author-id': attributes.authorId,
          };
        },
      },
      authorName: {
        default: this.options.authorName,
        parseHTML: (element) => element.getAttribute('data-author-name'),
        renderHTML: (attributes) => {
          return {
            'data-author-name': attributes.authorName,
          };
        },
      },
      authorColor: {
        default: this.options.authorColor,
        parseHTML: (element) => element.getAttribute('data-author-color'),
        renderHTML: (attributes) => {
          return {
            'data-author-color': attributes.authorColor,
          };
        },
      },
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-comment-text') || '',
        renderHTML: (attributes) => {
          return {
            'data-comment-text': attributes.text,
          };
        },
      },
      timestamp: {
        default: Date.now(),
        parseHTML: (element) => parseInt(element.getAttribute('data-timestamp') || '0'),
        renderHTML: (attributes) => {
          return {
            'data-timestamp': attributes.timestamp,
          };
        },
      },
      resolved: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-resolved') === 'true',
        renderHTML: (attributes) => {
          return {
            'data-resolved': attributes.resolved ? 'true' : 'false',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        class: `${this.options.HTMLAttributes.class} ${HTMLAttributes['data-resolved'] === 'true' ? 'resolved' : 'active'} ${
          HTMLAttributes['data-author-color'] || 'bg-blue-200'
        }`,
      },
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (attributes: Partial<CommentData>) =>
        ({ commands, editor }) => {
          const { selection } = editor.state;

          if (selection.empty) {
            return false;
          }

          const commentData: CommentData = {
            id: attributes.id || `comment-${Date.now()}`,
            authorId: attributes.authorId || this.options.authorId || '',
            authorName: attributes.authorName || this.options.authorName || 'Anonymous',
            authorColor: attributes.authorColor || this.options.authorColor || '#4F46E5',
            text: attributes.text || '',
            timestamp: attributes.timestamp || Date.now(),
            resolved: attributes.resolved ?? false,
            replies: attributes.replies || [],
          };

          this.options.onCommentAdd?.(commentData);

          return commands.setMark(this.name, commentData);
        },

      removeComment:
        () =>
        ({ commands }) => {
          const { $anchor } = this.editor.state.selection;
          const mark = $anchor.marks().find((m) => m.type.name === this.name);

          if (mark) {
            this.options.onCommentRemove?.(mark.attrs.id);
          }

          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.setComment({ id: `comment-${Date.now()}` }),
    };
  },
});

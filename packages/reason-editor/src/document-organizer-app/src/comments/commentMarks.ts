/**
 * @module commentMarks
 * @description Helpers for locating and mutating `comment` marks in a Tiptap
 * document by their comment id. The comment thread bodies/replies live in the
 * React thread store (see {@link useCommentThreads}); the mark itself only
 * anchors the highlighted range and carries the id plus a `resolved` flag used
 * for styling. These helpers keep the marks in sync when a thread is resolved,
 * reopened, or deleted from the sidebar (i.e. away from the current selection).
 */
import type { Editor } from '@tiptap/core';
import type { CommentData } from '@/extensions/Comment';

const COMMENT_MARK = 'comment';

/** The inclusive-exclusive document range spanned by a comment mark. */
export interface CommentRange {
  from: number;
  to: number;
}

/**
 * Scans the document for every text node carrying the `comment` mark with the
 * given id and returns the union range (min `from`, max `to`). A comment can
 * span several text nodes, so both ends are tracked across the whole document.
 * Returns `null` when no node carries the mark (e.g. it was already removed).
 */
export function findCommentRange(editor: Editor, id: string): CommentRange | null {
  let from: number | null = null;
  let to: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const hasMark = node.marks.some(
      (m) => m.type.name === COMMENT_MARK && m.attrs.id === id,
    );
    if (hasMark) {
      if (from === null) from = pos;
      to = pos + node.nodeSize;
    }
  });
  return from === null || to === null ? null : { from, to };
}

/**
 * Merges `attrs` into the `comment` mark(s) with the given id, preserving the
 * anchored range. Used to flip the `resolved` flag from the sidebar so the
 * highlight restyles without the caret needing to be inside the range.
 */
export function updateCommentMark(
  editor: Editor,
  id: string,
  attrs: Record<string, unknown>,
): boolean {
  const range = findCommentRange(editor, id);
  if (!range) return false;
  const { state, view } = editor;
  const markType = state.schema.marks[COMMENT_MARK];
  if (!markType) return false;

  const tr = state.tr;
  state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (!node.isText) return;
    const existing = node.marks.find(
      (m) => m.type === markType && m.attrs.id === id,
    );
    if (!existing) return;
    const start = Math.max(pos, range.from);
    const end = Math.min(pos + node.nodeSize, range.to);
    tr.removeMark(start, end, markType);
    tr.addMark(start, end, markType.create({ ...existing.attrs, ...attrs }));
  });
  if (tr.docChanged) view.dispatch(tr);
  return true;
}

/**
 * Removes the `comment` mark with the given id from the whole document,
 * clearing the highlight. Used when a thread is deleted from the sidebar.
 */
export function removeCommentMark(editor: Editor, id: string): boolean {
  const range = findCommentRange(editor, id);
  if (!range) return false;
  const { state, view } = editor;
  const markType = state.schema.marks[COMMENT_MARK];
  if (!markType) return false;
  const tr = state.tr.removeMark(range.from, range.to, markType);
  if (tr.docChanged) view.dispatch(tr);
  return true;
}

/**
 * Selects a comment's anchored range and scrolls its highlight into view.
 * Returns false when the mark can no longer be found in the document.
 */
export function focusComment(editor: Editor, id: string): boolean {
  const range = findCommentRange(editor, id);
  if (!range) return false;
  editor.chain().setTextSelection(range).run();
  const el = editor.view.dom.querySelector<HTMLElement>(
    `[data-comment-id="${id}"]`,
  );
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

/**
 * Collects one thread stub per unique `comment` mark id currently in the
 * document, reading author/text/timestamp/resolved from the mark attributes.
 * Used to hydrate the thread store when a document loads so highlights that
 * came in with the saved HTML always have an openable thread (replies, which
 * are not serialized into the mark, start empty).
 */
export function collectComments(editor: Editor): CommentData[] {
  const byId = new Map<string, CommentData>();
  editor.state.doc.descendants((node) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== COMMENT_MARK) continue;
      const a = mark.attrs as Record<string, any>;
      if (!a.id || byId.has(a.id)) continue;
      byId.set(a.id, {
        id: a.id,
        authorId: a.authorId ?? '',
        authorName: a.authorName ?? 'Anonymous',
        authorColor: a.authorColor ?? '#4F46E5',
        text: a.text ?? '',
        timestamp: typeof a.timestamp === 'number' ? a.timestamp : Date.now(),
        resolved: Boolean(a.resolved),
        replies: [],
      });
    }
  });
  return [...byId.values()];
}

/** Reads the comment id under the current selection, or null if none. */
export function activeCommentId(editor: Editor): string | null {
  if (!editor.isActive(COMMENT_MARK)) return null;
  const id = editor.getAttributes(COMMENT_MARK).id;
  return typeof id === 'string' && id ? id : null;
}

/**
 * @module TiptapEditorWrapper
 * @description Imperative wrapper around the Tiptap editor. Exposes a
 * `TiptapEditorHandle` ref for programmatic content reads/writes and
 * provides the `onHeadingsChange` callback for TOC updates.
 */
'use client';

/**
 * @module TiptapEditorWrapper
 * @description Provides `TiptapEditorWrapper`, a ref-forwarding React component that
 * embeds a fully-featured Tiptap rich-text editor with the full toolbar and bubble menus.
 * Handles HTML serialization, debounced change propagation, table-of-contents reporting,
 * and smooth scroll-to-heading.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { RichTextProvider } from 'react-reason-editor';
import { Comment } from '@/extensions/Comment';
import { Header } from '@/editor-views/components/Header';
import { RichTextToolbar } from '@/editor-views/components/Toolbar';
import { BubbleMenus } from '@/editor-views/components/BubbleMenus';
import { extensions as fullExtensions } from '@/editor-views/components/extensions';
import { Button } from '../shared-components/button';
import { CommentsSidebar } from '../comments/CommentsSidebar';
import { useCommentThreads } from '../comments/useCommentThreads';
import { activeCommentId, collectComments, focusComment, removeCommentMark, updateCommentMark } from '../comments/commentMarks';

import 'react-reason-editor/style.css';
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

import type { TocEntry } from '../type-definitions/toc';
import { useSyncStore } from './useSyncStore';

/** Debounce interval (ms) before flushing pending HTML to the parent `onChange` handler. */
const SAVE_DEBOUNCE_MS = 20_000;

/** Minimum interval (ms) between successive `onHeadingsChange` calls. */
const HEADINGS_THROTTLE_MS = 300;

/** Local commenting identity. Real apps would source this from auth/session. */
const CURRENT_AUTHOR = { id: 'local-user', name: 'You', color: '#4F46E5' } as const;

/** Imperative handle exposed via `ref` on {@link TiptapEditorWrapper}. */
export type TiptapEditorHandle = {
  /** Smoothly scrolls the editor viewport to the heading identified by `key`. */
  scrollToHeading: (key: string) => void;
  /** Returns the DOM element for the heading with the given key, or null. */
  getElementByKey: (key: string) => HTMLElement | null;
};

interface TiptapEditorWrapperProps {
  content: string;
  /** Change this when switching documents to force a reload */
  contentKey?: string;
  onChange: (content: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  scrollToHeading?: (headingText: string) => void;
  onHeadingsChange?: (headings: TocEntry[]) => void;
  readOnly?: boolean;
  aiSuggestion?: {
    originalText: string;
    suggestedText: string;
    range: { from: number; to: number };
    mode?: string;
  } | null;
  isAiLoading?: boolean;
  onAiRewrite?: (customPrompt?: string, modeId?: string) => void;
  onAiApprove?: () => void;
  onAiReject?: () => void;
  onAiRegenerate?: (mode: any) => void;
  onInviteClick?: () => void;
  onShareClick?: () => void;
  documentId?: string;
}

/**
 * Extracts heading entries from the editor's JSON document as TocEntry tuples.
 * Key format: `"${level}:${index}:${text}"` — level and index allow unambiguous DOM lookup.
 */
function extractTocHeadings(editor: ReturnType<typeof useEditor>): TocEntry[] {
  if (!editor) return [];
  const json = editor.getJSON();
  const entries: TocEntry[] = [];
  (json.content ?? []).forEach((node: any, i: number) => {
    if (node.type === 'heading' && node.attrs?.level) {
      const text = (node.content ?? []).map((c: any) => c.text ?? '').join('');
      entries.push([`${node.attrs.level}:${i}:${text}`, text, `h${node.attrs.level}`]);
    }
  });
  return entries;
}

/**
 * Public, ref-forwarding Tiptap editor component.
 *
 * Wraps a Tiptap editor instance with HTML content sync, debounced saves,
 * throttled heading extraction, and imperative scroll-to-heading support.
 *
 * @example
 * ```tsx
 * const editorRef = useRef<TiptapEditorHandle>(null);
 * <TiptapEditorWrapper
 *   ref={editorRef}
 *   content={doc.content}
 *   onChange={(html) => updateDoc(html)}
 *   title={doc.title}
 *   onTitleChange={(t) => updateTitle(t)}
 * />
 * ```
 */
export const TiptapEditorWrapper = forwardRef<TiptapEditorHandle, TiptapEditorWrapperProps>(
  ({ content, contentKey, onChange, onHeadingsChange, readOnly }, ref) => {
    const syncStore = useSyncStore();
    const [theme, setTheme] = useState('light');
    const stableKey = contentKey ?? content.slice(0, 40);

    // ── Comments ──────────────────────────────────────────────────────────
    const threads = useCommentThreads();
    const threadsRef = useRef(threads);
    threadsRef.current = threads;
    const [showComments, setShowComments] = useState(false);
    const [activeComment, setActiveComment] = useState<string | null>(null);
    const [selectionEmpty, setSelectionEmpty] = useState(true);

    // Configured once: callbacks read the store through a ref so the editor is
    // not recreated when threads change. Appended to the shared full extension
    // set (the `comment` plugin is off in the config-driven toolbar build).
    const editorExtensions = useMemo(
      () => [
        ...fullExtensions,
        Comment.configure({
          authorId: CURRENT_AUTHOR.id,
          authorName: CURRENT_AUTHOR.name,
          authorColor: CURRENT_AUTHOR.color,
          onCommentAdd: (data) => threadsRef.current.addThread(data),
          onCommentRemove: (id) => threadsRef.current.removeThread(id),
          onCommentResolve: (id, resolved) => threadsRef.current.setResolved(id, resolved),
        }),
      ],
      [],
    );

    const onChangeRef = useRef(onChange);
    const onHeadingsChangeRef = useRef(onHeadingsChange);
    const dirtyRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const headingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHeadingsFiredRef = useRef(0);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onHeadingsChangeRef.current = onHeadingsChange; }, [onHeadingsChange]);

    const reportHeadings = useCallback((e: ReturnType<typeof useEditor>) => {
      if (!onHeadingsChangeRef.current) return;
      const headings = extractTocHeadings(e);
      const now = Date.now();
      const elapsed = now - lastHeadingsFiredRef.current;
      if (elapsed >= HEADINGS_THROTTLE_MS) {
        lastHeadingsFiredRef.current = now;
        onHeadingsChangeRef.current(headings);
      } else {
        if (headingsTimerRef.current) clearTimeout(headingsTimerRef.current);
        headingsTimerRef.current = setTimeout(() => {
          lastHeadingsFiredRef.current = Date.now();
          onHeadingsChangeRef.current?.(extractTocHeadings(e));
        }, HEADINGS_THROTTLE_MS - elapsed);
      }
    }, []);

    const editor = useEditor({
      extensions: editorExtensions,
      content,
      editable: !readOnly,
      onUpdate: ({ editor: e }) => {
        dirtyRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (!dirtyRef.current) return;
          dirtyRef.current = false;
          syncStore.markContentSaved();
          onChangeRef.current(e.getHTML());
        }, SAVE_DEBOUNCE_MS);
        reportHeadings(e);
      },
      onSelectionUpdate: ({ editor: e }) => {
        setSelectionEmpty(e.state.selection.empty);
        const id = activeCommentId(e);
        if (id) {
          setActiveComment(id);
          setShowComments(true);
        }
      },
    });

    // Reload content when the document key changes (document switch)
    useEffect(() => {
      if (!editor) return;
      if (!syncStore.shouldLoadContent(stableKey)) return;
      editor.commands.setContent(content || '');
      syncStore.markContentLoaded(stableKey);
      reportHeadings(editor);
      // Re-scope comment threads to the freshly loaded document's marks.
      threadsRef.current.hydrate(collectComments(editor));
      setActiveComment(null);
    }, [editor, stableKey, syncStore, reportHeadings]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!readOnly);
    }, [editor, readOnly]);

    // Flush any pending save on unmount
    useEffect(() => {
      const editorRef = editor;
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (headingsTimerRef.current) clearTimeout(headingsTimerRef.current);
        if (editorRef && dirtyRef.current) {
          dirtyRef.current = false;
          syncStore.markContentSaved();
          onChangeRef.current(editorRef.getHTML());
        }
      };
    }, [editor, syncStore]);

    const findHeadingEl = useCallback((key: string): HTMLElement | null => {
      if (!editor) return null;
      // key format: "{level}:{index}:{text}"
      const first = key.indexOf(':');
      const second = key.indexOf(':', first + 1);
      const level = key.slice(0, first);
      const text = key.slice(second + 1);
      for (const h of editor.view.dom.querySelectorAll<HTMLElement>(`h${level}`)) {
        if (h.textContent?.trim() === text) return h;
      }
      return null;
    }, [editor]);

    useImperativeHandle(ref, () => ({
      scrollToHeading: (key: string) => findHeadingEl(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      getElementByKey: (key: string): HTMLElement | null => findHeadingEl(key),
    }), [findHeadingEl]);

    // ── Comment actions ─────────────────────────────────────────────────────
    /** Wrap the current selection in a new comment mark and open its composer. */
    const handleAddComment = useCallback(() => {
      if (!editor) return;
      const id = `comment-${Date.now()}`;
      const created = editor.chain().focus().setComment({ id }).run();
      if (created) {
        setActiveComment(id);
        setShowComments(true);
      }
    }, [editor]);

    const handleSelectComment = useCallback((id: string) => {
      setActiveComment(id);
      if (editor) focusComment(editor, id);
    }, [editor]);

    const handleResolveComment = useCallback((id: string, resolved: boolean) => {
      threads.setResolved(id, resolved);
      if (editor) updateCommentMark(editor, id, { resolved });
    }, [editor, threads]);

    const handleRemoveComment = useCallback((id: string) => {
      threads.removeThread(id);
      if (editor) removeCommentMark(editor, id);
      setActiveComment((cur) => (cur === id ? null : cur));
    }, [editor, threads]);

    const handleReplyComment = useCallback((id: string, text: string) => {
      threads.addReply(id, {
        id: `reply-${Date.now()}`,
        authorId: CURRENT_AUTHOR.id,
        authorName: CURRENT_AUTHOR.name,
        authorColor: CURRENT_AUTHOR.color,
        text,
        timestamp: Date.now(),
      });
    }, [threads]);

    const openCount = threads.threads.filter((t) => !t.resolved).length;

    return (
      <div className="flex h-full w-full flex-col bg-editor-bg">
        <Header editor={editor} theme={theme} setTheme={setTheme} />
        <RichTextProvider editor={editor} dark={theme === 'dark'}>
          <div className="flex-1 flex flex-col overflow-hidden">
            {!readOnly && <RichTextToolbar theme={theme} setTheme={setTheme} />}
            {!readOnly && (
              <div className="flex items-center gap-1 border-b border-border px-4 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={handleAddComment}
                  disabled={selectionEmpty}
                  title={selectionEmpty ? 'Select text to comment on' : 'Comment on selection'}
                >
                  <MessageSquarePlus className="h-4 w-4" /> Comment
                </Button>
                <Button
                  variant={showComments ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setShowComments((v) => !v)}
                  title="Toggle comments panel"
                >
                  <MessageSquare className="h-4 w-4" /> Comments
                  {openCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {openCount}
                    </span>
                  )}
                </Button>
              </div>
            )}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto prose dark:prose-invert max-w-none px-4 py-3">
                <EditorContent editor={editor} />
              </div>
              {!readOnly && showComments && (
                <div className="w-80 shrink-0">
                  <CommentsSidebar
                    threads={threads.threads}
                    activeId={activeComment}
                    onSelect={handleSelectComment}
                    onSubmitBody={threads.setThreadText}
                    onReply={handleReplyComment}
                    onResolve={handleResolveComment}
                    onRemove={handleRemoveComment}
                    onClose={() => setShowComments(false)}
                  />
                </div>
              )}
            </div>
            {!readOnly && <BubbleMenus />}
          </div>
        </RichTextProvider>
      </div>
    );
  }
);

TiptapEditorWrapper.displayName = 'TiptapEditorWrapper';

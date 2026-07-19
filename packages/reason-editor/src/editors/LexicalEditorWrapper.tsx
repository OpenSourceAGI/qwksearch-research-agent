'use client';

/**
 * @module LexicalEditorWrapper
 * @description Provides `LexicalEditorWrapper`, a ref-forwarding React component that
 * embeds a fully-featured Lexical rich-text editor. Handles HTML serialization,
 * debounced change propagation, table-of-contents reporting, and smooth scroll-to-heading.
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { TableOfContentsEntry } from '@lexical/react/LexicalTableOfContentsPlugin';
import { TableOfContentsPlugin as LexicalTableOfContentsPlugin } from '@lexical/react/LexicalTableOfContentsPlugin';
import {
  $createParagraphNode,
  $getRoot,
  defineExtension,
  NodeKey,
} from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

import {
  buildHTMLConfig,
  EditorContent,
  FlashMessageContext,
  SettingsContext,
  useSettings,
  SharedHistoryContext,
  ToolbarContext,
  PlaygroundNodes,
  PlaygroundEditorTheme,
  TableContext,
  EditorCallbacksProvider,
} from '../lexical';
import { AutoHighlightProvider } from '../lexical/plugins/FloatingTextFormatToolbarPlugin';
import { useSyncStore } from './useSyncStore';

interface LexicalEditorWrapperProps {
  content: string;
  contentKey?: string;  // Change this when switching documents to force a reload
  onChange: (content: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  scrollToHeading?: (headingText: string) => void;
  onHeadingsChange?: (headings: TableOfContentsEntry[]) => void;
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
 * Internal Lexical plugin that loads HTML content into the editor on mount or when
 * `contentKey` changes. Uses an external sync store to avoid triggering effects
 * on every content change during typing.
 *
 * @param props.content - Raw HTML string to display.
 * @param props.contentKey - Resets whenever the document switches; triggers a fresh load.
 * @param props.syncStore - External store managing sync state without causing re-renders.
 */
function LoadAndSyncContentPlugin({
  content,
  contentKey,
  syncStore,
}: {
  content: string;
  contentKey: string;
  syncStore: ReturnType<typeof useSyncStore>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[LoadAndSyncContentPlugin] Effect triggered for contentKey:', contentKey);

    // Check if we should load content (external store manages state)
    if (!syncStore.shouldLoadContent(contentKey)) {
      return;
    }

    console.log('[LoadAndSyncContentPlugin] 🔄 Loading new content for key:', contentKey);

    editor.update(() => {
      const root = $getRoot();
      root.clear();

      if (content && content.trim()) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(content, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
      } else {
        root.append($createParagraphNode());
      }
    });

    // Mark content as loaded
    syncStore.markContentLoaded(contentKey);
  }, [editor, contentKey, syncStore]); // Removed 'content' from dependencies

  return null;
}

/** Debounce interval (ms) before flushing pending HTML to the parent `onChange` handler. */
const SAVE_DEBOUNCE_MS = 20_000;

/**
 * Internal Lexical plugin that serializes the editor state to HTML and calls
 * `onChange` after a debounce interval. Uses external sync store to mark content
 * as saved, preventing {@link LoadAndSyncContentPlugin} from reloading it.
 *
 * @param props.onChange - Callback receiving the serialized HTML string.
 * @param props.syncStore - External store to mark content as saved.
 */
function OnChangeToHTMLPlugin({
  onChange,
  syncStore,
}: {
  onChange: (html: string) => void;
  syncStore: ReturnType<typeof useSyncStore>;
}) {
  const [editor] = useLexicalComposerContext();
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const flush = () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    editor.getEditorState().read(() => {
      syncStore.markContentSaved(); // Mark as saved to suppress next load
      onChangeRef.current($generateHtmlFromNodes(editor));
    });
  };

  // Flush any pending save on unmount so no data is lost
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, []);

  const handleChange = () => {
    dirtyRef.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />;
}

/** Minimum interval (ms) between successive `onHeadingsChange` calls. */
const HEADINGS_THROTTLE_MS = 300;

/**
 * Throttles calls to `onHeadingsChange` so that table-of-contents updates
 * occur at most every {@link HEADINGS_THROTTLE_MS} milliseconds.
 *
 * @param props.headings - Latest heading entries from the Lexical TOC plugin.
 * @param props.onHeadingsChange - Callback invoked with the throttled heading list.
 */
function HeadingsReporter({
  headings,
  onHeadingsChange,
}: {
  headings: TableOfContentsEntry[];
  onHeadingsChange: (h: TableOfContentsEntry[]) => void;
}) {
  const lastFiredRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(headings);
  latestRef.current = headings;

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastFiredRef.current;

    if (elapsed >= HEADINGS_THROTTLE_MS) {
      lastFiredRef.current = now;
      onHeadingsChange(headings);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lastFiredRef.current = Date.now();
        onHeadingsChange(latestRef.current);
      }, HEADINGS_THROTTLE_MS - elapsed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [headings, onHeadingsChange]);

  return null;
}

/**
 * Internal plugin that wires up the Lexical table-of-contents plugin and
 * populates `scrollFnRef` with a function that smoothly scrolls to any heading
 * node by its `NodeKey`.
 *
 * @param props.onHeadingsChange - Optional callback to receive throttled heading updates.
 * @param props.scrollFnRef - Ref populated with the scroll-to-heading implementation.
 */
function HeadingsAndScrollPlugin({
  onHeadingsChange,
  scrollFnRef,
  getElementByKeyRef,
}: {
  onHeadingsChange?: (headings: TableOfContentsEntry[]) => void;
  scrollFnRef: React.MutableRefObject<((key: NodeKey) => void) | null>;
  getElementByKeyRef: React.MutableRefObject<((key: NodeKey) => HTMLElement | null) | null>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    scrollFnRef.current = (key: NodeKey) => {
      editor.getEditorState().read(() => {
        const el = editor.getElementByKey(key);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    getElementByKeyRef.current = (key: NodeKey) => editor.getElementByKey(key);
    return () => {
      scrollFnRef.current = null;
      getElementByKeyRef.current = null;
    };
  }, [editor, scrollFnRef, getElementByKeyRef]);

  if (!onHeadingsChange) return null;

  return (
    <LexicalTableOfContentsPlugin>
      {(tableOfContents) => (
        <HeadingsReporter headings={tableOfContents} onHeadingsChange={onHeadingsChange} />
      )}
    </LexicalTableOfContentsPlugin>
  );
}

/**
 * Inner composition layer that configures the Lexical extension, mounts context
 * providers, and renders the core content-editable along with all internal plugins.
 *
 * @param props.content - HTML string representing the current document body.
 * @param props.contentKey - Stable key that changes on document switch.
 * @param props.onChange - Called with serialized HTML whenever the document is dirty.
 * @param props.onHeadingsChange - Optional callback for TOC updates.
 * @param props.scrollFnRef - Mutable ref wired to the scroll-to-heading function.
 * @param props.syncStore - External store managing content sync state.
 */
function LexicalEditorInner({
  content,
  contentKey,
  onChange,
  onHeadingsChange,
  scrollFnRef,
  getElementByKeyRef,
  syncStore,
  onInviteClick,
  onShareClick,
  documentTitle,
  documentId,
}: {
  content: string;
  contentKey: string;
  onChange: (content: string) => void;
  onHeadingsChange?: (headings: TableOfContentsEntry[]) => void;
  scrollFnRef: React.MutableRefObject<((key: NodeKey) => void) | null>;
  getElementByKeyRef: React.MutableRefObject<((key: NodeKey) => HTMLElement | null) | null>;
  syncStore: ReturnType<typeof useSyncStore>;
  onInviteClick?: () => void;
  onShareClick?: () => void;
  documentTitle?: string;
  documentId?: string;
}) {
  const {
    settings: { isCollab },
  } = useSettings();

  const app = useMemo(
    () =>
      defineExtension({
        $initialEditorState: isCollab ? null : undefined,
        html: buildHTMLConfig(),
        name: '@lexical/playground',
        namespace: 'Playground',
        nodes: PlaygroundNodes,
        theme: PlaygroundEditorTheme,
      }),
    [isCollab],
  );

  return (
    <LexicalCollaboration>
      <LexicalExtensionComposer extension={app} contentEditable={null}>
        <SharedHistoryContext>
          <AutoHighlightProvider>
            <TableContext>
              <ToolbarContext>
                <EditorCallbacksProvider
                  onInviteClick={onInviteClick}
                  onShareClick={onShareClick}
                  documentTitle={documentTitle}
                  documentId={documentId}
                >
                  <EditorContent />
                  <LoadAndSyncContentPlugin content={content} contentKey={contentKey} syncStore={syncStore} />
                  <OnChangeToHTMLPlugin onChange={onChange} syncStore={syncStore} />
                  <HeadingsAndScrollPlugin onHeadingsChange={onHeadingsChange} scrollFnRef={scrollFnRef} getElementByKeyRef={getElementByKeyRef} />
                </EditorCallbacksProvider>
              </ToolbarContext>
            </TableContext>
          </AutoHighlightProvider>
        </SharedHistoryContext>
      </LexicalExtensionComposer>
    </LexicalCollaboration>
  );
}

/**
 * Imperative handle exposed via `ref` on {@link LexicalEditorWrapper}.
 */
export type LexicalEditorHandle = {
  /** Smoothly scrolls the editor viewport to the heading identified by `key`. */
  scrollToHeading: (key: NodeKey) => void;
  /** Returns the DOM element for the Lexical node with the given key, or null. */
  getElementByKey: (key: NodeKey) => HTMLElement | null;
};

/**
 * Public, ref-forwarding Lexical editor component.
 *
 * Wraps the full Lexical editor stack including settings, flash-message context,
 * and all internal plugins. Exposes `scrollToHeading` via an imperative handle.
 *
 * @example
 * ```tsx
 * const editorRef = useRef<LexicalEditorHandle>(null);
 * <LexicalEditorWrapper
 *   ref={editorRef}
 *   content={doc.content}
 *   onChange={(html) => updateDoc(html)}
 *   title={doc.title}
 *   onTitleChange={(t) => updateTitle(t)}
 * />
 * ```
 */
export const LexicalEditorWrapper = forwardRef<LexicalEditorHandle, LexicalEditorWrapperProps>(
  ({ content, contentKey, onChange, onHeadingsChange, onInviteClick, onShareClick, title, documentId }, ref) => {
    const scrollFnRef = useRef<((key: NodeKey) => void) | null>(null);
    const getElementByKeyRef = useRef<((key: NodeKey) => HTMLElement | null) | null>(null);
    const syncStore = useSyncStore();

    // Stable key: falls back to content hash if caller doesn't provide one.
    // Using content.slice(0,40) is a reasonable fallback that stays stable while editing.
    const stableKey = contentKey ?? content.slice(0, 40);

    useImperativeHandle(ref, () => ({
      scrollToHeading: (key: NodeKey) => scrollFnRef.current?.(key),
      getElementByKey: (key: NodeKey) => getElementByKeyRef.current?.(key) ?? null,
    }));

    return (
      <div className="flex h-full w-full flex-col bg-editor-bg">
        <div className="flex-1 min-h-0">
          <SettingsContext>
            <FlashMessageContext>
              <LexicalEditorInner
                content={content}
                contentKey={stableKey}
                onChange={onChange}
                onHeadingsChange={onHeadingsChange}
                scrollFnRef={scrollFnRef}
                getElementByKeyRef={getElementByKeyRef}
                syncStore={syncStore}
                onInviteClick={onInviteClick}
                onShareClick={onShareClick}
                documentTitle={title}
                documentId={documentId}
              />
            </FlashMessageContext>
          </SettingsContext>
        </div>
      </div>
    );
  }
);

'use client';

/**
 * @module PlateEditorWrapper
 * @description The default `ReasonDocs` editor: a Plate editor behind the
 * engine-neutral contract in `./editor-contract.ts`.
 *
 * Everything below the toolbar is the Plate stack assembled in
 * `@/docs-agent/plate/plate-editor-config` — the same plugin set, node
 * components and floating controls the `/workspace/demo/*` surfaces run — and
 * the toolbar is the playground's full button set wearing `REASON_TOOLBAR_SKIN`,
 * so the default editor exposes every registered plugin rather than a subset.
 *
 * The document store speaks HTML, so this wrapper owns the two conversions:
 * `htmlToPlateValue` on load and `plateValueToHtml` on save. Serialization is
 * asynchronous (Plate renders the document through its static components), so
 * saves resolve a tick after the debounce fires — `onChange` is still called
 * exactly once per debounce window.
 *
 * Load/save arbitration is the same `useSyncStore` handshake the Tiptap wrapper
 * uses: a save marks the next incoming `content` as our own echo, and a
 * document switch is detected by `contentKey` rather than by content identity.
 *
 * Above the toolbar sits a Google Docs-style menu bar (`MenuBar`), whose
 * Tools → Spelling and grammar entries drive Harper through `HarperPlugin`.
 *
 * Not yet ported from `./TiptapEditorWrapper.tsx`: inline comments. The comment
 * mark, its threads store and `CommentsSidebar` are built on Tiptap marks
 * (`@/comments/commentMarks`), and Plate's comment plugin is not among this
 * package's dependencies. Documents needing comments can still mount the Tiptap
 * engine — see `EditorArea`'s `engine` prop.
 */

import {
  type ComponentProps,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { KEYS, NodeApi, type Value } from 'platejs';
import { Plate, usePlateEditor, usePluginOption } from 'platejs/react';

import { htmlToPlateValue } from '@/docs-agent/plate/html-to-plate';
import { HarperPlugin } from '@/docs-agent/plate/kits/harper-kit';
import { plateValueToHtml } from '@/docs-agent/plate/plate-to-html';
import { platePlugins } from '@/docs-agent/plate/plate-editor-config';
import { Editor, EditorContainer } from '@/docs-agent/plate/ui/editor';
import { FixedToolbar } from '@/docs-agent/plate/ui/fixed-toolbar';
import { FixedToolbarButtons } from '@/docs-agent/plate/ui/fixed-toolbar-buttons';
import { FloatingToolbar } from '@/docs-agent/plate/ui/floating-toolbar';
import { FloatingToolbarButtons } from '@/docs-agent/plate/ui/floating-toolbar-buttons';
import { MenuBar } from '@/docs-agent/plate/ui/menu-bar';
import { REASON_TOOLBAR_SKIN } from '@/docs-agent/plate/ui/reason-toolbar-skin';

import 'react-reason-editor/style.css';
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

import type { TocEntry } from 'react-reason-editor-sidebar';
import {
  parseTocHeadingKey,
  tocHeadingKey,
  type ReasonEditorHandle,
  type ReasonEditorProps,
} from './editor-contract';
import { useSyncStore } from './useSyncStore';

/** Debounce interval (ms) before flushing pending HTML to the parent `onChange` handler. */
const SAVE_DEBOUNCE_MS = 20_000;

/** Minimum interval (ms) between successive `onHeadingsChange` calls. */
const HEADINGS_THROTTLE_MS = 300;

/** Plate's heading node keys, in the order that gives their `<h*>` level. */
const HEADING_LEVELS: Record<string, number> = {
  [KEYS.h1]: 1,
  [KEYS.h2]: 2,
  [KEYS.h3]: 3,
  [KEYS.h4]: 4,
  [KEYS.h5]: 5,
  [KEYS.h6]: 6,
};

export type PlateEditorHandle = ReasonEditorHandle;

/**
 * The editable surface, with the browser's own spell checker switched off
 * while Harper is proofreading so the two sets of underlines never stack.
 */
function ProofedEditor(props: ComponentProps<typeof Editor>) {
  const harperEnabled = usePluginOption(HarperPlugin, 'enabled');
  return <Editor {...props} spellCheck={!harperEnabled} />;
}

/**
 * Extracts heading entries from a Plate value as TocEntry tuples, in the key
 * format `RightPanel` hands straight back to `scrollToHeading`.
 */
export function extractTocHeadings(value: Value | undefined | null): TocEntry[] {
  if (!value?.length) return [];

  const entries: TocEntry[] = [];

  value.forEach((node: any, i: number) => {
    const level = HEADING_LEVELS[node?.type as string];
    if (!level) return;

    const text = NodeApi.string(node);
    entries.push([tocHeadingKey(level, i, text), text, `h${level}`]);
  });

  return entries;
}

/**
 * Public, ref-forwarding Plate editor component.
 *
 * @example
 * ```tsx
 * const editorRef = useRef<PlateEditorHandle>(null);
 * <PlateEditorWrapper
 *   ref={editorRef}
 *   content={doc.content}
 *   onChange={(html) => updateDoc(html)}
 *   title={doc.title}
 *   onTitleChange={(t) => updateTitle(t)}
 * />
 * ```
 */
export const PlateEditorWrapper = forwardRef<PlateEditorHandle, ReasonEditorProps>(
  ({ content, contentKey, onChange, onHeadingsChange, readOnly, title }, ref) => {
    const [showToolbar, setShowToolbar] = useState(true);
    const syncStore = useSyncStore();
    const stableKey = contentKey ?? content.slice(0, 40);

    // Only ever read at editor construction; later document switches go through
    // the load effect below so the toolbar and floating controls stay mounted.
    const initialContentRef = useRef(content);

    const initialValue = useMemo(() => htmlToPlateValue(initialContentRef.current), []);

    const editor = usePlateEditor({ plugins: platePlugins, value: initialValue });

    const onChangeRef = useRef(onChange);
    const onHeadingsChangeRef = useRef(onHeadingsChange);
    const dirtyRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const headingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHeadingsFiredRef = useRef(0);
    /** Latest value seen, so a flush can serialize without reading the editor. */
    const valueRef = useRef<Value>(editor.children as Value);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onHeadingsChangeRef.current = onHeadingsChange; }, [onHeadingsChange]);

    const reportHeadings = useCallback((value: Value) => {
      if (!onHeadingsChangeRef.current) return;

      const now = Date.now();
      const elapsed = now - lastHeadingsFiredRef.current;

      if (elapsed >= HEADINGS_THROTTLE_MS) {
        lastHeadingsFiredRef.current = now;
        onHeadingsChangeRef.current(extractTocHeadings(value));
      } else {
        if (headingsTimerRef.current) clearTimeout(headingsTimerRef.current);
        headingsTimerRef.current = setTimeout(() => {
          lastHeadingsFiredRef.current = Date.now();
          onHeadingsChangeRef.current?.(extractTocHeadings(valueRef.current));
        }, HEADINGS_THROTTLE_MS - elapsed);
      }
    }, []);

    /** Serialize and hand the document to the parent. Resolves after the write. */
    const flush = useCallback(async (value: Value) => {
      const html = await plateValueToHtml(value);
      // Marked immediately before the write, so the `content` prop coming back
      // is the only load this suppresses.
      syncStore.markContentSaved();
      onChangeRef.current(html);
    }, [syncStore]);

    const handleValueChange = useCallback(({ value }: { value: Value }) => {
      valueRef.current = value;
      dirtyRef.current = true;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!dirtyRef.current) return;
        dirtyRef.current = false;
        void flush(valueRef.current);
      }, SAVE_DEBOUNCE_MS);

      reportHeadings(value);
    }, [flush, reportHeadings]);

    /** False until the mount pass below has claimed the constructor's content. */
    const loadedInitialRef = useRef(false);

    // Reload content when the document key changes (document switch). The first
    // pass has nothing to apply — the editor was constructed from this very
    // content — and only reports its headings.
    useEffect(() => {
      if (!syncStore.shouldLoadContent(stableKey)) return;

      if (loadedInitialRef.current) {
        const value = htmlToPlateValue(content);
        editor.tf.setValue(value);
        valueRef.current = value;
        dirtyRef.current = false;
      } else {
        loadedInitialRef.current = true;
      }

      syncStore.markContentLoaded(stableKey);
      reportHeadings(valueRef.current);
    }, [content, editor, stableKey, syncStore, reportHeadings]);

    // Flush any pending save on unmount. Serialization is async, so the write
    // lands after this component is gone — `onChange` belongs to the parent and
    // outlives it.
    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (headingsTimerRef.current) clearTimeout(headingsTimerRef.current);
        if (dirtyRef.current) {
          dirtyRef.current = false;
          void flush(valueRef.current);
        }
      };
    }, [flush]);

    // The editable element, for heading lookups.
    const surfaceRef = useRef<HTMLDivElement | null>(null);

    const findHeadingEl = useCallback((key: string): HTMLElement | null => {
      const root = surfaceRef.current;
      if (!root) return null;

      const { level, text } = parseTocHeadingKey(key);
      for (const h of root.querySelectorAll<HTMLElement>(`h${level}`)) {
        if (h.textContent?.trim() === text) return h;
      }

      return null;
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToHeading: (key: string) =>
        findHeadingEl(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      getElementByKey: (key: string): HTMLElement | null => findHeadingEl(key),
    }), [findHeadingEl]);

    return (
      <div className="flex h-full w-full flex-col bg-editor-bg">
        <Plate editor={editor} onValueChange={handleValueChange} readOnly={readOnly}>
          <div className="flex flex-1 flex-col overflow-hidden">
            {!readOnly && (
              <MenuBar
                documentTitle={title}
                onShowToolbarChange={setShowToolbar}
                showToolbar={showToolbar}
              />
            )}
            {!readOnly && showToolbar && (
              <FixedToolbar className={REASON_TOOLBAR_SKIN}>
                <FixedToolbarButtons />
              </FixedToolbar>
            )}
            {/* Positioned so the floating toolbar can anchor to the editable. */}
            <EditorContainer className="relative min-h-0 flex-1">
              <ProofedEditor placeholder="Start writing…" ref={surfaceRef} variant="default" />
              {!readOnly && (
                <FloatingToolbar>
                  <FloatingToolbarButtons />
                </FloatingToolbar>
              )}
            </EditorContainer>
          </div>
        </Plate>
      </div>
    );
  }
);

PlateEditorWrapper.displayName = 'PlateEditorWrapper';

/**
 * `NovelEditor` — the base editor surface for this package, built on Novel.
 *
 * Novel supplies the shell: `EditorRoot` (its jotai store + tunnel used by the
 * slash-menu primitives) wrapping `EditorContent`, which is a thin pass-through
 * to `@tiptap/react`'s `EditorProvider`. This module supplies everything the
 * reason-editor UI expects around it — the `.reactjs-tiptap-editor` scope the
 * stylesheet is written against, the tooltip and event-bus providers, the
 * theme/editability reactives, and the slash-command upload dialogs.
 *
 * The extension array is passed straight through, so the entire existing
 * plugin set (`buildExtensions()` over `src/extensions/*`) keeps working
 * unchanged. The schema is still wholly this package's; only the mounting
 * shell is Novel's.
 *
 * ## Composition
 *
 * `children` is a render prop receiving `{ editor, EditorSurface }`. Hosts
 * place `<EditorSurface />` — the editable area — anywhere in their own
 * layout, which is what keeps the existing toolbar/sidebar/bubble-menu
 * arrangement byte-for-byte intact rather than forcing it into Novel's
 * `slotBefore` / `slotAfter` ordering.
 *
 * `editor` is `null` for the first render, until the shell has constructed it.
 * Guard chrome that dereferences it (`{editor && <RichTextToolbar … />}`); the
 * previous `RichTextProvider` did the same by rendering nothing until its
 * `editor` prop arrived. `EditorSurface` must always be rendered — it is what
 * creates the editor.
 *
 * ## Rebuilding on extension changes
 *
 * `EditorProvider` calls `useEditor()` with no dependency array, so it never
 * recreates the editor when `extensions` changes identity. Pass `rebuildKey`
 * (e.g. `extensionsSignature(config)`) to remount the surface when the enabled
 * plugin set actually changes — this reproduces the `useEditor(opts, [deps])`
 * rebuild that the config-driven editor relies on.
 */

'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { EditorContext, useCurrentEditor } from '@tiptap/react';

import type { Editor, EditorEvents } from '@tiptap/core';
import type { EditorProviderProps } from '@tiptap/react';
import type { ReactNode } from 'react';

import { TooltipProvider } from '@/components';
import { ReactBusProvider } from '@/components/ReactBus';
import SlashDialogTrigger from '@/components/SlashDialogTrigger/SlashDialogTrigger';
import { RESET_CSS } from '@/constants/resetCSS';
import { EditorEditableReactive } from '@/store/EditorEditableReactive';
import { ThemeColorReactive } from '@/store/ThemeColorReactive';
import { removeCSS, updateCSS } from '@/utils/dynamicCSS';

import { EditorRoot, NovelEditorContent, handleCommandNavigation } from './index';

import '../styles/index.scss';

/** Props accepted by the `EditorSurface` component handed to `children`. */
export interface EditorSurfaceProps {
  /** Applied to the ProseMirror container that wraps the editable area. */
  className?: string;
}

/** The render-prop argument supplied to {@link NovelEditor}'s `children`. */
export interface NovelEditorApi {
  /** The live editor, or `null` on the first render before the shell builds it. */
  editor: Editor | null;
  /** The editable area. Render exactly once, anywhere in the host's layout. */
  EditorSurface: (props: EditorSurfaceProps) => ReactNode;
}

export interface NovelEditorProps {
  /**
   * The full Tiptap extension array to mount — normally `buildExtensions(config)`
   * from `@/editor-views/config/editorConfig`, or the static `extensions`
   * barrel. Novel's own bundled extensions are deliberately not merged in;
   * this array is the whole schema.
   */
  extensions: any[];
  /** Initial document — an HTML string or Tiptap JSON, as `useEditor`'s `content`. */
  initialContent?: EditorProviderProps['content'];
  /**
   * Remount token. Change it (e.g. to `extensionsSignature(config)`) whenever
   * the extension set changes, so the editor is rebuilt against the new schema.
   */
  rebuildKey?: string;
  editable?: boolean;
  /** Extra `EditorView` props, merged over Novel's command-navigation keydown handler. */
  editorProps?: EditorProviderProps['editorProps'];
  /** Applied to the outer wrapper that scopes the editor's stylesheet. */
  className?: string;
  onCreate?: (props: EditorEvents['create']) => void;
  onUpdate?: (props: EditorEvents['update']) => void;
  onSelectionUpdate?: (props: EditorEvents['selectionUpdate']) => void;
  /** Passed through to `useEditor`; set `false` when rendering under SSR. */
  immediatelyRender?: boolean;
  /** Passed through to `useEditor`. `'auto'` enables per-block direction detection. */
  textDirection?: EditorProviderProps['textDirection'];
  /**
   * Called with the live editor (and `null` on teardown) for hosts that need
   * it outside the render prop — imperative handles, content reloads, comment
   * marks. Fires from an effect, so it is safe to feed straight into `useState`.
   */
  onEditor?: (editor: Editor | null) => void;
  children: (api: NovelEditorApi) => ReactNode;
}

/**
 * Publishes the current editor up to {@link NovelEditor} and stamps it with a
 * stable React id, as `RichTextProvider` does on the non-Novel mount path.
 * Rendered inside `EditorContext`, so it re-reports across surface remounts.
 */
function NovelEditorBridge({ onEditor }: { onEditor: (editor: Editor | null) => void }) {
  const { editor } = useCurrentEditor();
  const id = useId();

  useEffect(() => {
    // @ts-expect-error — `id` is not part of the editor's public type, but
    // portalled UI (bubble menus, upload dialogs) keys off it.
    if (editor) editor.id = id;
  }, [id, editor]);

  useEffect(() => {
    onEditor((editor as Editor | null) ?? null);
    return () => onEditor(null);
  }, [editor, onEditor]);

  return <EditorEditableReactive editor={editor} />;
}

/**
 * The editor-independent half of the old `RichTextProvider`: the styling
 * scope, the reset stylesheet, the event bus, and the theme reactive. These
 * sit outside Novel's `EditorContent` because `EditorProvider` renders `null`
 * until the editor exists — anything that must wrap the editor cannot depend
 * on it.
 */
function NovelEditorChrome({ className, children }: { className?: string; children: ReactNode }) {
  useEffect(() => {
    updateCSS(RESET_CSS, 'react-tiptap-reset');

    return () => {
      removeCSS('react-tiptap-reset');
    };
  }, []);

  return (
    <div className={className ? `reactjs-tiptap-editor ${className}` : 'reactjs-tiptap-editor'}>
      <ReactBusProvider>
        {children}
        <ThemeColorReactive />
      </ReactBusProvider>
    </div>
  );
}

export function NovelEditor({
  extensions,
  initialContent,
  rebuildKey,
  editable = true,
  editorProps,
  className,
  onCreate,
  onUpdate,
  onSelectionUpdate,
  immediatelyRender,
  textDirection,
  onEditor: onEditorProp,
  children,
}: NovelEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  const onEditorPropRef = useRef(onEditorProp);
  onEditorPropRef.current = onEditorProp;

  const onEditor = useCallback((next: Editor | null) => {
    setEditor(next);
    onEditorPropRef.current?.(next);
  }, []);

  // The surface component identity must be stable: React treats a new function
  // as a different component type and would tear down and rebuild the editor on
  // every parent render. So it is created once and reads the latest props from
  // a ref, rather than closing over them.
  const surfaceProps = {
    extensions,
    initialContent,
    rebuildKey,
    editable,
    editorProps,
    immediatelyRender,
    textDirection,
    onCreate,
    onUpdate,
    onSelectionUpdate,
    onEditor,
  };
  const surfacePropsRef = useRef(surfaceProps);
  surfacePropsRef.current = surfaceProps;

  const EditorSurface = useMemo(
    () =>
      function EditorSurface({ className: contentClassName }: EditorSurfaceProps) {
        const current = surfacePropsRef.current;
        const { handleDOMEvents, ...restEditorProps } = current.editorProps ?? {};

        return (
          <NovelEditorContent
            key={current.rebuildKey}
            initialContent={current.initialContent as any}
            extensions={current.extensions}
            editable={current.editable}
            immediatelyRender={current.immediatelyRender}
            textDirection={current.textDirection}
            // `reason-editor-surface` is the stylesheet's hook for stretching
            // the contenteditable to fill this container (see
            // `styles/editor.scss`); it is always present so the rule does not
            // depend on what the host passes in `className`.
            editorContainerProps={{
              className: contentClassName
                ? `reason-editor-surface ${contentClassName}`
                : 'reason-editor-surface',
            }}
            editorProps={{
              ...restEditorProps,
              handleDOMEvents: {
                // Novel's slash menu claims Arrow/Enter while it is open. This
                // no-ops when that menu is not mounted, so this package's own
                // SlashCommand extension is unaffected.
                keydown: (_view, event) => handleCommandNavigation(event) ?? false,
                ...handleDOMEvents,
              },
            }}
            onCreate={current.onCreate}
            onUpdate={current.onUpdate}
            onSelectionUpdate={current.onSelectionUpdate}
            slotAfter={<NovelEditorBridge onEditor={current.onEditor} />}
          />
        );
      },
    [],
  );

  // Mirrors the editor into context for the chrome rendered *outside* Novel's
  // own `EditorProvider` (toolbar, bubble menus, sidebars), so those keep
  // reading it through `useCurrentEditor()` exactly as they did before.
  const contextValue = useMemo(() => ({ editor }), [editor]);

  return (
    <NovelEditorChrome className={className}>
      <TooltipProvider delayDuration={0} disableHoverableContent>
        <EditorContext.Provider value={contextValue}>
          <EditorRoot>{children({ editor, EditorSurface })}</EditorRoot>
          {/* The slash-command upload dialogs key their event names off
              `editor.id`, so they mount only once the editor exists — the
              same gate `RichTextProvider` applied by rendering nothing until
              its `editor` prop arrived. */}
          {editor && <SlashDialogTrigger />}
        </EditorContext.Provider>
      </TooltipProvider>
    </NovelEditorChrome>
  );
}

/**
 * Convenience hook for components rendered inside {@link NovelEditor} that
 * need the editor. Thin alias over `@tiptap/react`'s `useCurrentEditor`, which
 * Novel's shell populates — re-exported here so consumers of this package do
 * not have to reach for `@tiptap/react` directly.
 */
export function useNovelEditor(): Editor | null {
  const { editor } = useCurrentEditor();
  return (editor as Editor | null) ?? null;
}

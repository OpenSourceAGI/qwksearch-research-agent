/**
 * @fileoverview Main entry point for the Lexical editor component.
 * This file sets up the Lexical editor with various plugins, themes, and context providers.
 */


import type { JSX } from 'react';
import { useMemo, useEffect, useState } from 'react';
import './styles/tailwind.css';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import {
  CollaborationPlugin,
  CollaborationPluginV2__EXPERIMENTAL,
} from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { SelectionAlwaysOnDisplay } from '@lexical/react/LexicalSelectionAlwaysOnDisplay';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { CAN_USE_DOM } from '@lexical/utils';
import { defineExtension } from 'lexical';
import { buildHTMLConfig } from './utils/buildHTMLConfig';
import {
  createWebsocketProvider,
  createWebsocketProviderWithDoc,
} from './collab/collaboration';
import { Doc } from 'yjs';
import { FlashMessageContext } from './context/FlashMessageContext';
import { SettingsContext, useSettings } from './context/SettingsContext';
import { SharedHistoryContext, useSharedHistoryContext } from './context/SharedHistoryContext';
import { ToolbarContext } from './context/ToolbarContext';
import PlaygroundNodes from './nodes/PlaygroundNodes';
import { TableContext } from './plugins/TablePlugin';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import CommentPlugin from './plugins/CommentPlugin';
import ComponentPickerPlugin from './plugins/ComponentPickerPlugin';
import ContextMenuPlugin from './plugins/ContextMenuPlugin';
import DateTimePlugin from './plugins/DateTimePlugin';
import DragDropPaste from './plugins/DragDropPastePlugin';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import EmojiSelectorPlugin from './plugins/EmojiSelectorPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin, { AutoHighlightProvider } from './plugins/FloatingTextFormatToolbarPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import { LayoutPlugin } from './plugins/LayoutPlugin/LayoutPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import MarkdownShortcutPlugin from './plugins/MarkdownShortcutPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import PageBreakPlugin from './plugins/PageBreakPlugin';
import PollPlugin from './plugins/PollPlugin';
import LineSpacingPlugin from './plugins/LineSpacingPlugin';
import ShortcutsPlugin from './plugins/ShortcutsPlugin';
import SpecialTextPlugin from './plugins/SpecialTextPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TabFocusPlugin from './plugins/TabFocusPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TableHoverActionsV2Plugin from './plugins/TableHoverActionsV2Plugin';
import TableOfContentsPlugin from './plugins/TableOfContentsPlugin';
import TableScrollShadowPlugin from './plugins/TableScrollShadowPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
// import TypingPerfPlugin from './plugins/TypingPerfPlugin'; // disabled for typing perf
import { VersionsPlugin } from './plugins/VersionsPlugin';
import FindReplacePlugin from './plugins/FindReplacePlugin';
import HighlightPlugin from './plugins/HighlightPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';
import ContentEditable from './ui/ContentEditable';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import './themes/editor-style.css';

const COLLAB_DOC_ID = 'main';

const skipCollaborationInit = (() => {
  if (typeof window === 'undefined') return false;
  try {
    // @ts-expect-error
    return window.parent != null && window.parent.frames.right === window;
  } catch {
    // Cross-origin parent frame access throws DOMException
    return false;
  }
})();

function CollabV2({
  id,
  shouldBootstrap,
}: {
  id: string;
  shouldBootstrap: boolean;
}) {
  const doc = useMemo(() => new Doc({ gc: false }), []);

  const provider = useMemo(() => {
    return createWebsocketProviderWithDoc('main', doc);
  }, [doc]);

  return (
    <CollaborationPluginV2__EXPERIMENTAL
      id={id}
      doc={doc}
      provider={provider}
      __shouldBootstrapUnsafe={shouldBootstrap}
    />
  );
}

// Inner editor content (must be rendered inside Lexical context providers)
/**
 * The inner content of the Lexical editor.
 * This component must be rendered within a Lexical context provider.
 * It handles the rendering of the editor shell, toolbar, and various plugins.
 * 
 * @returns {JSX.Element} The rendered editor content.
 */
function EditorContent(): JSX.Element {
  const { historyState } = useSharedHistoryContext();
  const {
    settings: {
      isCollab,
      useCollabV2,
      isAutocomplete,
      measureTypingPerf,
      hasLinkAttributes,
      hasNestedTables,
      isRichText,
      showTreeView,
      showTableOfContents,
      shouldUseLexicalContextMenu,
      shouldPreserveNewLinesInMarkdown,
      tableCellMerge,
      tableCellBackgroundColor,
      tableHorizontalScroll,
      shouldAllowHighlightingWithBrackets,
      selectionAlwaysOnDisplay,
      listStrictIndent,
    },
  } = useSettings();

  const isEditable = useLexicalEditable();
  const placeholder = isCollab
    ? 'Enter some collaborative rich text...'
    : isRichText
      ? 'Enter some rich text...'
      : 'Enter some plain text...';
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState<boolean>(false);
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport =
        CAN_USE_DOM && window.matchMedia('(max-width: 1025px)').matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  return (
    <>
      <div className="editor-shell">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {isRichText && (
            <ToolbarPlugin
              editor={editor}
              activeEditor={activeEditor}
              setActiveEditor={setActiveEditor}
              setIsLinkEditMode={setIsLinkEditMode}>
              <>
                <ActionsPlugin
                  shouldPreserveNewLinesInMarkdown={shouldPreserveNewLinesInMarkdown}
                  useCollabV2={useCollabV2}
                />
              </>
            </ToolbarPlugin>
          )}
          {isRichText && (
            <ShortcutsPlugin
              editor={activeEditor}
              setIsLinkEditMode={setIsLinkEditMode}
            />
          )}
          {isRichText && <FindReplacePlugin />}
          <div
            className={`editor-container ${showTreeView ? 'tree-view' : ''} ${!isRichText ? 'plain-text' : ''}`}>
            <DragDropPaste />
            <AutoFocusPlugin />
            {selectionAlwaysOnDisplay && <SelectionAlwaysOnDisplay />}
            <ClearEditorPlugin />
            <ComponentPickerPlugin />
            <EmojiPickerPlugin />
            <EmojiSelectorPlugin />
            <AutoEmbedPlugin />
            <MentionsPlugin />
            <EmojisPlugin />
            <HashtagPlugin />
            <KeywordsPlugin />
            <SpeechToTextPlugin />
            <AutoLinkPlugin />
            <HighlightPlugin />
            <DateTimePlugin />
            {isRichText ? (
              <>
                {isCollab ? (
                  useCollabV2 ? (
                    <>
                      <CollabV2
                        id={COLLAB_DOC_ID}
                        shouldBootstrap={!skipCollaborationInit}
                      />
                      <VersionsPlugin id={COLLAB_DOC_ID} />
                    </>
                  ) : (
                    <CollaborationPlugin
                      id={COLLAB_DOC_ID}
                      providerFactory={createWebsocketProvider}
                      shouldBootstrap={!skipCollaborationInit}
                    />
                  )
                ) : (
                  <HistoryPlugin externalHistoryState={historyState} />
                )}
                <RichTextPlugin
                  contentEditable={
                    <div className="editor-scroller">
                      <div className="editor" ref={onRef}>
                        <ContentEditable placeholder={placeholder} />
                      </div>
                    </div>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <MarkdownShortcutPlugin />
                <ListPlugin hasStrictIndent={listStrictIndent} />
                <CheckListPlugin />
                <TablePlugin
                  hasCellMerge={tableCellMerge}
                  hasCellBackgroundColor={tableCellBackgroundColor}
                  hasHorizontalScroll={tableHorizontalScroll}
                  hasNestedTables={hasNestedTables}
                />
                <TableCellResizer />
                <TableScrollShadowPlugin />
                <ImagesPlugin />
                <YouTubePlugin />
                <LinkPlugin hasLinkAttributes={hasLinkAttributes} />
                <PollPlugin />
                <LineSpacingPlugin />
                <ClickableLinkPlugin disabled={isEditable} />
                <HorizontalRulePlugin />
                <TabFocusPlugin />
                <TabIndentationPlugin maxIndent={7} />
                <CollapsiblePlugin />
                <PageBreakPlugin />
                <LayoutPlugin />
                <CommentPlugin
                  providerFactory={isCollab ? createWebsocketProvider : undefined}
                />
                {floatingAnchorElem && (
                  <>
                    <FloatingLinkEditorPlugin
                      anchorElem={floatingAnchorElem}
                      isLinkEditMode={isLinkEditMode}
                      setIsLinkEditMode={setIsLinkEditMode}
                    />
                    <TableCellActionMenuPlugin
                      anchorElem={floatingAnchorElem}
                      cellMerge={true}
                    />
                    <FloatingTextFormatToolbarPlugin
                      anchorElem={floatingAnchorElem}
                      setIsLinkEditMode={setIsLinkEditMode}
                    />
                  </>
                )}
                {floatingAnchorElem && !isSmallWidthViewport && (
                  <>
                    <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                    <TableHoverActionsV2Plugin anchorElem={floatingAnchorElem} />
                  </>
                )}
              </>
            ) : (
              <>
                <PlainTextPlugin
                  contentEditable={<ContentEditable placeholder={placeholder} />}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin externalHistoryState={historyState} />
              </>
            )}
            {isAutocomplete && <AutocompletePlugin />}
            {shouldUseLexicalContextMenu && <ContextMenuPlugin />}
            {shouldAllowHighlightingWithBrackets && <SpecialTextPlugin />}
          </div>
          {showTreeView && <TreeViewPlugin />}
        </div>
        {showTableOfContents && <TableOfContentsPlugin />}
      </div>
      {/* TypingPerfPlugin disabled — it adds 5 window listeners per keystroke */}
    </>
  );
}

// Lexical context wrapper (must be rendered inside Settings context)
/**
 * A wrapper component that initializes the Lexical extension and context providers.
 * It sets up the collaboration, history, table, and toolbar contexts.
 * 
 * @returns {JSX.Element} The rendered Lexical wrapper.
 */
function LexicalWrapper(): JSX.Element {
  const {
    settings: { isCollab, emptyEditor },
  } = useSettings();

  const app = useMemo(
    () =>
      defineExtension({
        $initialEditorState: undefined,
        html: buildHTMLConfig(),
        name: '@lexical/playground',
        namespace: 'LexicalEditor',
        nodes: PlaygroundNodes,
        theme: PlaygroundEditorTheme,
      }),
    [emptyEditor, isCollab],
  );

  return (
    <LexicalCollaboration>
      <LexicalExtensionComposer extension={app} contentEditable={null}>
        <SharedHistoryContext>
          <AutoHighlightProvider>
            <TableContext>
              <ToolbarContext>
                <EditorContent />
              </ToolbarContext>
            </TableContext>
          </AutoHighlightProvider>
        </SharedHistoryContext>
      </LexicalExtensionComposer>
    </LexicalCollaboration>
  );
}

// Main editor component with all context providers
/**
 * The main exported Lexical editor component.
 * It provides all the necessary context providers (Settings, FlashMessage) 
 * and wraps the Lexical editor shell.
 * 
 * @returns {JSX.Element} The full Lexical editor with toolbar and contexts.
 */
function EditorWithToolbar(): JSX.Element {
  return (
    <SettingsContext>
      <FlashMessageContext>
        <LexicalWrapper />
      </FlashMessageContext>
    </SettingsContext>
  );
}

export default EditorWithToolbar;
export { EditorWithToolbar, EditorContent };
export { default as PlaygroundNodes } from './nodes/PlaygroundNodes';
export { default as PlaygroundEditorTheme } from './themes/PlaygroundEditorTheme';
export { buildHTMLConfig } from './utils/buildHTMLConfig';
export { SettingsContext, useSettings } from './context/SettingsContext';
export { SharedHistoryContext, useSharedHistoryContext } from './context/SharedHistoryContext';
export { FlashMessageContext } from './context/FlashMessageContext';
export { ToolbarContext } from './context/ToolbarContext';
export { TableContext } from './plugins/TablePlugin';
export { EditorCallbacksProvider, useEditorCallbacks } from './context/EditorCallbacksContext';
export { default as Icon, getIconSrc } from './ui/Icon';

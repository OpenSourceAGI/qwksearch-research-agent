/**
 * React component that renders LexicalArticleViewer within the ResearchAgent area of ResearchAgent.
 */
'use client';

import React, { useEffect, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromDOM } from '@lexical/html';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { MarkNode, $isMarkNode, $unwrapMarkNode, $wrapSelectionInMarkNode } from '@lexical/mark';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { CodeNode } from '@lexical/code';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  LexicalCommand,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// Command for toggling highlight
export const TOGGLE_HIGHLIGHT_COMMAND: LexicalCommand<void> = createCommand('TOGGLE_HIGHLIGHT_COMMAND');

// Custom highlight styles
const HIGHLIGHT_STYLES = {
  backgroundColor: 'rgb(254 240 138)', // yellow-200
  borderRadius: '2px',
  padding: '0 2px',
};

// Plugin to load HTML content into the editor
function HtmlLoaderPlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!html) return;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.append(...nodes);
    });
  }, [editor, html]);

  return null;
}

// Plugin to handle highlighting
function HighlightPlugin({ isHighlightMode }: { isHighlightMode: boolean }) {
  const [editor] = useLexicalComposerContext();

  const toggleHighlight = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const nodes = selection.getNodes();

      // Check if any selected node is already highlighted
      let hasHighlight = false;
      for (const node of nodes) {
        const parent = node.getParent();
        if ($isMarkNode(parent)) {
          hasHighlight = true;
          break;
        }
      }

      if (hasHighlight) {
        // Remove highlight from all selected mark nodes
        for (const node of nodes) {
          const parent = node.getParent();
          if ($isMarkNode(parent)) {
            $unwrapMarkNode(parent);
          }
        }
      } else {
        // Add highlight
        $wrapSelectionInMarkNode(selection, selection.isBackward(), 'highlight-' + Date.now());
      }
    });
  }, [editor]);

  // Handle selection and auto-highlight when in highlight mode
  useEffect(() => {
    if (!isHighlightMode) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        toggleHighlight();
      }
    };

    // Add listener to the editor root
    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener('mouseup', handleMouseUp);
      return () => {
        rootElement.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [editor, isHighlightMode, toggleHighlight]);

  // Register command handler
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        TOGGLE_HIGHLIGHT_COMMAND,
        () => {
          toggleHighlight();
          return true;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, toggleHighlight]);

  return null;
}

// Plugin to make editor read-only
function ReadOnlyPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(false);
  }, [editor]);

  return null;
}

// Custom theme for the editor
const theme = {
  paragraph: 'mb-4',
  heading: {
    h1: 'text-3xl font-bold mb-4 mt-6',
    h2: 'text-2xl font-bold mb-3 mt-5',
    h3: 'text-xl font-bold mb-2 mt-4',
    h4: 'text-lg font-bold mb-2 mt-3',
    h5: 'text-base font-bold mb-1 mt-2',
    h6: 'text-sm font-bold mb-1 mt-2',
  },
  list: {
    ul: 'list-disc ml-6 mb-4',
    ol: 'list-decimal ml-6 mb-4',
    listitem: 'mb-1',
    nested: {
      listitem: 'list-none',
    },
  },
  quote: 'border-l-4 border-muted-foreground/30 pl-4 italic my-4 text-muted-foreground',
  link: 'text-primary underline hover:text-primary/80',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted px-1.5 py-0.5 rounded font-mono text-sm',
  },
  code: 'bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4 block',
  table: 'border-collapse w-full my-4',
  tableCell: 'border border-border p-2',
  tableRow: '',
  mark: 'bg-yellow-200 dark:bg-yellow-800 rounded px-0.5',
};

interface LexicalArticleViewerProps {
  html: string;
  isHighlightMode: boolean;
  className?: string;
}

const LexicalArticleViewer: React.FC<LexicalArticleViewerProps> = ({
  html,
  isHighlightMode,
  className = '',
}) => {
  const initialConfig = {
    namespace: 'ArticleViewer',
    theme,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      MarkNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      CodeNode,
    ],
    editable: false,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`relative ${className}`}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={`prose dark:prose-invert max-w-none text-md text-foreground leading-relaxed outline-none ${
                isHighlightMode ? 'cursor-text select-text' : ''
              }`}
              style={{
                minHeight: '100px',
              }}
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ReadOnlyPlugin />
        <HtmlLoaderPlugin html={html} />
        <HighlightPlugin isHighlightMode={isHighlightMode} />
      </div>
    </LexicalComposer>
  );
};

export default LexicalArticleViewer;

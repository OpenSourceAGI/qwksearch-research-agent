/**
 * @fileoverview Plugin for text highlighting using inline background-color styles.
 * Provides commands for applying/removing highlights:
 * - setHighlight: Apply highlight with color
 * - toggleHighlight: Toggle highlight on/off
 * - unsetHighlight: Remove all highlighting
 *
 * Also supports:
 * - Keyboard shortcuts (Mod+Shift+H)
 * - Auto-highlight mode integration
 * - Preserves text selection and content
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $isElementNode,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  KEY_MODIFIER_COMMAND,
  LexicalCommand,
  TextNode,
} from 'lexical';
import { useEffect } from 'react';
import { useAutoHighlight } from '../FloatingTextFormatToolbarPlugin/context/AutoHighlightContext';
import { mergeRegister } from '@lexical/utils';

export interface HighlightAttributes {
  color?: string;
}

// Commands for highlight operations
export const SET_HIGHLIGHT_COMMAND: LexicalCommand<HighlightAttributes | undefined> =
  createCommand('SET_HIGHLIGHT_COMMAND');

export const TOGGLE_HIGHLIGHT_COMMAND: LexicalCommand<HighlightAttributes | undefined> =
  createCommand('TOGGLE_HIGHLIGHT_COMMAND');

export const UNSET_HIGHLIGHT_COMMAND: LexicalCommand<void> =
  createCommand('UNSET_HIGHLIGHT_COMMAND');

/**
 * Applies or removes background color from a text node.
 */
function setTextNodeBackgroundColor(node: TextNode, color: string | null): void {
  const currentStyle = node.getStyle();

  if (color === null) {
    // Remove background-color
    const newStyle = currentStyle
      .split(';')
      .filter((s) => !s.trim().startsWith('background-color'))
      .join(';');
    node.setStyle(newStyle);
  } else {
    // Add or update background-color
    const styleWithoutBg = currentStyle
      .split(';')
      .filter((s) => !s.trim().startsWith('background-color'))
      .join(';');
    const newStyle = styleWithoutBg
      ? `${styleWithoutBg};background-color:${color}`
      : `background-color:${color}`;
    node.setStyle(newStyle);
  }
}

/**
 * Checks if a text node has background color highlighting.
 */
function hasBackgroundColor(node: TextNode): boolean {
  const style = node.getStyle();
  const bgColorMatch = style.match(/background-color\s*:\s*([^;]+)/);

  if (!bgColorMatch) return false;

  const value = bgColorMatch[1].trim();
  return value !== 'transparent' && value !== 'none' && value !== '';
}

/**
 * Applies highlighting to the selected text using inline styles.
 */
function $applyHighlight(color: string | null): void {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return;
  }

  // Get anchor and focus nodes
  let anchorNode = selection.anchor.getNode();
  let focusNode = selection.focus.getNode();

  // If anchor/focus are on element nodes, get their text content
  if ($isElementNode(anchorNode)) {
    const textNode = anchorNode.getFirstChild();
    if ($isTextNode(textNode)) {
      anchorNode = textNode;
    }
  }
  if ($isElementNode(focusNode)) {
    const textNode = focusNode.getFirstChild();
    if ($isTextNode(textNode)) {
      focusNode = textNode;
    }
  }

  const nodes = selection.getNodes();
  const textNodes = nodes.filter((node) => $isTextNode(node));

  if (textNodes.length === 0) {
    return;
  }

  // Apply style to text nodes within selection boundaries
  textNodes.forEach((node) => {
    if (!$isTextNode(node)) return;

    const nodeKey = node.getKey();
    const isFirst = nodeKey === anchorNode.getKey();
    const isLast = nodeKey === focusNode.getKey();

    if (isFirst || isLast) {
      // For first/last nodes, only apply style to selected portion
      const anchorOffset = isFirst && $isTextNode(selection.anchor.getNode())
        ? selection.anchor.offset
        : isFirst ? 0 : 0;
      const focusOffset = isLast && $isTextNode(selection.focus.getNode())
        ? selection.focus.offset
        : isLast ? node.getTextContentSize() : node.getTextContentSize();

      const startOffset = isFirst && isLast
        ? Math.min(anchorOffset, focusOffset)
        : isFirst ? anchorOffset : 0;
      const endOffset = isFirst && isLast
        ? Math.max(anchorOffset, focusOffset)
        : isLast ? focusOffset : node.getTextContentSize();

      if (startOffset === endOffset) return;

      // Split the node if needed
      if (startOffset > 0 || endOffset < node.getTextContentSize()) {
        let targetNode = node;

        if (startOffset > 0) {
          const [, rightNode] = node.splitText(startOffset);
          targetNode = rightNode as TextNode;
        }

        if (endOffset < node.getTextContentSize()) {
          const offset = startOffset > 0 ? endOffset - startOffset : endOffset;
          const [leftNode] = targetNode.splitText(offset);
          targetNode = leftNode as TextNode;
        }

        setTextNodeBackgroundColor(targetNode, color);
      } else {
        setTextNodeBackgroundColor(node, color);
      }
    } else {
      // Middle nodes - apply to entire node
      setTextNodeBackgroundColor(node, color);
    }
  });
}

/**
 * Checks if selection contains any highlighted text.
 */
function $selectionHasHighlight(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const nodes = selection.getNodes().filter($isTextNode);
  return nodes.some((node) => hasBackgroundColor(node as TextNode));
}

/**
 * Plugin that enables text highlighting with inline background-color styles.
 * Integrates with AutoHighlightContext for automatic highlighting on selection.
 */
export default function HighlightPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const { isAutoHighlightEnabled, highlightColor } = useAutoHighlight();

  useEffect(() => {
    return mergeRegister(
      // SET_HIGHLIGHT_COMMAND: Apply highlight
      editor.registerCommand(
        SET_HIGHLIGHT_COMMAND,
        (attributes) => {
          editor.update(() => {
            const color = attributes?.color || '#FFFF00';
            $applyHighlight(color);
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      // TOGGLE_HIGHLIGHT_COMMAND: Toggle highlight on/off
      editor.registerCommand(
        TOGGLE_HIGHLIGHT_COMMAND,
        (attributes) => {
          editor.update(() => {
            if ($selectionHasHighlight()) {
              $applyHighlight(null);
            } else {
              const color = attributes?.color || '#FFFF00';
              $applyHighlight(color);
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      // UNSET_HIGHLIGHT_COMMAND: Remove all highlighting
      editor.registerCommand(
        UNSET_HIGHLIGHT_COMMAND,
        () => {
          editor.update(() => {
            $applyHighlight(null);
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      // Keyboard shortcut: Mod+Shift+H
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        (event: KeyboardEvent) => {
          const { shiftKey, metaKey, ctrlKey } = event;

          if (shiftKey && (metaKey || ctrlKey) && event.key === 'h') {
            event.preventDefault();
            editor.dispatchCommand(TOGGLE_HIGHLIGHT_COMMAND, {
              color: highlightColor,
            });
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, highlightColor]);

  // Auto-highlight on selection change
  useEffect(() => {
    if (!isAutoHighlightEnabled) {
      return;
    }

    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          // Automatically highlight selected text
          editor.update(() => {
            $applyHighlight(highlightColor);
          });
        }
      });
    });
  }, [editor, isAutoHighlightEnabled, highlightColor]);

  return null;
}

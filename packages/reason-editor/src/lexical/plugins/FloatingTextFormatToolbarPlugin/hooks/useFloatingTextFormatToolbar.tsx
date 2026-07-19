import type { JSX, Dispatch } from 'react';
import type { LexicalEditor } from 'lexical';
import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $isElementNode,
  COMMAND_PRIORITY_LOW,
  getDOMSelection,
  $addUpdateTag,
} from 'lexical';
import { $isLinkNode } from '@lexical/link';
import { mergeRegister } from '@lexical/utils';
import { getSelectedNode } from '../../../utils/getSelectedNode';
import { TextFormatFloatingToolbar } from '../components/TextFormatFloatingToolbar';
import { APPLY_HIGHLIGHT_COMMAND } from '../commands';
import { useAutoHighlight } from '../context/AutoHighlightContext';

const SKIP_DOM_SELECTION_TAG = 'skip-dom-selection';
const HISTORIC_TAG = 'historic';

export function useFloatingTextFormatToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  setIsLinkEditMode: Dispatch<boolean>,
): JSX.Element | null {
  const { isAutoHighlightEnabled, highlightColor } = useAutoHighlight();
  const [isText, setIsText] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const previousSelectionRef = useRef<string>('');

  const applyStyleText = useCallback(
    (
      styles: Record<string, string>,
      skipHistoryStack?: boolean,
      skipRefocus: boolean = false,
    ) => {
      editor.update(
        () => {
          if (skipRefocus) {
            $addUpdateTag(SKIP_DOM_SELECTION_TAG);
          }
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }

          // Get anchor and focus nodes - these might be element nodes (e.g., ListItemNode)
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

          // Get all nodes in selection and filter to ONLY text nodes
          const nodes = selection.getNodes();
          const textNodes = nodes.filter((node) => $isTextNode(node));

          // If no text nodes, don't apply any styles
          if (textNodes.length === 0) {
            return;
          }

          // Apply styles only to text nodes within selection boundaries
          // This prevents highlighting the entire node when only part of it is selected
          textNodes.forEach((node) => {
            if (!$isTextNode(node)) return;

            // Check if this node needs to be split based on selection boundaries
            const nodeKey = node.getKey();
            const isFirst = nodeKey === anchorNode.getKey();
            const isLast = nodeKey === focusNode.getKey();

            if (isFirst || isLast) {
              // For first/last nodes, only apply style to selected portion
              // Get selection offsets - use 0 if the anchor/focus was on an element node
              const anchorOffset = isFirst && $isTextNode(selection.anchor.getNode())
                ? selection.anchor.offset
                : isFirst ? 0 : 0;
              const focusOffset = isLast && $isTextNode(selection.focus.getNode())
                ? selection.focus.offset
                : isLast ? node.getTextContentSize() : node.getTextContentSize();

              // Determine actual start and end based on selection direction
              const startOffset = isFirst && isLast
                ? Math.min(anchorOffset, focusOffset)
                : isFirst ? anchorOffset : 0;
              const endOffset = isFirst && isLast
                ? Math.max(anchorOffset, focusOffset)
                : isLast ? focusOffset : node.getTextContentSize();

              // Skip if selection is collapsed on this node
              if (startOffset === endOffset) return;

              // Split the node if needed and apply style only to selected part
              if (startOffset > 0 || endOffset < node.getTextContentSize()) {
                // We need to apply style to a portion of the text
                let targetNode = node;

                // Split at start if needed
                if (startOffset > 0) {
                  const [, rightNode] = node.splitText(startOffset);
                  targetNode = rightNode as typeof node;
                }

                // Split at end if needed
                if (endOffset < node.getTextContentSize()) {
                  const offset = startOffset > 0 ? endOffset - startOffset : endOffset;
                  const [leftNode] = targetNode.splitText(offset);
                  targetNode = leftNode as typeof node;
                }

                // Apply styles to the target node
                Object.keys(styles).forEach((key) => {
                  const value = styles[key];
                  if (value === null) {
                    targetNode.setStyle(
                      targetNode
                        .getStyle()
                        .split(';')
                        .filter((s) => !s.trim().startsWith(key))
                        .join(';')
                    );
                  } else {
                    targetNode.setStyle(
                      `${targetNode.getStyle()};${key}:${value}`.replace(/^;/, '')
                    );
                  }
                });
              } else {
                // Apply to entire node
                Object.keys(styles).forEach((key) => {
                  const value = styles[key];
                  if (value === null) {
                    node.setStyle(
                      node
                        .getStyle()
                        .split(';')
                        .filter((s) => !s.trim().startsWith(key))
                        .join(';')
                    );
                  } else {
                    node.setStyle(
                      `${node.getStyle()};${key}:${value}`.replace(/^;/, '')
                    );
                  }
                });
              }
            } else {
              // Middle nodes - apply to entire node
              Object.keys(styles).forEach((key) => {
                const value = styles[key];
                if (value === null) {
                  node.setStyle(
                    node
                      .getStyle()
                      .split(';')
                      .filter((s) => !s.trim().startsWith(key))
                      .join(';')
                  );
                } else {
                  node.setStyle(
                    `${node.getStyle()};${key}:${value}`.replace(/^;/, '')
                  );
                }
              });
            }
          });
        },
        skipHistoryStack ? { tag: HISTORIC_TAG } : {},
      );
    },
    [editor],
  );

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not to pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return;
      }
      const selection = $getSelection();
      const nativeSelection = getDOMSelection(editor._window);
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        return;
      }

      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = getSelectedNode(selection);

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsCode(selection.hasFormat('code'));

      // Update links
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      // Check if text has highlight
      const nodes = selection.getNodes();
      const hasHighlight = nodes.some((n) => {
        if ($isTextNode(n)) {
          const style = n.getStyle();
          return style.includes('background-color');
        }
        return false;
      });
      setIsHighlighted(hasHighlight);

      if (selection.getTextContent() !== '') {
        setIsText($isTextNode(node) || $isParagraphNode(node));
      } else {
        setIsText(false);
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, '');
      if (!selection.isCollapsed() && rawTextContent === '') {
        setIsText(false);
        return;
      }
    });
  }, [editor]);

  // Auto-highlight effect: automatically apply highlighting when text is selected
  useEffect(() => {
    if (!isAutoHighlightEnabled) {
      return;
    }

    const handleAutoHighlight = () => {
      // Read selection state first
      let shouldApply = false;
      let shouldRemove = false;

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          return;
        }

        const selectedText = selection.getTextContent();

        // Avoid re-highlighting the same selection
        if (previousSelectionRef.current === selectedText) {
          return;
        }

        previousSelectionRef.current = selectedText;

        if (selectedText.trim().length > 0) {
          // Only get text nodes to avoid highlighting entire blocks/paragraphs
          const textNodes = selection.getNodes().filter($isTextNode);

          // Don't highlight if there are no actual text nodes
          if (textNodes.length === 0) {
            return;
          }

          const hasHighlight = textNodes.some((node) => {
            const style = node.getStyle();
            return style.includes('background-color');
          });

          if (hasHighlight) {
            shouldRemove = true;
          } else {
            shouldApply = true;
          }
        }
      });

      // Apply changes after reading
      if (shouldRemove) {
        applyStyleText({ 'background-color': null }, false, true);
      } else if (shouldApply) {
        applyStyleText({ 'background-color': highlightColor }, false, true);
      }
    };

    // Small delay to ensure selection is finalized
    const timeoutId = setTimeout(handleAutoHighlight, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [editor, isAutoHighlightEnabled, highlightColor, isText, applyStyleText]);

  useEffect(() => {
    document.addEventListener('selectionchange', updatePopup);
    return () => {
      document.removeEventListener('selectionchange', updatePopup);
    };
  }, [updatePopup]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updatePopup();
      }),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false);
        }
      }),
      editor.registerCommand(
        APPLY_HIGHLIGHT_COMMAND,
        (color: string) => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Only get text nodes to avoid highlighting entire blocks/paragraphs
            const textNodes = selection.getNodes().filter($isTextNode);

            // Don't highlight if there are no actual text nodes
            if (textNodes.length === 0) {
              return true;
            }

            const hasHighlight = textNodes.some((node) => {
              const style = node.getStyle();
              return style.includes('background-color');
            });

            if (hasHighlight) {
              // Remove highlight - apply only to selected text
              applyStyleText({ 'background-color': null }, false, false);
            } else {
              // Apply highlight - apply only to selected text
              applyStyleText({ 'background-color': color }, false, false);
            }
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updatePopup]);

  if (!isText) {
    return null;
  }

  return createPortal(
    <TextFormatFloatingToolbar
      editor={editor}
      anchorElem={anchorElem}
      isLink={isLink}
      isBold={isBold}
      isItalic={isItalic}
      isStrikethrough={isStrikethrough}
      isSubscript={isSubscript}
      isSuperscript={isSuperscript}
      isUnderline={isUnderline}
      isCode={isCode}
      isHighlighted={isHighlighted}
      setIsLinkEditMode={setIsLinkEditMode}
    />,
    anchorElem,
  );
}

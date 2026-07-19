/**
 * @fileoverview Plugin that provides line spacing control for the Lexical editor.
 * Allows users to change line height for selected text blocks via toolbar dropdown.
 */

import type { JSX } from 'react';
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  ElementNode,
  LexicalNode,
  RangeSelection,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $isListNode } from '@lexical/list';
import { $isHeadingNode } from '@lexical/rich-text';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isParagraphNode } from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as React from 'react';

export type LineSpacingValue = '1' | '1.15' | '1.5' | '2';

const LINE_HEIGHT_VALUES: LineSpacingValue[] = ['1', '1.15', '1.5', '2'];

/**
 * Gets all block-level nodes in the current selection.
 * @param selection - The current editor selection
 * @returns Array of block-level element nodes
 */
function getSelectedBlockNodes(selection: ReturnType<typeof $getSelection>): ElementNode[] {
  if (!$isRangeSelection(selection)) return [];

  const nodes = selection.getNodes();
  const blocks = new Map<string, ElementNode>();

  for (const node of nodes) {
    let current: LexicalNode | null = node;
    while (current) {
      const parent = current.getParent();
      if (
        $isParagraphNode(current) ||
        $isHeadingNode(current) ||
        $isQuoteNode(current) ||
        $isListNode(current)
      ) {
        blocks.set(current.getKey(), current as ElementNode);
        break;
      }
      current = parent;
    }
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isRootOrShadowRoot(anchorNode)) {
    const anchorBlock = anchorNode.getTopLevelElementOrThrow();
    if (
      $isParagraphNode(anchorBlock) ||
      $isHeadingNode(anchorBlock) ||
      $isQuoteNode(anchorBlock) ||
      $isListNode(anchorBlock)
    ) {
      blocks.set(anchorBlock.getKey(), anchorBlock as ElementNode);
    }
  }

  return [...blocks.values()];
}

/**
 * Extracts the line-height value from a node's inline style string.
 * @param node - The element node to read from
 * @returns The line-height value or empty string if not found
 */
function getLineHeightFromNode(node: ElementNode): string {
  const style = node.getStyle?.() || '';
  return style
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('line-height:'))
    ?.split(':')[1]
    ?.trim() || '';
}

/**
 * Updates an inline style string with a new line-height value.
 * @param existing - The existing style string
 * @param value - The new line-height value
 * @returns Updated style string
 */
function setLineHeightStyle(existing: string, value: string): string {
  const parts = existing
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith('line-height:'));

  parts.push(`line-height: ${value}`);
  return parts.join('; ');
}

/**
 * Plugin that enables line spacing control in the editor toolbar.
 * Observes selection changes and applies line-height to selected blocks.
 * @returns {JSX.Element | null} The toolbar dropdown UI or null
 */
export default function LineSpacingPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [value, setValue] = useState<string>('1.5');

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          const blocks = getSelectedBlockNodes(selection);
          if (blocks.length === 0) return;

          const first = blocks[0];
          const current = getLineHeightFromNode(first);
          setValue(current || '1.5');
        });
      }),
    );
  }, [editor]);

  const applyLineHeight = useCallback(
    (nextValue: LineSpacingValue) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const blocks = getSelectedBlockNodes(selection);

        for (const block of blocks) {
          const style = block.getStyle?.() || '';
          block.setStyle(setLineHeightStyle(style, nextValue));
        }
      });
    },
    [editor],
  );

  return null;
}

/**
 * Toolbar component for line spacing control.
 * Renders a dropdown that allows users to select line-height values.
 * @returns {JSX.Element} The line spacing dropdown UI
 */
export function LineSpacingToolbar(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [value, setValue] = useState<string>('1.5');
  const savedSelectionRef = useRef<RangeSelection | null>(null);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          savedSelectionRef.current = selection.clone();

          const blocks = getSelectedBlockNodes(selection);
          if (blocks.length === 0) return;

          const first = blocks[0];
          const current = getLineHeightFromNode(first);
          setValue(current || '1.5');
        });
      }),
    );
  }, [editor]);

  const applyLineHeight = useCallback(
    (nextValue: LineSpacingValue) => {
      editor.update(() => {
        const saved = savedSelectionRef.current;
        if (saved) {
          $setSelection(saved.clone());
        }

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const blocks = getSelectedBlockNodes(selection);

        for (const block of blocks) {
          const style = block.getStyle?.() || '';
          block.setStyle(setLineHeightStyle(style, nextValue));
        }
      });
    },
    [editor],
  );

  return (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span>Line spacing</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value as LineSpacingValue;
          setValue(next);
          applyLineHeight(next);
        }}
      >
        {LINE_HEIGHT_VALUES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

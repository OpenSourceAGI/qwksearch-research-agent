import { LexicalEditor, RangeSelection } from 'lexical';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  ElementNode,
  LexicalNode,
} from 'lexical';
import { $isListNode } from '@lexical/list';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { $isParagraphNode } from 'lexical';
import { mergeRegister } from '@lexical/utils';

import { cn } from '../../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../ui/tooltip';

export type LineSpacingValue = '1' | '1.15' | '1.5' | '2';

const LINE_HEIGHT_VALUES: LineSpacingValue[] = ['1', '1.15', '1.5', '2'];

/**
 * Gets all block-level nodes in the current selection.
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

  const anchorBlock = selection.anchor.getNode().getTopLevelElementOrThrow();
  if (
    $isParagraphNode(anchorBlock) ||
    $isHeadingNode(anchorBlock) ||
    $isQuoteNode(anchorBlock) ||
    $isListNode(anchorBlock)
  ) {
    blocks.set(anchorBlock.getKey(), anchorBlock as ElementNode);
  }

  return [...blocks.values()];
}

/**
 * Extracts the line-height value from a node's inline style string.
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

export default function LineSpacing({
  disabled,
  editor,
}: {
  disabled: boolean;
  editor: LexicalEditor;
}) {
  const [value, setValue] = useState<string>('1.5');
  // Save the last valid selection so we can restore it after the dropdown steals focus
  const savedSelectionRef = useRef<RangeSelection | null>(null);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          // Clone the selection so it survives outside the read callback
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
        // Restore the saved selection so the update targets the right blocks
        // even though the dropdown click moved focus away from the editor.
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as LineSpacingValue;
    setValue(next);
    applyLineHeight(next);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <select
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className={cn(
            'h-7 px-2 text-sm font-medium bg-transparent border border-border rounded-md',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          )}
        >
          {LINE_HEIGHT_VALUES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </TooltipTrigger>
      <TooltipContent>Line spacing</TooltipContent>
    </Tooltip>
  );
}

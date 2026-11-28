'use client';

import * as React from 'react';

import {
  EraserIcon,
  KeyboardIcon,
  EllipsisIcon,
  SubscriptIcon,
  SuperscriptIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorRef } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ToolbarButton } from './toolbar';

/** Marks the toolbar keeps behind the overflow menu, mirroring REASON's Text Styles menu. */
const OVERFLOW_MARKS = [
  KEYS.bold,
  KEYS.italic,
  KEYS.underline,
  KEYS.strikethrough,
  KEYS.code,
  KEYS.sub,
  KEYS.sup,
  KEYS.kbd,
  KEYS.highlight,
  KEYS.color,
  KEYS.backgroundColor,
  KEYS.fontSize,
  KEYS.fontFamily,
];

export function MoreToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>,
) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} toolbarId="text-styles-more">
          <EllipsisIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="ignore-click-outside/toolbar flex max-h-[500px] min-w-[180px] flex-col overflow-y-auto"
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              editor.tf.toggleMark(KEYS.kbd);
              editor.tf.collapse({ edge: 'end' });
              editor.tf.focus();
            }}
          >
            <KeyboardIcon />
            Keyboard input
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              editor.tf.toggleMark(KEYS.sup, { remove: KEYS.sub });
              editor.tf.focus();
            }}
          >
            <SuperscriptIcon />
            Superscript
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              editor.tf.toggleMark(KEYS.sub, { remove: KEYS.sup });
              editor.tf.focus();
            }}
          >
            <SubscriptIcon />
            Subscript
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              editor.tf.removeMarks(OVERFLOW_MARKS);
              editor.tf.toggleBlock(KEYS.p);
              editor.tf.focus();
            }}
          >
            <EraserIcon />
            Clear formatting
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

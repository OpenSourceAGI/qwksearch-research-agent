'use client';

import * as React from 'react';

import {
  ChevronRightIcon,
  Code2,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ListIcon,
  ListOrdered,
  PilcrowIcon,
  Quote,
  SquareIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getBlockType, setBlockType } from '@/docs-agent/plate/kits/transforms';

import { ToolbarButton, ToolbarMenuGroup } from './toolbar';

/**
 * Block types the current plugin set actually registers (see
 * `../plate-editor-config.ts`). Headings run to 6 rather than the registry's 3
 * because the REASON toolbar's Block Format menu offers all six.
 */
export const turnIntoItems = [
  {
    icon: <PilcrowIcon />,
    keywords: ['paragraph'],
    label: 'Text',
    value: KEYS.p,
  },
  { icon: <Heading1Icon />, keywords: ['title', 'h1'], label: 'Heading 1', value: KEYS.h1 },
  { icon: <Heading2Icon />, keywords: ['subtitle', 'h2'], label: 'Heading 2', value: KEYS.h2 },
  { icon: <Heading3Icon />, keywords: ['subtitle', 'h3'], label: 'Heading 3', value: KEYS.h3 },
  { icon: <Heading4Icon />, keywords: ['h4'], label: 'Heading 4', value: KEYS.h4 },
  { icon: <Heading5Icon />, keywords: ['h5'], label: 'Heading 5', value: KEYS.h5 },
  { icon: <Heading6Icon />, keywords: ['h6'], label: 'Heading 6', value: KEYS.h6 },
  { icon: <ListIcon />, keywords: ['unordered', 'ul', '-'], label: 'Bulleted list', value: KEYS.ul },
  { icon: <ListOrdered />, keywords: ['ordered', 'ol', '1'], label: 'Numbered list', value: KEYS.ol },
  {
    icon: <SquareIcon />,
    keywords: ['checklist', 'task', 'checkbox', '[]'],
    label: 'To-do list',
    value: KEYS.listTodo,
  },
  {
    icon: <ChevronRightIcon />,
    keywords: ['collapsible', 'expandable'],
    label: 'Toggle list',
    value: KEYS.toggle,
  },
  { icon: <Code2 />, keywords: ['```'], label: 'Code', value: KEYS.codeBlock },
  {
    icon: <Quote />,
    keywords: ['citation', 'blockquote', '>'],
    label: 'Quote',
    value: KEYS.blockquote,
  },
];

export function TurnIntoToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>,
) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const value = useSelectionFragmentProp({
    defaultValue: KEYS.p,
    getProp: (node) => getBlockType(node as never),
  });

  const selectedItem = React.useMemo(
    () => turnIntoItems.find((item) => item.value === (value ?? KEYS.p)) ?? turnIntoItems[0],
    [value],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          className="min-w-[110px] justify-start"
          isDropdown
          pressed={open}
          toolbarId="turn-into"
          aria-label={`Turn into: ${selectedItem.label}`}
        >
          {selectedItem.label}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="ignore-click-outside/toolbar min-w-0"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.tf.focus();
        }}
      >
        <ToolbarMenuGroup
          label="Turn into"
          onValueChange={(type) => setBlockType(editor, type)}
          value={value}
        >
          {turnIntoItems.map(({ icon, label, value: itemValue }) => (
            <DropdownMenuRadioItem
              className="min-w-[180px] pl-2 *:first:[span]:hidden"
              key={itemValue}
              value={itemValue}
            >
              {icon}
              {label}
            </DropdownMenuRadioItem>
          ))}
        </ToolbarMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

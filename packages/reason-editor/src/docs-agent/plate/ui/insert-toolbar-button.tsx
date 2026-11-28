'use client';

import * as React from 'react';

import {
  AudioLinesIcon,
  ChevronRightIcon,
  Code2,
  Columns3Icon,
  FileUpIcon,
  FilmIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  LightbulbIcon,
  Link2Icon,
  ListIcon,
  ListOrdered,
  type LucideProps,
  MinusIcon,
  PilcrowIcon,
  PlusIcon,
  Quote,
  RadicalIcon,
  SquareIcon,
  Table,
  TableOfContentsIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { type PlateEditor, useEditorRef } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  insertBlock,
  insertInlineElement,
} from '@/docs-agent/plate/kits/transforms';

import { ToolbarButton, ToolbarMenuGroup } from './toolbar';

type Group = {
  group: string;
  items: {
    icon: React.ReactElement<LucideProps>;
    value: string;
    onSelect: (editor: PlateEditor, value: string) => void;
    label?: string;
  }[];
};

/**
 * Mirrors the slash menu in `./slash-node.tsx`, minus the entries whose plugins
 * this editor does not register (AI, Excalidraw, code drawings, dates,
 * footnotes) and plus the media group, which the slash menu leaves to drag and
 * drop. Keep it in step with `../plate-editor-config.ts`: an entry whose plugin
 * is missing inserts a node nothing knows how to render.
 */
export const insertMenuGroups: Group[] = [
  {
    group: 'Basic blocks',
    items: (
      [
        { icon: <PilcrowIcon />, label: 'Text', value: KEYS.p },
        { icon: <Heading1Icon />, label: 'Heading 1', value: KEYS.h1 },
        { icon: <Heading2Icon />, label: 'Heading 2', value: KEYS.h2 },
        { icon: <Heading3Icon />, label: 'Heading 3', value: KEYS.h3 },
        { icon: <Table />, label: 'Table', value: KEYS.table },
        { icon: <ListIcon />, label: 'Bulleted list', value: KEYS.ul },
        { icon: <ListOrdered />, label: 'Numbered list', value: KEYS.ol },
        { icon: <SquareIcon />, label: 'To-do list', value: KEYS.listTodo },
        { icon: <ChevronRightIcon />, label: 'Toggle list', value: KEYS.toggle },
        { icon: <Code2 />, label: 'Code', value: KEYS.codeBlock },
        { icon: <Quote />, label: 'Quote', value: KEYS.blockquote },
        { icon: <LightbulbIcon />, label: 'Callout', value: KEYS.callout },
        { icon: <MinusIcon />, label: 'Divider', value: KEYS.hr },
      ] as const
    ).map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value);
      },
    })),
  },
  {
    group: 'Advanced blocks',
    items: (
      [
        { icon: <TableOfContentsIcon />, label: 'Table of contents', value: KEYS.toc },
        { icon: <Columns3Icon />, label: '3 columns', value: 'action_three_columns' },
        { icon: <RadicalIcon />, label: 'Equation', value: KEYS.equation },
      ] as const
    ).map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value);
      },
    })),
  },
  {
    group: 'Media',
    items: (
      [
        { icon: <ImageIcon />, label: 'Image', value: KEYS.img },
        { icon: <FilmIcon />, label: 'Video', value: KEYS.video },
        { icon: <AudioLinesIcon />, label: 'Audio', value: KEYS.audio },
        { icon: <FileUpIcon />, label: 'File', value: KEYS.file },
        { icon: <FilmIcon />, label: 'Embed', value: KEYS.mediaEmbed },
      ] as const
    ).map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value);
      },
    })),
  },
  {
    group: 'Inline',
    items: (
      [
        { icon: <Link2Icon />, label: 'Link', value: KEYS.link },
        { icon: <RadicalIcon />, label: 'Inline equation', value: KEYS.inlineEquation },
      ] as const
    ).map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertInlineElement(editor, value);
      },
    })),
  },
];

export function InsertToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>,
) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton isDropdown pressed={open} toolbarId="insert">
          <PlusIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="flex max-h-[500px] min-w-0 flex-col overflow-y-auto"
      >
        {insertMenuGroups.map(({ group, items: nestedItems }) => (
          <ToolbarMenuGroup key={group} label={group}>
            {nestedItems.map(({ icon, label, value, onSelect }) => (
              <DropdownMenuItem
                className="min-w-[180px]"
                key={value}
                onSelect={() => {
                  onSelect(editor, value);
                  editor.tf.focus();
                }}
              >
                {icon}
                {label}
              </DropdownMenuItem>
            ))}
          </ToolbarMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

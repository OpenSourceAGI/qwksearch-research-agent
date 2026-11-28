'use client';

import * as React from 'react';

import {
  BaselineIcon,
  BoldIcon,
  CodeIcon,
  HighlighterIcon,
  ItalicIcon,
  PaintBucketIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorReadOnly } from 'platejs/react';

import { AlignToolbarButton } from './align-toolbar-button';
import { EmojiToolbarButton } from './emoji-toolbar-button';
import { InlineEquationToolbarButton } from './equation-toolbar-button';
import { ExportToolbarButton } from './export-toolbar-button';
import { FontColorToolbarButton } from './font-color-toolbar-button';
import { FontSizeToolbarButton } from './font-size-toolbar-button';
import { RedoToolbarButton, UndoToolbarButton } from './history-toolbar-button';
import { ImportToolbarButton } from './import-toolbar-button';
import { IndentToolbarButton, OutdentToolbarButton } from './indent-toolbar-button';
import { InsertToolbarButton } from './insert-toolbar-button';
import { LineHeightToolbarButton } from './line-height-toolbar-button';
import { LinkToolbarButton } from './link-toolbar-button';
import {
  BulletedListToolbarButton,
  NumberedListToolbarButton,
  TodoListToolbarButton,
} from './list-toolbar-button';
import { MarkToolbarButton } from './mark-toolbar-button';
import { MediaToolbarButton } from './media-toolbar-button';
import { MoreToolbarButton } from './more-toolbar-button';
import { TableToolbarButton } from './table-toolbar-button';
import { ToggleToolbarButton } from './toggle-toolbar-button';
import { ToolbarGroup, ToolbarTooltipProvider } from './toolbar';
import { TranscribeToolbarButton } from './transcribe-toolbar-button';
import { TurnIntoToolbarButton } from './turn-into-toolbar-button';

/**
 * Every button the Plate playground's fixed toolbar offers, restricted to the
 * plugins `../plate-editor-config.ts` actually registers, and with REASON's own
 * Dictate toggle appended.
 *
 * Order follows the playground: history, block type and size, marks, colour,
 * alignment and lists, links and tables, insert and media, spacing, then the
 * document-level actions. `ToolbarGroup` draws the dividers, so grouping here is
 * also the visual grouping.
 *
 * Left out on purpose, because their plugins are not installed: the AI menu and
 * Copilot, comments, suggestions and the review/edit mode switch, Excalidraw and
 * code drawings, dates and footnotes.
 */
export function FixedToolbarButtons() {
  const readOnly = useEditorReadOnly();

  if (readOnly) return null;

  return (
    <ToolbarTooltipProvider>
      <ToolbarGroup>
        <UndoToolbarButton />
        <RedoToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <TurnIntoToolbarButton />
        <FontSizeToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.bold} toolbarId="bold">
          <BoldIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={KEYS.italic} toolbarId="italic">
          <ItalicIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={KEYS.underline} toolbarId="underline">
          <UnderlineIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={KEYS.strikethrough} toolbarId="strike">
          <StrikethroughIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={KEYS.code} toolbarId="code">
          <CodeIcon />
        </MarkToolbarButton>
        <MoreToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <FontColorToolbarButton nodeType={KEYS.color} toolbarId="text-color">
          <BaselineIcon />
        </FontColorToolbarButton>
        <FontColorToolbarButton nodeType={KEYS.backgroundColor} toolbarId="background-color">
          <PaintBucketIcon />
        </FontColorToolbarButton>
        <MarkToolbarButton nodeType={KEYS.highlight} toolbarId="highlight">
          <HighlighterIcon />
        </MarkToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <AlignToolbarButton />
        <NumberedListToolbarButton />
        <BulletedListToolbarButton />
        <TodoListToolbarButton />
        <ToggleToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <LinkToolbarButton />
        <TableToolbarButton />
        <EmojiToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <InsertToolbarButton />
        <MediaToolbarButton nodeType={KEYS.img} />
        <MediaToolbarButton nodeType={KEYS.video} />
        <MediaToolbarButton nodeType={KEYS.audio} />
        <MediaToolbarButton nodeType={KEYS.file} />
        <InlineEquationToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <LineHeightToolbarButton />
        <OutdentToolbarButton />
        <IndentToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <ImportToolbarButton />
        <ExportToolbarButton />
        <TranscribeToolbarButton />
      </ToolbarGroup>
    </ToolbarTooltipProvider>
  );
}

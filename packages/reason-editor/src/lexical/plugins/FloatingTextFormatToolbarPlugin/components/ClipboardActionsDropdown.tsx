import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  PASTE_COMMAND,
} from 'lexical';
import { IS_APPLE } from '@lexical/utils';
import { Button } from '../../../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../../ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../../ui/tooltip';
import Icon from '../../../ui/Icon';

interface ClipboardActionsDropdownProps {
  editor: LexicalEditor;
}

export function ClipboardActionsDropdown({ editor }: ClipboardActionsDropdownProps): JSX.Element {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              aria-label="Clipboard actions">
              <Icon name="clipboard" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold text-foreground">Copy & Paste</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuItem onClick={() => editor.dispatchCommand(CUT_COMMAND, null)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Icon name="scissors" />
              <span>Cut</span>
            </div>
            <span className="text-xs text-muted-foreground">{IS_APPLE ? '⌘X' : 'Ctrl+X'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.dispatchCommand(COPY_COMMAND, null)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Icon name="copy" />
              <span>Copy</span>
            </div>
            <span className="text-xs text-muted-foreground">{IS_APPLE ? '⌘C' : 'Ctrl+C'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => {
          try {
            const text = await navigator.clipboard.readText();
            const clipboardEvent = new ClipboardEvent('paste', {
              clipboardData: new DataTransfer(),
            });
            Object.defineProperty(clipboardEvent, 'clipboardData', {
              value: {
                getData: () => text,
              },
            });
            editor.dispatchCommand(PASTE_COMMAND, clipboardEvent);
          } catch (err) {
            console.error('Failed to paste:', err);
          }
        }}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Icon name="clipboard" />
              <span>Paste</span>
            </div>
            <span className="text-xs text-muted-foreground">{IS_APPLE ? '⌘V' : 'Ctrl+V'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async () => {
          try {
            const text = await navigator.clipboard.readText();
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                selection.insertRawText(text);
              }
            });
          } catch (err) {
            console.error('Failed to paste as plain text:', err);
          }
        }}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Icon name="paste-plain" />
              <span>Paste Plain</span>
            </div>
            <span className="text-xs text-muted-foreground">{IS_APPLE ? '⇧⌘V' : 'Ctrl+Shift+V'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => editor.dispatchCommand(DELETE_CHARACTER_COMMAND, false)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Icon name="trash" />
              <span>Delete</span>
            </div>
            <span className="text-xs text-muted-foreground">{IS_APPLE ? '⌫' : 'Del'}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

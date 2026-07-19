import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';
import type { Dispatch } from 'react';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { Button } from '../../../../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../../ui/tooltip';
import { cn } from '../../../../lib/utils';
import Icon from '../../../ui/Icon';
import { INSERT_INLINE_COMMAND } from '../../CommentPlugin';

interface FormatButtonsProps {
  editor: LexicalEditor;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isLink: boolean;
  setIsLinkEditMode: Dispatch<boolean>;
}

export function FormatButtons({
  editor,
  isBold,
  isItalic,
  isUnderline,
  isLink,
  setIsLinkEditMode,
}: FormatButtonsProps): JSX.Element {
  const insertLink = () => {
    if (!isLink) {
      setIsLinkEditMode(true);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      setIsLinkEditMode(false);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  const insertComment = () => {
    editor.dispatchCommand(INSERT_INLINE_COMMAND, undefined);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
            className={cn(
              'h-8 w-8 rounded-lg',
              isBold && 'bg-accent text-accent-foreground'
            )}
            aria-label="Format text as bold">
            <Icon name="bold" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold text-foreground">Bold</p>
          <p className="text-muted-foreground text-[10px] font-medium">Ctrl+B</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
            className={cn(
              'h-8 w-8 rounded-lg',
              isItalic && 'bg-accent text-accent-foreground'
            )}
            aria-label="Format text as italics">
            <Icon name="italic" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold text-foreground">Italic</p>
          <p className="text-muted-foreground text-[10px] font-medium">Ctrl+I</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
            className={cn(
              'h-8 w-8 rounded-lg',
              isUnderline && 'bg-accent text-accent-foreground'
            )}
            aria-label="Format text to underlined">
            <Icon name="underline" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold text-foreground">Underline</p>
          <p className="text-muted-foreground text-[10px] font-medium">Ctrl+U</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={insertLink}
            className={cn(
              'h-8 w-8 rounded-lg',
              isLink && 'bg-accent text-accent-foreground'
            )}
            aria-label="Insert link">
            <Icon name="link" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold text-foreground">Insert Link</p>
          <p className="text-muted-foreground text-[10px] font-medium">Ctrl+K</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={insertComment}
            className="h-8 w-8 rounded-lg max-lg:hidden"
            aria-label="Insert comment">
            <Icon name="add-comment" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold text-foreground">Add Comment</p>
          <p className="text-muted-foreground text-[10px] font-medium">Ctrl+Alt+M</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
}

import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';
import { $getSelection, $isRangeSelection, $isTextNode } from 'lexical';
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
import { formatCode, formatHeading, formatParagraph } from '../../ToolbarPlugin/utils';
import { blockTypeToBlockName, useToolbarState } from '../../../context/ToolbarContext';

interface BlockTypeDropdownProps {
  editor: LexicalEditor;
}

export function BlockTypeDropdown({ editor }: BlockTypeDropdownProps): JSX.Element {
  const { toolbarState } = useToolbarState();
  const blockType = toolbarState.blockType;

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
              aria-label="Change block type">
              <Icon name="text-paragraph" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold text-foreground">Block Type</p>
          <p className="text-muted-foreground text-[10px] font-medium">{blockTypeToBlockName[blockType]}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => formatParagraph(editor)}>
          <Icon name="text-paragraph" className="mr-2" />
          Normal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => formatHeading(editor, blockType, 'h1')}>
          <Icon name="type-h1" className="mr-2" />
          Heading 1
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => formatHeading(editor, blockType, 'h2')}>
          <Icon name="type-h2" className="mr-2" />
          Heading 2
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => formatHeading(editor, blockType, 'h3')}>
          <Icon name="type-h3" className="mr-2" />
          Heading 3
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => formatHeading(editor, blockType, 'h4')}>
          <Icon name="type-h4" className="mr-2" />
          Heading 4
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => formatCode(editor, blockType)}>
          <Icon name="code" className="mr-2" />
          Code Block
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes();
              nodes.forEach((node) => {
                if ($isTextNode(node)) {
                  node.setFormat(0);
                  node.setStyle('');
                }
              });
            }
          });
        }}>
          <Icon name="eraser" className="mr-2" />
          Clear Formatting
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

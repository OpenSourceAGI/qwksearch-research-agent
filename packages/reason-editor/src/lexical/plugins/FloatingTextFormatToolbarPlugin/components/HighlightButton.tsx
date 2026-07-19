import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '../../../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../../ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../../ui/tooltip';
import { cn } from '../../../../lib/utils';
import Icon from '../../../ui/Icon';
import ColorPicker from '../../../ui/ColorPicker';
import { DropdownMenuItem } from '../../../../ui/dropdown-menu';
import { useAutoHighlight } from '../context/AutoHighlightContext';
import { TOGGLE_HIGHLIGHT_COMMAND } from '../../HighlightPlugin';

interface HighlightButtonProps {
  editor: LexicalEditor;
  isHighlighted: boolean;
}

export function HighlightButton({ editor, isHighlighted }: HighlightButtonProps): JSX.Element {
  const {
    isAutoHighlightEnabled,
    highlightColor: contextHighlightColor,
    toggleAutoHighlight,
    setHighlightColor: setContextHighlightColor
  } = useAutoHighlight();

  const [highlightColor, setHighlightColor] = useState(contextHighlightColor);
  const [isHighlightColorPickerOpen, setIsHighlightColorPickerOpen] = useState(false);

  // Sync local state with context
  useEffect(() => {
    setHighlightColor(contextHighlightColor);
  }, [contextHighlightColor]);

  const toggleHighlight = useCallback(() => {
    editor.dispatchCommand(TOGGLE_HIGHLIGHT_COMMAND, {
      color: highlightColor,
    });
  }, [editor, highlightColor]);

  const onHighlightColorSelect = useCallback(
    (value: string) => {
      setHighlightColor(value);
      setContextHighlightColor(value);
      editor.dispatchCommand(TOGGLE_HIGHLIGHT_COMMAND, {
        color: value,
      });
    },
    [editor, setContextHighlightColor],
  );

  return (
    <DropdownMenu open={isHighlightColorPickerOpen} onOpenChange={setIsHighlightColorPickerOpen}>
      <div className="flex items-stretch">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleHighlight}
              className={cn(
                'h-8 w-8 rounded-r-none rounded-l-lg border-r-0',
                isHighlighted && 'bg-accent text-accent-foreground'
              )}
              aria-label="Toggle text highlight">
              <Icon name="highlighter" style={{ borderBottom: `2px solid ${highlightColor}` }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-semibold text-foreground">Highlight</p>
            <p className="text-muted-foreground text-[10px] font-medium">Ctrl+M</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-6 rounded-l-none rounded-r-lg px-1"
                aria-label="Select highlight color">
                <Icon name="chevron-down" className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="top">
            <p className="font-semibold text-foreground">Highlight Color</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <DropdownMenuContent
        align="start"
        className="p-2"
        onInteractOutside={(e) => {
          // Prevent closing when clicking inside the color picker
          const target = e.target as HTMLElement;
          if (target.closest('.color-picker-wrapper')) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking inside the color picker
          const target = e.target as HTMLElement;
          if (target.closest('.color-picker-wrapper')) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          // Prevent closing when focusing inside the color picker
          const target = e.target as HTMLElement;
          if (target.closest('.color-picker-wrapper')) {
            e.preventDefault();
          }
        }}>
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={() => {
              toggleAutoHighlight();
            }}
            className="mb-2">
            <Icon name="highlighter-color" className="mr-2" />
            <span>Auto-Highlight</span>
            {isAutoHighlightEnabled && <Icon name="check" className="ml-auto" />}
          </DropdownMenuItem>
          <ColorPicker
            color={highlightColor}
            onChange={onHighlightColorSelect}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';
import { useState, useCallback } from 'react';
import { $getSelection, $isRangeSelection } from 'lexical';
import { $patchStyleText } from '@lexical/selection';
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

interface TextColorButtonProps {
  editor: LexicalEditor;
}

export function TextColorButton({ editor }: TextColorButtonProps): JSX.Element {
  const [textColor, setTextColor] = useState('#000000');
  const [isTextColorPickerOpen, setIsTextColorPickerOpen] = useState(false);

  const applyTextColor = useCallback((color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, {
          'color': color,
        });
      }
    });
  }, [editor]);

  const onTextColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean, skipRefocus: boolean) => {
      setTextColor(value);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            'color': value,
          });
        }
      }, skipHistoryStack ? { tag: 'historic' } : {});
    },
    [editor],
  );

  return (
    <DropdownMenu open={isTextColorPickerOpen} onOpenChange={setIsTextColorPickerOpen}>
      <div className="flex items-stretch">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => applyTextColor(textColor)}
              className="h-8 w-8 rounded-r-none rounded-l-lg border-r-0"
              aria-label="Apply text color">
              <Icon name="font-color" style={{ borderBottom: `2px solid ${textColor}` }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-semibold text-foreground">Text Color</p>
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
                aria-label="Select text color">
                <Icon name="chevron-down" className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="top">
            <p className="font-semibold text-foreground">Text Color Picker</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <DropdownMenuContent
        align="start"
        className="p-2"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.color-picker-wrapper')) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.color-picker-wrapper')) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.color-picker-wrapper')) {
            e.preventDefault();
          }
        }}>
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <ColorPicker
            color={textColor}
            onChange={onTextColorSelect}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

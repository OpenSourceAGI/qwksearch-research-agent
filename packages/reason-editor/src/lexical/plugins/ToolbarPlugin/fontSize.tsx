
import { LexicalEditor } from 'lexical';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import {
  MAX_ALLOWED_FONT_SIZE,
  MIN_ALLOWED_FONT_SIZE,
} from '../../context/ToolbarContext';
import { updateFontSizeInSelection } from './utils';

const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

function parseFontSize(input: string): [number, string] | null {
  const match = input.match(/^(\d+(?:\.\d+)?)(px|pt)$/);
  return match ? [Number(match[1]), match[2]] : null;
}

function normalizeToPx(fontSize: number, unit: string): number {
  return unit === 'pt' ? Math.round((fontSize * 4) / 3) : fontSize;
}

function isValidFontSize(fontSizePx: number): boolean {
  return (
    fontSizePx >= MIN_ALLOWED_FONT_SIZE && fontSizePx <= MAX_ALLOWED_FONT_SIZE
  );
}

export function parseFontSizeForToolbar(input: string): string {
  const parsed = parseFontSize(input);
  if (!parsed) return '';
  const [fontSize, unit] = parsed;
  const fontSizePx = normalizeToPx(fontSize, unit);
  return `${fontSizePx}px`;
}

export function parseAllowedFontSize(input: string): string {
  const parsed = parseFontSize(input);
  if (!parsed) return '';
  const [fontSize, unit] = parsed;
  const fontSizePx = normalizeToPx(fontSize, unit);
  return isValidFontSize(fontSizePx) ? input : '';
}

export default function FontSize({
  selectionFontSize,
  disabled,
  editor,
}: {
  selectionFontSize: string;
  disabled: boolean;
  editor: LexicalEditor;
}) {
  const [inputValue, setInputValue] = React.useState(
    selectionFontSize ? String(parseInt(selectionFontSize, 10)) : '',
  );

  React.useEffect(() => {
    setInputValue(selectionFontSize ? String(parseInt(selectionFontSize, 10)) : '');
  }, [selectionFontSize]);

  const applySize = (value: string, skipRefocus = false) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    const clamped = Math.min(MAX_ALLOWED_FONT_SIZE, Math.max(MIN_ALLOWED_FONT_SIZE, num));
    setInputValue(String(clamped));
    updateFontSizeInSelection(editor, clamped + 'px', null, skipRefocus);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applySize(inputValue);
    } else if (e.key === 'Escape') {
      setInputValue(selectionFontSize ? String(parseInt(selectionFontSize, 10)) : '');
    }
  };

  const handleBlur = () => {
    if (inputValue) applySize(inputValue);
  };

  const handlePresetSelect = (size: number) => {
    setInputValue(String(size));
    updateFontSizeInSelection(editor, size + 'px', null, false);
  };

  return (
    <div
      className="inline-flex items-center h-7 rounded-md border border-border shrink-0 overflow-hidden focus-within:ring-1 focus-within:ring-ring"
      aria-label="Font size"
    >
      <input
        type="number"
        value={inputValue}
        disabled={disabled}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-8 h-full text-center text-xs font-semibold bg-transparent border-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={MIN_ALLOWED_FONT_SIZE}
        max={MAX_ALLOWED_FONT_SIZE}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            className="h-full px-0.5 flex items-center border-l border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            tabIndex={-1}
            aria-label="Font size presets"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[4rem] max-h-64 overflow-y-auto">
          {FONT_SIZE_OPTIONS.map((size) => (
            <DropdownMenuItem
              key={size}
              className="text-xs justify-center"
              onSelect={() => handlePresetSelect(size)}
            >
              {size}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

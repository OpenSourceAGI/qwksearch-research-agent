import type { Dispatch } from 'react';
import type { LexicalEditor } from 'lexical';

/**
 * Props for the TextFormatFloatingToolbar component
 */
export interface TextFormatFloatingToolbarProps {
  editor: LexicalEditor;
  anchorElem: HTMLElement;
  isBold: boolean;
  isCode: boolean;
  isItalic: boolean;
  isLink: boolean;
  isStrikethrough: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isUnderline: boolean;
  isHighlighted: boolean;
  setIsLinkEditMode: Dispatch<boolean>;
}

/**
 * Props for the FloatingTextFormatToolbarPlugin component
 */
export interface FloatingTextFormatToolbarPluginProps {
  anchorElem?: HTMLElement;
  setIsLinkEditMode: Dispatch<boolean>;
}

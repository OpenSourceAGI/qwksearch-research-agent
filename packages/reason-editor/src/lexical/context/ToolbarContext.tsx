/**
 * @fileoverview Context for managing the state of the editor toolbar (formatting, font, blocks, etc.).
 */


import type { JSX } from 'react';

import { ElementFormatType } from 'lexical';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const MIN_ALLOWED_FONT_SIZE = 2;
export const MAX_ALLOWED_FONT_SIZE = 72;
export const DEFAULT_FONT_SIZE = 12;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rootTypeToRootName = {
  root: 'Root',
  table: 'Table',
};

/**
 * Mapping of Lexical block types to their human-readable names.
 */
export const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

//disable eslint sorting rule for quick reference to toolbar state
/* eslint-disable sort-keys-fix/sort-keys-fix */
const INITIAL_TOOLBAR_STATE = {
  bgColor: 'hsl(var(--background))',
  blockType: 'paragraph' as keyof typeof blockTypeToBlockName,
  canRedo: false,
  canUndo: false,
  codeLanguage: '',
  codeTheme: '',
  elementFormat: 'left' as ElementFormatType,
  fontColor: 'hsl(var(--foreground))',
  fontFamily: 'Arial',
  // Current font size in px
  fontSize: `${DEFAULT_FONT_SIZE}px`,
  // Font size input value - for controlled input
  fontSizeInputValue: `${DEFAULT_FONT_SIZE}`,
  isBold: false,
  isCode: false,
  isHighlight: false,
  isImageCaption: false,
  isItalic: false,
  isLink: false,
  isRTL: false,
  isStrikethrough: false,
  isSubscript: false,
  isSuperscript: false,
  isUnderline: false,
  isLowercase: false,
  isUppercase: false,
  isCapitalize: false,
  rootType: 'root' as keyof typeof rootTypeToRootName,
  listStartNumber: null as number | null,
};

type ToolbarState = typeof INITIAL_TOOLBAR_STATE;

// Utility type to get keys and infer value types
type ToolbarStateKey = keyof ToolbarState;
type ToolbarStateValue<Key extends ToolbarStateKey> = ToolbarState[Key];

/**
 * Shape of the toolbar context.
 */
type ContextShape = {
  /** Current state of the toolbar */
  toolbarState: ToolbarState;
  /** Function to update a specific property in the toolbar state */
  updateToolbarState<Key extends ToolbarStateKey>(
    key: Key,
    value: ToolbarStateValue<Key>,
  ): void;
};

const Context = createContext<ContextShape | undefined>(undefined);

/**
 * Context provider for the editor toolbar state.
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped by the provider.
 * @returns {JSX.Element} The rendered context provider.
 */
export const ToolbarContext = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [toolbarState, setToolbarState] = useState(INITIAL_TOOLBAR_STATE);
  const selectionFontSize = toolbarState.fontSize;

  const updateToolbarState = useCallback(
    <Key extends ToolbarStateKey>(key: Key, value: ToolbarStateValue<Key>) => {
      setToolbarState((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  useEffect(() => {
    updateToolbarState('fontSizeInputValue', selectionFontSize.slice(0, -2));
  }, [selectionFontSize, updateToolbarState]);

  const contextValue = useMemo(() => {
    return {
      toolbarState,
      updateToolbarState,
    };
  }, [toolbarState, updateToolbarState]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

/**
 * Hook to access the toolbar state context.
 * @returns {ContextShape} The current toolbar state and updater function.
 * @throws {Error} If used outside of a ToolbarContext provider.
 */
export const useToolbarState = () => {
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error('useToolbarState must be used within a ToolbarProvider');
  }

  return context;
};

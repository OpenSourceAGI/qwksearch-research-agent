/**
 * @fileoverview Default and initial configuration for the Lexical editor.
 */

/**
 * Default settings for the editor.
 */
export const DEFAULT_SETTINGS = {
  disableBeforeInput: false,
  emptyEditor: true,
  hasLinkAttributes: false,
  hasNestedTables: false,
  isAutocomplete: true,
  isAutocompleteWords: true,
  isAutocompleteSentences: false,
  isCharLimit: false,
  isCharLimitUtf8: false,
  isCodeHighlighted: true,
  isCodeShiki: false,
  isCollab: false,
  isMaxLength: false,
  isRichText: true,
  listStrictIndent: false,
  measureTypingPerf: false,
  selectionAlwaysOnDisplay: false,
  shouldAllowHighlightingWithBrackets: false,
  shouldPreserveNewLinesInMarkdown: false,
  shouldUseLexicalContextMenu: false,
  showNestedEditorTreeView: false,
  showTableOfContents: false,
  showTreeView: false,
  tableCellBackgroundColor: true,
  tableCellMerge: true,
  tableHorizontalScroll: true,
  useCollabV2: false,
} as const;

// These are mutated in setupEnv
/**
 * Initial settings for the editor, which may be modified during environment setup.
 */
export const INITIAL_SETTINGS: Record<SettingName, boolean> = {
  ...DEFAULT_SETTINGS,
};

/**
 * Type representing valid setting names.
 */
export type SettingName = keyof typeof DEFAULT_SETTINGS;

export type Settings = typeof INITIAL_SETTINGS;

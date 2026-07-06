/**
 * @fileoverview The primary toolbar plugin for the Lexical editor.
 * Provides controls for text formatting, block styles, font settings, 
 * inserts (images, tables, etc.), and undo/redo.
 */


import type { JSX } from 'react';

import {
  $isCodeNode,
} from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListNode, ListNode } from '@lexical/list';
import { INSERT_EMBED_COMMAND } from '@lexical/react/LexicalAutoEmbedPlugin';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $isHeadingNode, HeadingTagType } from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $patchStyleText,
} from '@lexical/selection';
import { $isTableNode, $isTableSelection } from '@lexical/table';
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  $isEditorIsNestedEditor,
  IS_APPLE,
  mergeRegister,
} from '@lexical/utils';
import {
  $addUpdateTag,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  CommandPayloadType,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORIC_TAG,
  INDENT_CONTENT_COMMAND,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
  TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import { Dispatch, useCallback, useEffect, useState } from 'react';

import Icon from '../../ui/Icon';
import {
  blockTypeToBlockName,
  useToolbarState,
} from '../../context/ToolbarContext';
import { useSettings } from '../../context/SettingsContext';
import { useEditorCallbacks } from '../../context/EditorCallbacksContext';
import useModal from '../../hooks/useModal';
import { cn } from '../../../lib/utils';
import { $createStickyNode } from '../../nodes/StickyNode';
import DropDown, { DropDownItem, DropDownSeparator } from '../../ui/DropDown';
import SearchableDropDown from '../../ui/SearchableDropDown';
import DropdownColorPicker from '../../ui/DropdownColorPicker';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../ui/tooltip';
import { DropdownMenuItem } from '../../../ui/dropdown-menu';
import { InviteDropdown } from '../../../modals/InviteDropdown';
import { isKeyboardInput } from '../../utils/focusUtils';
import { getSelectedNode } from '../../utils/getSelectedNode';
import { sanitizeUrl } from '../../utils/url';
import { EmbedConfigs } from '../AutoEmbedPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../CollapsiblePlugin';
import {
  INSERT_INLINE_COMMAND,
  TOGGLE_COMMENTS_PANEL_COMMAND
} from '../CommentPlugin';
import { INSERT_DATETIME_COMMAND } from '../DateTimePlugin';
import { useAutoHighlight } from '../FloatingTextFormatToolbarPlugin/context/AutoHighlightContext';
import { InsertImageDialog } from '../ImagesPlugin';
import InsertLayoutDialog from '../LayoutPlugin/InsertLayoutDialog';
import { INSERT_PAGE_BREAK } from '../PageBreakPlugin';
import { InsertPollDialog } from '../PollPlugin';
import { SHORTCUTS } from '../ShortcutsPlugin/shortcuts';
import { InsertTableDialog } from '../TablePlugin';
import FontSize, { parseFontSizeForToolbar } from './fontSize';
import LineSpacing from './lineSpacing';
import { DocumentUploadDialog } from '../DocumentUploadPlugin';
import {
  clearFormatting,
  formatBulletList,
  formatCheckList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
} from './utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rootTypeToRootName = {
  root: 'Root',
  table: 'Table',
};

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Alegreya', 'Alegreya'],
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Crimson Text', 'Crimson Text'],
  ['DM Sans', 'DM Sans'],
  ['Georgia', 'Georgia'],
  ['Inter', 'Inter'],
  ['Josefin Sans', 'Josefin Sans'],
  ['Lato', 'Lato'],
  ['Merriweather', 'Merriweather'],
  ['Montserrat', 'Montserrat'],
  ['Noto Sans', 'Noto Sans'],
  ['Nunito', 'Nunito'],
  ['Open Sans', 'Open Sans'],
  ['Oswald', 'Oswald'],
  ['Playfair Display', 'Playfair Display'],
  ['Poppins', 'Poppins'],
  ['PT Sans', 'PT Sans'],
  ['PT Serif', 'PT Serif'],
  ['Raleway', 'Raleway'],
  ['Roboto', 'Roboto'],
  ['Roboto Mono', 'Roboto Mono'],
  ['Roboto Slab', 'Roboto Slab'],
  ['Source Code Pro', 'Source Code Pro'],
  ['Source Sans 3', 'Source Sans 3'],
  ['Source Serif 4', 'Source Serif 4'],
  ['Times New Roman', 'Times New Roman'],
  ['Ubuntu', 'Ubuntu'],
  ['Verdana', 'Verdana'],
  ['Work Sans', 'Work Sans'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['10px', '10px'],
  ['11px', '11px'],
  ['12px', '12px'],
  ['13px', '13px'],
  ['14px', '14px'],
  ['15px', '15px'],
  ['16px', '16px'],
  ['17px', '17px'],
  ['18px', '18px'],
  ['19px', '19px'],
  ['20px', '20px'],
];

const ELEMENT_FORMAT_OPTIONS: {
  [key in Exclude<ElementFormatType, ''>]: {
    icon: string;
    iconRTL: string;
    name: string;
  };
} = {
  center: {
    icon: 'center-align',
    iconRTL: 'center-align',
    name: 'Center Align',
  },
  end: {
    icon: 'right-align',
    iconRTL: 'left-align',
    name: 'End Align',
  },
  justify: {
    icon: 'justify-align',
    iconRTL: 'justify-align',
    name: 'Justify Align',
  },
  left: {
    icon: 'left-align',
    iconRTL: 'left-align',
    name: 'Left Align',
  },
  right: {
    icon: 'right-align',
    iconRTL: 'right-align',
    name: 'Right Align',
  },
  start: {
    icon: 'left-align',
    iconRTL: 'right-align',
    name: 'Start Align',
  },
};

function dropDownActiveClass(active: boolean) {
  if (active) {
    return 'active dropdown-item-active';
  } else {
    return '';
  }
}

const HEADING_STYLE_TAG = 'data-heading-style-override';
const HEADING_CLASS_MAP: Partial<Record<HeadingTagType, string>> = {
  h1: 'PlaygroundEditorTheme__h1',
  h2: 'PlaygroundEditorTheme__h2',
  h3: 'PlaygroundEditorTheme__h3',
  h4: 'PlaygroundEditorTheme__h4',
};

type CapturedHeadingStyle = {
  headingTag: HeadingTagType;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  textTransform: string;
};

function captureCurrentHeadingStyle(
  editor: LexicalEditor,
): CapturedHeadingStyle | null {
  let result: CapturedHeadingStyle | null = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const anchorNode = selection.anchor.getNode();
    const topLevel = $findMatchingParent(anchorNode, (e) => {
      const parent = e.getParent();
      return parent !== null && $isRootOrShadowRoot(parent);
    }) ?? anchorNode.getTopLevelElement();
    if (!topLevel || !$isHeadingNode(topLevel)) return;
    const tag = topLevel.getTag() as HeadingTagType;
    if (!(tag in HEADING_CLASS_MAP)) return;
    const domEl = editor.getElementByKey(topLevel.getKey());
    if (!domEl) return;
    const cs = window.getComputedStyle(domEl);
    const inlineStyle = (domEl as HTMLElement).style;
    result = {
      headingTag: tag,
      fontSize: inlineStyle.fontSize || cs.fontSize,
      fontFamily: inlineStyle.fontFamily || cs.fontFamily,
      fontWeight: inlineStyle.fontWeight || cs.fontWeight,
      fontStyle: inlineStyle.fontStyle || cs.fontStyle,
      color: inlineStyle.color || cs.color,
      textTransform: inlineStyle.textTransform || cs.textTransform,
    };
  });
  return result;
}

function applyHeadingStyleOverride(captured: CapturedHeadingStyle) {
  const className = HEADING_CLASS_MAP[captured.headingTag]!;
  const styleId = `heading-style-override-${captured.headingTag}`;
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.setAttribute(HEADING_STYLE_TAG, captured.headingTag);
    document.head.appendChild(styleEl);
  }
  const rules: string[] = [];
  if (captured.fontSize) rules.push(`font-size: ${captured.fontSize}`);
  if (captured.fontFamily) rules.push(`font-family: ${captured.fontFamily}`);
  if (captured.fontWeight) rules.push(`font-weight: ${captured.fontWeight}`);
  if (captured.fontStyle) rules.push(`font-style: ${captured.fontStyle}`);
  if (captured.color) rules.push(`color: ${captured.color}`);
  if (captured.textTransform) rules.push(`text-transform: ${captured.textTransform}`);
  styleEl.textContent = `.${className} { ${rules.join('; ')}; }`;
}

function UpdateHeadingStyleDialog({
  captured,
  onClose,
}: {
  captured: CapturedHeadingStyle;
  onClose: () => void;
}) {
  const headingName = captured.headingTag.toUpperCase();
  const styleLines = [
    captured.fontSize && `Font size: ${captured.fontSize}`,
    captured.fontFamily && `Font family: ${captured.fontFamily}`,
    captured.fontWeight && `Font weight: ${captured.fontWeight}`,
    captured.fontStyle && `Font style: ${captured.fontStyle}`,
    captured.color && `Color: ${captured.color}`,
    captured.textTransform && captured.textTransform !== 'none' && `Text transform: ${captured.textTransform}`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 p-1">
      <p className="text-sm text-muted-foreground">
        This will update the <strong>default style for all {headingName} headings</strong> in
        this document to match the formatting of the currently selected heading.
      </p>
      <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
        {styleLines.map((line) => (
          <div key={line} className="font-mono text-xs">{line}</div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        All existing {headingName} headings that do not have their own inline style overrides
        will visually update immediately. This override is stored per session via an injected
        CSS rule.
      </p>
      <div className="flex justify-end gap-2 pt-1">
        <button
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium border bg-background hover:bg-accent transition-colors"
          onClick={onClose}>
          Cancel
        </button>
        <button
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => {
            applyHeadingStyleOverride(captured);
            onClose();
          }}>
          Apply to All {headingName}
        </button>
      </div>
    </div>
  );
}

/**
 * Dropdown component for selecting block-level formatting (Paragraph, Heading, List, etc.).
 */
function BlockFormatDropDown({
  editor,
  blockType,
  rootType,
  disabled = false,
  showModal,
}: {
  blockType: keyof typeof blockTypeToBlockName;
  rootType: keyof typeof rootTypeToRootName;
  editor: LexicalEditor;
  disabled?: boolean;
  showModal: (title: string, getContent: (onClose: () => void) => JSX.Element) => void;
}): JSX.Element {
  const isHeadingBlock = blockType === 'h1' || blockType === 'h2' || blockType === 'h3' || blockType === 'h4';

  const handleUpdateToMatchStyle = () => {
    const captured = captureCurrentHeadingStyle(editor);
    if (!captured) return;
    showModal(`Update ${captured.headingTag.toUpperCase()} Default Style`, (onClose) => (
      <UpdateHeadingStyleDialog captured={captured} onClose={onClose} />
    ));
  };

  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item block-controls"
      buttonIconClassName={'icon block-type ' + blockType}
      buttonAriaLabel="Formatting options for text style"
      tooltip="Block format">
      <DropDownItem
        className={
          'item wide ' + dropDownActiveClass(blockType === 'paragraph')
        }
        onClick={() => formatParagraph(editor)}>
        <div className="icon-text-container">
          <Icon name="paragraph" />
          <span className="pl-2 text">Normal</span>
        </div>
        <span className="shortcut">{SHORTCUTS.NORMAL}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h1')}
        onClick={() => formatHeading(editor, blockType, 'h1')}>
        <div className="icon-text-container">
          <Icon name="h1" />
          <span className="pl-2 text">Heading 1</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING1}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h2')}
        onClick={() => formatHeading(editor, blockType, 'h2')}>
        <div className="icon-text-container">
          <Icon name="h2" />
          <span className="pl-2 text">Heading 2</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING2}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h3')}
        onClick={() => formatHeading(editor, blockType, 'h3')}>
        <div className="icon-text-container">
          <Icon name="h3" />
          <span className="pl-2 text">Heading 3</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING3}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h4')}
        onClick={() => formatHeading(editor, blockType, 'h4')}>
        <div className="icon-text-container">
          <Icon name="h4" />
          <span className="pl-2 text">Heading 4</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING4}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'number')}
        onClick={() => formatNumberedList(editor, blockType)}>
        <div className="icon-text-container">
          <Icon name="number" />
          <span className="pl-2 text">Number List</span>
        </div>
        <span className="shortcut">{SHORTCUTS.NUMBERED_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'bullet')}
        onClick={() => formatBulletList(editor, blockType)}>
        <div className="icon-text-container">
          <Icon name="bullet" />
          <span className="pl-2 text">Bullet List</span>
        </div>
        <span className="shortcut">{SHORTCUTS.BULLET_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'check')}
        onClick={() => formatCheckList(editor, blockType)}>
        <div className="icon-text-container">
          <Icon name="check" />
          <span className="pl-2 text">Check List</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CHECK_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'quote')}
        onClick={() => formatQuote(editor, blockType)}>
        <div className="icon-text-container">
          <Icon name="quote" />
          <span className="pl-2 text">Quote</span>
        </div>
        <span className="shortcut">{SHORTCUTS.QUOTE}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'code')}
        onClick={() => formatCode(editor, blockType)}>
        <div className="icon-text-container">
          <Icon name="code" />
          <span className="pl-2 text">Code Block</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CODE_BLOCK}</span>
      </DropDownItem>

      <DropDownItem
        onClick={(e) => clearFormatting(editor, isKeyboardInput(e))}
        className="item wide"
        title="Clear text formatting"
        aria-label="Clear all text formatting">
        <div className="icon-text-container">
          <Icon name="clear" />
          <span className="pl-2 text">Clear Format</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CLEAR_FORMATTING}</span>
      </DropDownItem>

      {isHeadingBlock && (
        <>
          <DropDownSeparator />
          <DropDownItem
            onClick={handleUpdateToMatchStyle}
            className="item wide"
            title="Update heading default style to match selected text"
            aria-label="Update heading default style to match selected text">
            <div className="icon-text-container">
              <Icon name={blockType as string} />
              <span className="pl-2 text">Update to Match Style</span>
            </div>
          </DropDownItem>
        </>
      )}
    </DropDown>
  );
}

function Divider(): JSX.Element {
  return <div className="mx-0.5 h-5 w-px bg-border shrink-0" />;
}

/**
 * Dropdown component for selecting font family or font size.
 */
function FontDropDown({
  editor,
  value,
  style,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: string;
  style: string;
  disabled?: boolean;
}): JSX.Element {
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  const buttonAriaLabel =
    style === 'font-family'
      ? 'Formatting options for font family'
      : 'Formatting options for font size';

  // Use searchable dropdown for font-family
  if (style === 'font-family') {
    const fontFamilyItems = FONT_FAMILY_OPTIONS.map(([option, text]) => ({
      value: option,
      label: text,
    }));

    return (
      <SearchableDropDown
        disabled={disabled}
        buttonClassName={'toolbar-item ' + style}
        buttonIconClassName={'icon block-type font-family'}
        buttonAriaLabel={buttonAriaLabel}
        items={fontFamilyItems}
        onSelect={handleClick}
        activeValue={value}
        maxHeight="max-h-[300px]"
        tooltip="Font family"
        placeholder="Search fonts..."
        buttonWidth="w-8"
        dropdownWidth="w-48"
      />
    );
  }

  // Use regular dropdown for font-size
  return (
    <DropDown
      disabled={disabled}
      buttonClassName={'toolbar-item ' + style}
      buttonIconClassName={''}
      buttonAriaLabel={buttonAriaLabel}
      tooltip="Font size">
      {FONT_SIZE_OPTIONS.map(
        ([option, text]) => (
          <DropDownItem
            className={`item ${dropDownActiveClass(value === option)} fontsize-item`}
            onClick={() => handleClick(option)}
            key={option}>
            <span className="text">{text}</span>
          </DropDownItem>
        ),
      )}
    </DropDown>
  );
}

/**
 * Dropdown component for selecting text alignment and indentation.
 */
function ElementFormatDropdown({
  editor,
  value,
  isRTL,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: ElementFormatType;
  isRTL: boolean;
  disabled: boolean;
}) {
  const formatOption = ELEMENT_FORMAT_OPTIONS[value || 'left'];

  return (
    <DropDown
      disabled={disabled}
      buttonIconClassName={`icon ${isRTL ? formatOption.iconRTL : formatOption.icon
        }`}
      buttonClassName="toolbar-item spaced alignment"
      buttonAriaLabel="Formatting options for text alignment"
      tooltip="Text alignment">
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon name="left-align" />
          <span className="pl-2 text">Left Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.LEFT_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon name="center-align" />
          <span className="pl-2 text">Center Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CENTER_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon name="right-align" />
          <span className="pl-2 text">Right Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.RIGHT_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon name="justify-align" />
          <span className="pl-2 text">Justify Align</span>
        </div>
        <span className="shortcut">{SHORTCUTS.JUSTIFY_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'start');
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon
            name={isRTL
              ? ELEMENT_FORMAT_OPTIONS.start.iconRTL
              : ELEMENT_FORMAT_OPTIONS.start.icon
            }
          />
          <span className="pl-2 text">Start Align</span>
        </div>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'end');
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon
            name={isRTL
              ? ELEMENT_FORMAT_OPTIONS.end.iconRTL
              : ELEMENT_FORMAT_OPTIONS.end.icon
            }
          />
          <span className="pl-2 text">End Align</span>
        </div>
      </DropDownItem>
      <DropDownSeparator />
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon name={isRTL ? 'indent' : 'outdent'} />
          <span className="pl-2 text">Outdent</span>
        </div>
        <span className="shortcut">{SHORTCUTS.OUTDENT}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
        }}
        className="item wide">
        <div className="icon-text-container">
          <Icon name={isRTL ? 'outdent' : 'indent'} />
          <span className="pl-2 text">Indent</span>
        </div>
        <span className="shortcut">{SHORTCUTS.INDENT}</span>
      </DropDownItem>
      <DropDownSeparator />
      <div className="item wide px-3 py-1.5 flex items-center justify-between gap-2">
        <div className="icon-text-container">
          <Icon name="paragraph" />
          <span className="pl-2 text">Line Spacing</span>
        </div>
        <LineSpacing editor={editor} disabled={disabled} />
      </div>
    </DropDown>
  );
}

function $findTopLevelElement(node: LexicalNode) {
  let topLevelElement =
    node.getKey() === 'root'
      ? node
      : $findMatchingParent(node, (e) => {
        const parent = e.getParent();
        return parent !== null && $isRootOrShadowRoot(parent);
      });

  if (topLevelElement === null) {
    topLevelElement = node.getTopLevelElementOrThrow();
  }
  return topLevelElement;
}

/**
 * The main Toolbar component that provides editor controls.
 * @param {Object} props - Component props.
 * @param {LexicalEditor} props.editor - The root editor instance.
 * @param {LexicalEditor} props.activeEditor - The currently focused editor instance (may be nested).
 * @param {Dispatch<LexicalEditor>} props.setActiveEditor - Function to update the active editor.
 * @param {Dispatch<boolean>} props.setIsLinkEditMode - Function to toggle link editing mode.
 * @param {JSX.Element} [props.children] - Optional additional toolbar items.
 * @returns {JSX.Element} The rendered toolbar.
 */
export default function ToolbarPlugin({
  editor,
  activeEditor,
  setActiveEditor,
  setIsLinkEditMode,
  children,
}: {
  editor: LexicalEditor;
  activeEditor: LexicalEditor;
  setActiveEditor: Dispatch<LexicalEditor>;
  setIsLinkEditMode: Dispatch<boolean>;
  children?: JSX.Element;
}): JSX.Element {
  const [modal, showModal] = useModal();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const { toolbarState, updateToolbarState } = useToolbarState();
  const { settings, setOption } = useSettings();
  const { isAutoHighlightEnabled, toggleAutoHighlight } = useAutoHighlight();
  const { onInviteClick, onShareClick, documentTitle, documentId } = useEditorCallbacks();

  const dispatchToolbarCommand = <T extends LexicalCommand<unknown>>(
    command: T,
    payload: CommandPayloadType<T> | undefined = undefined,
    skipRefocus: boolean = false,
  ) => {
    activeEditor.update(() => {
      if (skipRefocus) {
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
      }

      // Re-assert on Type so that payload can have a default param
      activeEditor.dispatchCommand(command, payload as CommandPayloadType<T>);
    });
  };

  const dispatchFormatTextCommand = (
    payload: TextFormatType,
    skipRefocus: boolean = false,
  ) => dispatchToolbarCommand(FORMAT_TEXT_COMMAND, payload, skipRefocus);

  const $handleHeadingNode = useCallback(
    (selectedElement: LexicalNode) => {
      const type = $isHeadingNode(selectedElement)
        ? selectedElement.getTag()
        : selectedElement.getType();

      if (type in blockTypeToBlockName) {
        updateToolbarState(
          'blockType',
          type as keyof typeof blockTypeToBlockName,
        );
      }
    },
    [updateToolbarState],
  );

  const $handleCodeNode = useCallback(
    (element: LexicalNode) => {
      if ($isCodeNode(element)) {
        const language = element.getLanguage();
        updateToolbarState('codeLanguage', language || '');
        return;
      }
    },
    [updateToolbarState],
  );

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
        const rootElement = activeEditor.getRootElement();
        updateToolbarState(
          'isImageCaption',
          !!rootElement?.parentElement?.classList.contains(
            'image-caption-container',
          ),
        );
      } else {
        updateToolbarState('isImageCaption', false);
      }

      const anchorNode = selection.anchor.getNode();
      const element = $findTopLevelElement(anchorNode);
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      updateToolbarState('isRTL', $isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(node);
      updateToolbarState('isLink', isLink);

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        updateToolbarState('rootType', 'table');
      } else {
        updateToolbarState('rootType', 'root');
      }

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();

          updateToolbarState('blockType', type);
        } else {
          $handleHeadingNode(element);
          $handleCodeNode(element);
        }
      }

      // Handle buttons
      updateToolbarState(
        'fontColor',
        $getSelectionStyleValueForProperty(selection, 'color', '#000'),
      );
      updateToolbarState(
        'bgColor',
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          '#fff',
        ),
      );
      updateToolbarState(
        'fontFamily',
        $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      );
      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
        );
      }

      // If matchingParent is a valid node, pass it's format type
      updateToolbarState(
        'elementFormat',
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || 'left',
      );
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // Update text format
      updateToolbarState('isBold', selection.hasFormat('bold'));
      updateToolbarState('isItalic', selection.hasFormat('italic'));
      updateToolbarState('isUnderline', selection.hasFormat('underline'));
      updateToolbarState(
        'isStrikethrough',
        selection.hasFormat('strikethrough'),
      );
      updateToolbarState('isSubscript', selection.hasFormat('subscript'));
      updateToolbarState('isSuperscript', selection.hasFormat('superscript'));
      updateToolbarState('isHighlight', selection.hasFormat('highlight'));
      updateToolbarState('isCode', selection.hasFormat('code'));
      updateToolbarState(
        'fontSize',
        $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
      );
      updateToolbarState('isLowercase', selection.hasFormat('lowercase'));
      updateToolbarState('isUppercase', selection.hasFormat('uppercase'));
      updateToolbarState('isCapitalize', selection.hasFormat('capitalize'));
    }
    if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      for (const selectedNode of nodes) {
        const parentList = $getNearestNodeOfType<ListNode>(
          selectedNode,
          ListNode,
        );
        if (parentList) {
          const type = parentList.getListType();
          updateToolbarState('blockType', type);
        } else {
          const selectedElement = $findTopLevelElement(selectedNode);
          $handleHeadingNode(selectedElement);
          $handleCodeNode(selectedElement);
          // Update elementFormat for node selection (e.g., images)
          if ($isElementNode(selectedElement)) {
            updateToolbarState(
              'elementFormat',
              selectedElement.getFormatType(),
            );
          }
        }
      }
    }
  }, [
    activeEditor,
    editor,
    updateToolbarState,
    $handleHeadingNode,
    $handleCodeNode,
  ]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar, setActiveEditor]);

  useEffect(() => {
    activeEditor.getEditorState().read(
      () => {
        $updateToolbar();
      },
      { editor: activeEditor },
    );
  }, [activeEditor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(
          () => {
            $updateToolbar();
          },
          { editor: activeEditor },
        );
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateToolbarState('canUndo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateToolbarState('canRedo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, activeEditor, editor, updateToolbarState]);

  const applyStyleText = useCallback(
    (
      styles: Record<string, string>,
      skipHistoryStack?: boolean,
      skipRefocus: boolean = false,
    ) => {
      activeEditor.update(
        () => {
          if (skipRefocus) {
            $addUpdateTag(SKIP_DOM_SELECTION_TAG);
          }
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        skipHistoryStack ? { tag: HISTORIC_TAG } : {},
      );
    },
    [activeEditor],
  );

  const onFontColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean, skipRefocus: boolean) => {
      applyStyleText({ color: value }, skipHistoryStack, skipRefocus);
    },
    [applyStyleText],
  );

  const onBgColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean, skipRefocus: boolean) => {
      applyStyleText(
        { 'background-color': value },
        skipHistoryStack,
        skipRefocus,
      );
    },
    [applyStyleText],
  );

  const insertLink = useCallback(() => {
    if (!toolbarState.isLink) {
      setIsLinkEditMode(true);
      activeEditor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        sanitizeUrl('https://'),
      );
    } else {
      setIsLinkEditMode(false);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [activeEditor, setIsLinkEditMode, toolbarState.isLink]);

  // openEmojiPicker was removed together with the (already commented-out)
  // emoji toolbar button below — its EmojiPickerDialog never shipped.

  const canViewerSeeInsertDropdown = !toolbarState.isImageCaption;

  const toolbarBtnClass = 'inline-flex items-center justify-center rounded-md h-7 w-7 min-w-[28px] shrink-0 bg-transparent border-0 cursor-pointer text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 p-0';
  const toolbarBtnActiveClass = 'bg-accent/50 text-accent-foreground';

  return (
    <div className="toolbar flex items-center gap-0 flex-nowrap overflow-x-auto scrollbar-thin px-1 py-0.5 border-b border-border bg-card">
      {toolbarState.canUndo && isEditable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) =>
                dispatchToolbarCommand(UNDO_COMMAND, undefined, isKeyboardInput(e))
              }
              type="button"
              className={toolbarBtnClass}
              aria-label="Undo">
              <Icon name="undo" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {IS_APPLE ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
          </TooltipContent>
        </Tooltip>
      )}
      {toolbarState.canRedo && isEditable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) =>
                dispatchToolbarCommand(REDO_COMMAND, undefined, isKeyboardInput(e))
              }
              type="button"
              className={toolbarBtnClass}
              aria-label="Redo">
              <Icon name="redo" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {IS_APPLE ? 'Redo (⇧⌘Z)' : 'Redo (Ctrl+Y)'}
          </TooltipContent>
        </Tooltip>
      )}
      <Divider />
      {toolbarState.blockType in blockTypeToBlockName &&
        activeEditor === editor && (
          <>
            <BlockFormatDropDown
              disabled={!isEditable}
              blockType={toolbarState.blockType}
              rootType={toolbarState.rootType}
              editor={activeEditor}
              showModal={showModal}
            />
          </>
        )}
      {toolbarState.blockType !== 'code' && (
        <>
          <FontDropDown
            disabled={!isEditable}
            style={'font-family'}
            value={toolbarState.fontFamily}
            editor={activeEditor}
          />
          <FontSize
            selectionFontSize={parseFontSizeForToolbar(
              toolbarState.fontSize,
            ).slice(0, -2)}
            editor={activeEditor}
            disabled={!isEditable}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled={!isEditable}
                onClick={(e) =>
                  dispatchFormatTextCommand('bold', isKeyboardInput(e))
                }
                className={cn(toolbarBtnClass, toolbarState.isBold && toolbarBtnActiveClass)}
                type="button"
                aria-label={`Format text as bold. Shortcut: ${SHORTCUTS.BOLD}`}>
                <Icon name="bold" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Bold ({SHORTCUTS.BOLD})</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled={!isEditable}
                onClick={(e) =>
                  dispatchFormatTextCommand('italic', isKeyboardInput(e))
                }
                className={cn(toolbarBtnClass, toolbarState.isItalic && toolbarBtnActiveClass)}
                type="button"
                aria-label={`Format text as italics. Shortcut: ${SHORTCUTS.ITALIC}`}>
                <Icon name="italic" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Italic ({SHORTCUTS.ITALIC})</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled={!isEditable}
                onClick={(e) =>
                  dispatchFormatTextCommand('underline', isKeyboardInput(e))
                }
                className={cn(toolbarBtnClass, toolbarState.isUnderline && toolbarBtnActiveClass)}
                type="button"
                aria-label={`Format text to underlined. Shortcut: ${SHORTCUTS.UNDERLINE}`}>
                <Icon name="underline" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Underline ({SHORTCUTS.UNDERLINE})</TooltipContent>
          </Tooltip>


          <DropdownColorPicker
            disabled={!isEditable}
            buttonClassName="toolbar-item color-picker"
            buttonAriaLabel="Formatting background color"
            buttonIconClassName="icon highlight"
            color={toolbarState.bgColor}
            onChange={onBgColorSelect}
            title="bg color"
            tooltip="Highlight (Ctrl+M)">
            <DropdownMenuItem
              onClick={() => {
                toggleAutoHighlight();
              }}
              className="mb-2">
              <Icon name="highlighter-color" className="mr-2" size={16} />
              <span>Auto-Highlight</span>
              {isAutoHighlightEnabled && <Icon name="check" className="ml-auto" size={16} />}
            </DropdownMenuItem>
          </DropdownColorPicker>

          <DropdownColorPicker
            disabled={!isEditable}
            buttonClassName="toolbar-item color-picker"
            buttonAriaLabel="Formatting text color"
            buttonIconClassName="icon font-color"
            color={toolbarState.fontColor}
            onChange={onFontColorSelect}
            title="text color"
            tooltip="Text color"
          />


          <DropDown
            disabled={!isEditable}
            buttonClassName="toolbar-item spaced"
            buttonLabel=""
            buttonAriaLabel="Formatting options for additional text styles"
            buttonIconClassName="icon dropdown-more"
            tooltip="Format & casing">
            <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('lowercase', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isLowercase)
              }
              title="Lowercase"
              aria-label="Format text to lowercase">
              <div className="icon-text-container">
                <Icon name="lowercase" />
                <span className="pl-2 text">Lowercase</span>
              </div>
              <span className="shortcut">{SHORTCUTS.LOWERCASE}</span>
            </DropDownItem>
            <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('uppercase', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isUppercase)
              }
              title="Uppercase"
              aria-label="Format text to uppercase">
              <div className="icon-text-container">
                <Icon name="uppercase" />
                <span className="pl-2 text">Uppercase</span>
              </div>
              <span className="shortcut">{SHORTCUTS.UPPERCASE}</span>
            </DropDownItem>
            <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('capitalize', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isCapitalize)
              }
              title="Capitalize"
              aria-label="Format text to capitalize">
              <div className="icon-text-container">
                <Icon name="capitalize" />
                <span className="pl-2 text">Capitalize</span>
              </div>
              <span className="shortcut">{SHORTCUTS.CAPITALIZE}</span>
            </DropDownItem>
            <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('strikethrough', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isStrikethrough)
              }
              title="Strikethrough"
              aria-label="Format text with a strikethrough">
              <div className="icon-text-container">
                <Icon name="strikethrough" />
                <span className="pl-2 text">Strikethrough</span>
              </div>
              <span className="shortcut">{SHORTCUTS.STRIKETHROUGH}</span>
            </DropDownItem>
            <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('subscript', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isSubscript)
              }
              title="Subscript"
              aria-label="Format text with a subscript">
              <div className="icon-text-container">
                <Icon name="subscript" />
                <span className="pl-2 text">Subscript</span>
              </div>
              <span className="shortcut">{SHORTCUTS.SUBSCRIPT}</span>
            </DropDownItem>
            <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('superscript', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isSuperscript)
              }
              title="Superscript"
              aria-label="Format text with a superscript">
              <div className="icon-text-container">
                <Icon name="superscript" />
                <span className="pl-2 text">Superscript</span>
              </div>
              <span className="shortcut">{SHORTCUTS.SUPERSCRIPT}</span>
            </DropDownItem>
            <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('code', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isCode)
              }
              title="Inline Code"
              aria-label="Format text as inline code">
              <div className="icon-text-container">
                <Icon name="code" />
                <span className="pl-2 text">Inline Code</span>
              </div>
              <span className="shortcut">{SHORTCUTS.INSERT_CODE_BLOCK}</span>
            </DropDownItem>
            {/* <DropDownItem
              onClick={(e) =>
                dispatchFormatTextCommand('highlight', isKeyboardInput(e))
              }
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isHighlight)
              }
              title="Highlight"
              aria-label="Format text with a highlight">
              <div className="icon-text-container">
                <Icon name="highlight" />
                <span className="text">Highlight</span>
              </div>
            </DropDownItem> */}

          </DropDown>
          <ElementFormatDropdown
            disabled={!isEditable}
            value={toolbarState.elementFormat}
            editor={activeEditor}
            isRTL={toolbarState.isRTL}
          />

          {/* <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled={!isEditable}
                onClick={openEmojiPicker}
                className={toolbarBtnClass}
                aria-label="Insert emoji"
                type="button">
                <Icon name="emoji" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Insert emoji</TooltipContent>
          </Tooltip> */}
          {canViewerSeeInsertDropdown && (
            <>
              <DropDown
                disabled={!isEditable}
                buttonClassName="toolbar-item spaced"
                buttonAriaLabel="Insert specialized editor node"
                buttonIconClassName="icon plus"
                tooltip="Insert">

                <DropDownItem
                  onClick={insertLink}
                  className={cn('item', toolbarState.isLink && 'active')}>
                  <Icon name="link" />
                  <span className="text">Link ({SHORTCUTS.INSERT_LINK})</span>
                </DropDownItem>
                {/* <DropDownItem
                  onClick={() => dispatchToolbarCommand(INSERT_PAGE_BREAK)}
                  className="item">
                  <Icon name="page-break" />
                  <span className="text">Page Break</span>
                </DropDownItem> */}
                <DropDownItem
                  onClick={() => {
                    showModal('Upload Document', (onClose) => (
                      <DocumentUploadDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ));
                  }}
                  className="item">
                  <Icon name="upload" />
                  <span className="text">Upload Document</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    showModal('Insert Image', (onClose) => (
                      <InsertImageDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ));
                  }}
                  className="item">
                  <Icon name="image" />
                  <span className="text">Image</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() =>
                    dispatchToolbarCommand(INSERT_HORIZONTAL_RULE_COMMAND)
                  }
                  className="item">
                  <Icon name="horizontal-rule" />
                  <span className="text">Divider</span>
                </DropDownItem>{/* <DropDownItem
                  onClick={() =>
                    showModal('Insert Image', (onClose) => (
                      <InsertImageDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ))
                  }
                  className="item">
                  <Icon name="gif" />
                  <span className="text">GIF</span>
                </DropDownItem> */}
                <DropDownItem
                  onClick={() => {
                    showModal('Insert Table', (onClose) => (
                      <InsertTableDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ));
                  }}
                  className="item">
                  <Icon name="table" />
                  <span className="text">Table</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    showModal('Insert Poll', (onClose) => (
                      <InsertPollDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ));
                  }}
                  className="item">
                  <Icon name="poll" />
                  <span className="text">Poll</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    showModal('Insert Columns Layout', (onClose) => (
                      <InsertLayoutDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ));
                  }}
                  className="item">
                  <Icon name="columns" />
                  <span className="text">Columns</span>
                </DropDownItem>

                <DropDownItem
                  onClick={() => {
                    editor.update(() => {
                      $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
                      const root = $getRoot();
                      const stickyNode = $createStickyNode(0, 0);
                      root.append(stickyNode);
                    });
                  }}
                  className="item">
                  <Icon name="sticky" />
                  <span className="text">Sticky Note</span>
                </DropDownItem>
                {/* <DropDownItem
                  onClick={() =>
                    dispatchToolbarCommand(INSERT_COLLAPSIBLE_COMMAND)
                  }
                  className="item">
                  <Icon name="caret-right" />
                  <span className="text">Collapsible container</span>
                </DropDownItem> */}
                <DropDownItem
                  onClick={() => {
                    const dateTime = new Date();
                    dateTime.setHours(0, 0, 0, 0);
                    dispatchToolbarCommand(INSERT_DATETIME_COMMAND, { dateTime });
                  }}
                  className="item">
                  <Icon name="calendar" />
                  <span className="text">Date</span>
                </DropDownItem>
                {EmbedConfigs.map((embedConfig) => (
                  <DropDownItem
                    key={embedConfig.type}
                    onClick={() =>
                      dispatchToolbarCommand(
                        INSERT_EMBED_COMMAND,
                        embedConfig.type,
                      )
                    }
                    className="item">
                    {embedConfig.icon}
                    <span className="text">{embedConfig.contentName}</span>
                  </DropDownItem>
                ))}
                {/* <DropDownSeparator /> */}
                <DropDownItem
                  onClick={() =>
                    dispatchToolbarCommand(INSERT_INLINE_COMMAND, undefined)
                  }
                  className="item">
                  <Icon name="add-comment" />
                  <span className="text">Add Comment</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() =>
                    dispatchToolbarCommand(TOGGLE_COMMENTS_PANEL_COMMAND, undefined)
                  }
                  className="item">
                  <Icon name="comments" />
                  <span className="text">Toggle Comments</span>
                </DropDownItem>
              </DropDown>
              <Divider />

              {/* Share Menu */}
              {documentId && (
                <div className="toolbar-item spaced">
                  <InviteDropdown
                    documentTitle={documentTitle || 'Untitled'}
                    documentId={documentId}
                  />
                </div>
              )}


              {/* Clipboard Menu */}
              <DropDown
                disabled={!isEditable}
                buttonClassName="toolbar-item spaced"
                buttonAriaLabel="Clipboard operations"
                buttonIconClassName="icon clipboard"
                tooltip="Clipboard">
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(CUT_COMMAND, null);
                  }}
                  className="item wide">
                  <div className="icon-text-container">
                    <Icon name="scissors" />
                    <span className="pl-2 text">Cut</span>
                  </div>
                  <span className="shortcut">{IS_APPLE ? '⌘X' : 'Ctrl+X'}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(COPY_COMMAND, null);
                  }}
                  className="item wide">
                  <div className="icon-text-container">
                    <Icon name="copy" />
                    <span className="pl-2 text">Copy</span>
                  </div>
                  <span className="shortcut">{IS_APPLE ? '⌘C' : 'Ctrl+C'}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const clipboardEvent = new ClipboardEvent('paste', {
                        clipboardData: new DataTransfer(),
                      });
                      Object.defineProperty(clipboardEvent, 'clipboardData', {
                        value: {
                          getData: () => text,
                          types: ['text/plain'],
                        },
                      });
                      activeEditor.dispatchCommand(PASTE_COMMAND, clipboardEvent);
                    } catch (err) {
                      console.error('Failed to paste:', err);
                    }
                  }}
                  className="item wide">
                  <div className="icon-text-container">
                    <Icon name="clipboard" />
                    <span className="pl-2 text">Paste</span>
                  </div>
                  <span className="shortcut">{IS_APPLE ? '⌘V' : 'Ctrl+V'}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      activeEditor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                          selection.insertText(text);
                        }
                      });
                    } catch (err) {
                      console.error('Failed to paste as plain text:', err);
                    }
                  }}
                  className="item wide">
                  <div className="icon-text-container">
                    <Icon name="clipboard" />
                    <span className="pl-2 text">Paste Plain</span>
                  </div>
                  <span className="shortcut">{IS_APPLE ? '⇧⌘V' : 'Ctrl+Shift+V'}</span>
                </DropDownItem>
                <DropDownSeparator />
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(DELETE_CHARACTER_COMMAND, false);
                  }}
                  className="item wide">
                  <div className="icon-text-container">
                    <Icon name="trash" />
                    <span className="pl-2 text">Delete</span>
                  </div>
                  <span className="shortcut">{IS_APPLE ? '⌫' : 'Del'}</span>
                </DropDownItem>
              </DropDown>

            </>
          )}
        </>
      )}

      {children && (
        <>
          {children}
        </>
      )}
      {modal}
    </div>
  );
}

'use client';

/**
 * A Google Docs-style menu bar for the Plate editor: File, Edit, View, Insert,
 * Format, Tools and Help, laid out after the Docs menus and trimmed to what the
 * plugins in `../plate-editor-config.ts` can actually do. Entries Docs has but
 * this editor cannot back (version history, page setup, comments, citations)
 * are left out rather than shown disabled.
 *
 * Like Docs, once one menu is open, hovering another trigger switches to it.
 * Tools → Spelling and grammar is Harper (`../kits/harper-kit.tsx`), which the
 * menu bar starts on mount.
 *
 * Shortcuts follow Docs too and are listed under Help → Keyboard shortcuts.
 * They are bound on the menu bar's parent element, so they only fire while
 * focus is inside this editor.
 */

import * as React from 'react';

import type { Alignment } from '@platejs/basic-styles';

import { LineHeightPlugin, TextAlignPlugin } from '@platejs/basic-styles/react';
import { indent, outdent } from '@platejs/indent';
import { ListStyleType, toggleList } from '@platejs/list';
import { MarkdownPlugin } from '@platejs/markdown';
import { KEYS } from 'platejs';
import { type PlateEditor, useEditorRef, usePluginOption } from 'platejs/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type HarperDialect,
  HarperPlugin,
  visibleHarperIssues,
} from '@/docs-agent/plate/kits/harper-kit';
import { insertBlock, insertInlineElement, setBlockType } from '@/docs-agent/plate/kits/transforms';
import {
  type CaseMode,
  changeCase,
  CLEARABLE_MARKS,
  countWords,
  documentText,
  downloadDocument,
  findMatches,
  findNext,
  pasteFromClipboard,
  printDocument,
  replaceAll,
  selectionText,
} from '@/docs-agent/plate/menu-actions';
import {
  getTranscribeController,
  isTranscriptionSupported,
} from '@/docs-agent/plate/transcribe-controller';
import { cn } from '@/lib/utils';

import { HarperPanel } from './harper-panel';

export interface MenuBarProps {
  className?: string;
  /** Used for download file names and the printed page title. */
  documentTitle?: string;
  /** Adds File → New document when provided. */
  onNewDocument?: () => void;
  /** View → Show toolbar. The item is hidden when `onShowToolbarChange` is absent. */
  showToolbar?: boolean;
  onShowToolbarChange?: (show: boolean) => void;
}

type MenuId = 'file' | 'edit' | 'view' | 'insert' | 'format' | 'tools' | 'help';
type DialogId = 'wordCount' | 'findReplace' | 'shortcuts' | null;

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Renders a Docs-style shortcut hint: `mod+alt+x` → `⌘⌥X` or `Ctrl+Alt+X`. */
export function formatShortcut(keys: string, mac = isMac): string {
  const parts = keys.split('+');
  if (mac) {
    const symbols: Record<string, string> = { mod: '⌘', alt: '⌥', shift: '⇧', ctrl: '⌃' };
    return parts.map((p) => symbols[p] ?? p.toUpperCase()).join('');
  }
  const names: Record<string, string> = { mod: 'Ctrl', alt: 'Alt', shift: 'Shift', ctrl: 'Ctrl' };
  return parts.map((p) => names[p] ?? p.toUpperCase()).join('+');
}

const DIALECTS: HarperDialect[] = ['American', 'British', 'Australian', 'Canadian', 'Indian'];

const SPECIAL_CHARACTERS = ['—', '–', '…', '•', '©', '®', '™', '°', '±', '×', '÷', '€', '£', '¥', '←', '→', '↑', '↓', '✓', '★'];

const LINE_SPACINGS: { label: string; value: number }[] = [
  { label: 'Single', value: 1 },
  { label: '1.15', value: 1.15 },
  { label: '1.5', value: 1.5 },
  { label: 'Double', value: 2 },
];

const PARAGRAPH_STYLES: { label: string; type: string; className: string }[] = [
  { label: 'Normal text', type: KEYS.p, className: 'text-sm' },
  { label: 'Heading 1', type: KEYS.h1, className: 'text-xl font-semibold' },
  { label: 'Heading 2', type: KEYS.h2, className: 'text-lg font-semibold' },
  { label: 'Heading 3', type: KEYS.h3, className: 'text-base font-semibold' },
  { label: 'Heading 4', type: KEYS.h4, className: 'text-sm font-semibold' },
  { label: 'Heading 5', type: KEYS.h5, className: 'text-sm font-medium' },
  { label: 'Heading 6', type: KEYS.h6, className: 'text-xs font-medium' },
];

/** Shortcut table shared by the key handler and Help → Keyboard shortcuts. */
export const MENU_SHORTCUTS: { keys: string; label: string; code: string; shift?: boolean; alt?: boolean }[] = [
  { keys: 'mod+alt+x', label: 'Spelling and grammar check', code: 'KeyX', alt: true },
  { keys: 'mod+shift+c', label: 'Word count', code: 'KeyC', shift: true },
  { keys: 'mod+h', label: 'Find and replace', code: 'KeyH' },
  { keys: 'mod+\\', label: 'Clear formatting', code: 'Backslash' },
  { keys: 'mod+/', label: 'Keyboard shortcuts', code: 'Slash' },
  { keys: 'mod+alt+0', label: 'Normal text', code: 'Digit0', alt: true },
  { keys: 'mod+alt+1', label: 'Heading 1', code: 'Digit1', alt: true },
  { keys: 'mod+alt+2', label: 'Heading 2', code: 'Digit2', alt: true },
  { keys: 'mod+alt+3', label: 'Heading 3', code: 'Digit3', alt: true },
  { keys: 'mod+shift+7', label: 'Numbered list', code: 'Digit7', shift: true },
  { keys: 'mod+shift+8', label: 'Bulleted list', code: 'Digit8', shift: true },
  { keys: 'mod+shift+l', label: 'Align left', code: 'KeyL', shift: true },
  { keys: 'mod+shift+e', label: 'Align center', code: 'KeyE', shift: true },
  { keys: 'mod+shift+r', label: 'Align right', code: 'KeyR', shift: true },
  { keys: 'mod+shift+j', label: 'Justify', code: 'KeyJ', shift: true },
];

/** Shortcuts the editor's own plugins already handle, listed for reference. */
const EDITOR_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'mod+z', label: 'Undo' },
  { keys: 'mod+shift+z', label: 'Redo' },
  { keys: 'mod+b', label: 'Bold' },
  { keys: 'mod+i', label: 'Italic' },
  { keys: 'mod+u', label: 'Underline' },
  { keys: 'mod+shift+x', label: 'Strikethrough' },
  { keys: 'mod+.', label: 'Superscript' },
  { keys: 'mod+,', label: 'Subscript' },
  { keys: 'mod+e', label: 'Inline code' },
  { keys: 'mod+shift+h', label: 'Highlight' },
];

const triggerClass =
  'rounded px-2 py-0.5 text-sm text-gray-700 outline-none hover:bg-gray-100 focus-visible:bg-gray-100 data-[state=open]:bg-gray-200 dark:text-gray-200 dark:hover:bg-slate-800 dark:data-[state=open]:bg-slate-700';

function toggleMark(editor: PlateEditor, key: string) {
  editor.tf.toggleMark(key);
  editor.tf.focus();
}

function setAlign(editor: PlateEditor, value: Alignment) {
  editor.getTransforms(TextAlignPlugin).textAlign.setNodes(value);
  editor.tf.focus();
}

function setStyle(editor: PlateEditor, type: string) {
  setBlockType(editor, type);
  editor.tf.focus();
}

function list(editor: PlateEditor, listStyleType: string) {
  toggleList(editor, { listStyleType });
  editor.tf.focus();
}

function clearFormatting(editor: PlateEditor) {
  editor.tf.removeMarks(CLEARABLE_MARKS);
  editor.tf.focus();
}

function selectAll(editor: PlateEditor) {
  const start = editor.api.start([]);
  const end = editor.api.end([]);
  if (start && end) editor.tf.select({ anchor: start, focus: end });
  editor.tf.focus();
}

/** Cut and copy go through the browser so Slate's own clipboard handlers run. */
function execClipboard(editor: PlateEditor, command: 'cut' | 'copy') {
  editor.tf.focus();
  document.execCommand(command);
}

/**
 * Submenus are portalled: the top-level menu clips its overflow, which would
 * otherwise hide a submenu that opens beside it.
 */
function SubMenuContent(props: React.ComponentProps<typeof DropdownMenuSubContent>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuSubContent {...props} />
    </DropdownMenuPortal>
  );
}

function Shortcut({ keys }: { keys: string }) {
  return <DropdownMenuShortcut>{formatShortcut(keys)}</DropdownMenuShortcut>;
}

export function MenuBar({
  className,
  documentTitle,
  onNewDocument,
  showToolbar,
  onShowToolbarChange,
}: MenuBarProps) {
  const editor = useEditorRef();
  const harper = editor.getApi(HarperPlugin).harper;

  const [openMenu, setOpenMenu] = React.useState<MenuId | null>(null);
  const [dialog, setDialog] = React.useState<DialogId>(null);
  const [fullscreen, setFullscreen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const harperEnabled = usePluginOption(HarperPlugin, 'enabled');
  const showSpelling = usePluginOption(HarperPlugin, 'showSpelling');
  const showGrammar = usePluginOption(HarperPlugin, 'showGrammar');
  const dialect = usePluginOption(HarperPlugin, 'dialect');
  const harperStatus = usePluginOption(HarperPlugin, 'status');
  const harperIssues = usePluginOption(HarperPlugin, 'issues');
  const harperIgnored = usePluginOption(HarperPlugin, 'ignored');

  const issueCount = React.useMemo(
    () =>
      visibleHarperIssues({
        enabled: harperEnabled,
        ignored: harperIgnored,
        issues: harperIssues,
        showGrammar,
        showSpelling,
      }).length,
    [harperEnabled, harperIgnored, harperIssues, showGrammar, showSpelling],
  );

  const transcribe = React.useMemo(() => getTranscribeController(editor), [editor]);
  const listening = React.useSyncExternalStore(
    transcribe.subscribe,
    () => transcribe.getState().listening,
    () => false,
  );

  // Proofreading starts with the menu bar, so a bare editor never loads Harper.
  React.useEffect(() => {
    harper.start();
  }, [harper]);

  React.useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    const host = rootRef.current?.parentElement;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void host?.requestFullscreen?.();
  }, []);

  const runShortcut = React.useCallback(
    (code: string) => {
      switch (code) {
        case 'KeyX': harper.openPanel(); break;
        case 'KeyC': setDialog('wordCount'); break;
        case 'KeyH': setDialog('findReplace'); break;
        case 'Backslash': clearFormatting(editor); break;
        case 'Slash': setDialog('shortcuts'); break;
        case 'Digit0': setStyle(editor, KEYS.p); break;
        case 'Digit1': setStyle(editor, KEYS.h1); break;
        case 'Digit2': setStyle(editor, KEYS.h2); break;
        case 'Digit3': setStyle(editor, KEYS.h3); break;
        case 'Digit7': list(editor, ListStyleType.Decimal); break;
        case 'Digit8': list(editor, ListStyleType.Disc); break;
        case 'KeyL': setAlign(editor, 'left'); break;
        case 'KeyE': setAlign(editor, 'center'); break;
        case 'KeyR': setAlign(editor, 'right'); break;
        case 'KeyJ': setAlign(editor, 'justify'); break;
      }
    },
    [editor, harper],
  );

  React.useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (!host) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(isMac ? event.metaKey : event.ctrlKey)) return;
      const match = MENU_SHORTCUTS.find(
        (s) => s.code === event.code && !!s.shift === event.shiftKey && !!s.alt === event.altKey,
      );
      if (!match) return;
      event.preventDefault();
      event.stopPropagation();
      runShortcut(match.code);
    };

    host.addEventListener('keydown', onKeyDown, true);
    return () => host.removeEventListener('keydown', onKeyDown, true);
  }, [runShortcut]);

  const onImportFile = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const nodes = editor.getApi(MarkdownPlugin).markdown.deserialize(await file.text());
      editor.tf.insertNodes(nodes, { at: [editor.children.length] });
      editor.tf.focus();
    },
    [editor],
  );

  /** One Docs-style top-level menu, wired for hover-to-switch. */
  const menu = (id: MenuId, label: string, children: React.ReactNode) => (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => setOpenMenu(open ? id : null)}
      open={openMenu === id}
    >
      <DropdownMenuTrigger
        className={triggerClass}
        onPointerEnter={() => {
          if (openMenu && openMenu !== id) setOpenMenu(id);
        }}
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[240px]"
        // Keep focus where the action put it (usually the editor), not on the trigger.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const markItem = (key: string, label: string, keys?: string) => (
    <DropdownMenuItem onSelect={() => toggleMark(editor, key)}>
      {label}
      {keys && <Shortcut keys={keys} />}
    </DropdownMenuItem>
  );

  return (
    <div
      className={cn(
        'relative flex w-full flex-wrap items-center gap-0.5 border-b border-b-gray-200 bg-background px-2 py-0.5 select-none dark:border-b-slate-700',
        className,
      )}
      data-reason-menubar=""
      ref={rootRef}
      role="menubar"
    >
      <input
        accept=".md,.markdown,.mdx,text/markdown"
        className="hidden"
        onChange={(event) => void onImportFile(event)}
        ref={fileInputRef}
        type="file"
      />

      {menu('file', 'File', (
        <>
          {onNewDocument && (
            <DropdownMenuItem onSelect={() => onNewDocument()}>New document</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            Open Markdown file…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Download</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[220px]">
              <DropdownMenuItem onSelect={() => void downloadDocument(editor, 'md', documentTitle)}>
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void downloadDocument(editor, 'html', documentTitle)}>
                Web page (.html)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void downloadDocument(editor, 'txt', documentTitle)}>
                Plain text (.txt)
              </DropdownMenuItem>
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onSelect={() =>
              void navigator.clipboard?.writeText(editor.getApi(MarkdownPlugin).markdown.serialize())
            }
          >
            Copy as Markdown
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void printDocument(editor, documentTitle)}>
            Print
            <Shortcut keys="mod+p" />
          </DropdownMenuItem>
        </>
      ))}

      {menu('edit', 'Edit', (
        <>
          <DropdownMenuItem onSelect={() => { editor.undo(); editor.tf.focus(); }}>
            Undo
            <Shortcut keys="mod+z" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { editor.redo(); editor.tf.focus(); }}>
            Redo
            <Shortcut keys="mod+shift+z" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => execClipboard(editor, 'cut')}>
            Cut
            <Shortcut keys="mod+x" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => execClipboard(editor, 'copy')}>
            Copy
            <Shortcut keys="mod+c" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void pasteFromClipboard(editor)}>
            Paste
            <Shortcut keys="mod+v" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void pasteFromClipboard(editor, true)}>
            Paste without formatting
            <Shortcut keys="mod+shift+v" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => selectAll(editor)}>
            Select all
            <Shortcut keys="mod+a" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { editor.tf.deleteFragment(); editor.tf.focus(); }}>
            Delete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog('findReplace')}>
            Find and replace
            <Shortcut keys="mod+h" />
          </DropdownMenuItem>
        </>
      ))}

      {menu('view', 'View', (
        <>
          {onShowToolbarChange && (
            <DropdownMenuCheckboxItem
              checked={showToolbar ?? true}
              onCheckedChange={(checked) => onShowToolbarChange(checked === true)}
            >
              Show toolbar
            </DropdownMenuCheckboxItem>
          )}
          <DropdownMenuCheckboxItem
            checked={harperEnabled && showSpelling}
            onCheckedChange={(checked) => harper.setShow('spelling', checked === true)}
          >
            Show spelling suggestions
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={harperEnabled && showGrammar}
            onCheckedChange={(checked) => harper.setShow('grammar', checked === true)}
          >
            Show grammar suggestions
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={fullscreen} onCheckedChange={toggleFullscreen}>
            Full screen
          </DropdownMenuCheckboxItem>
        </>
      ))}

      {menu('insert', 'Insert', (
        <>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Image &amp; media</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[180px]">
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.img)}>Image</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.video)}>Video</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.audio)}>Audio</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.file)}>File</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.mediaEmbed)}>Embed</DropdownMenuItem>
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.table)}>Table</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.hr)}>Horizontal line</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => insertInlineElement(editor, KEYS.link)}>
            Link
            <Shortcut keys="mod+k" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.equation)}>Equation</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => insertInlineElement(editor, KEYS.inlineEquation)}>
            Inline equation
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Special characters</DropdownMenuSubTrigger>
            <SubMenuContent className="grid w-[220px] grid-cols-5 gap-0.5">
              {SPECIAL_CHARACTERS.map((char) => (
                <DropdownMenuItem
                  className="justify-center text-base"
                  key={char}
                  onSelect={() => { editor.tf.insertText(char); editor.tf.focus(); }}
                >
                  {char}
                </DropdownMenuItem>
              ))}
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onSelect={() => {
              editor.tf.insertText(new Date().toLocaleDateString(undefined, { dateStyle: 'medium' }));
              editor.tf.focus();
            }}
          >
            Today&apos;s date
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Building blocks</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[180px]">
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.callout)}>Callout</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.blockquote)}>Quote</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.codeBlock)}>Code block</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.toggle)}>Toggle list</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => insertBlock(editor, 'action_three_columns')}>
                3 columns
              </DropdownMenuItem>
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => insertBlock(editor, KEYS.toc)}>Table of contents</DropdownMenuItem>
        </>
      ))}

      {menu('format', 'Format', (
        <>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Text</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[220px]">
              {markItem(KEYS.bold, 'Bold', 'mod+b')}
              {markItem(KEYS.italic, 'Italic', 'mod+i')}
              {markItem(KEYS.underline, 'Underline', 'mod+u')}
              {markItem(KEYS.strikethrough, 'Strikethrough', 'mod+shift+x')}
              {markItem(KEYS.sup, 'Superscript', 'mod+.')}
              {markItem(KEYS.sub, 'Subscript', 'mod+,')}
              {markItem(KEYS.code, 'Code', 'mod+e')}
              {markItem(KEYS.highlight, 'Highlight', 'mod+shift+h')}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Capitalization</DropdownMenuSubTrigger>
                <SubMenuContent>
                  {(
                    [
                      ['lower', 'lowercase'],
                      ['upper', 'UPPERCASE'],
                      ['title', 'Title Case'],
                    ] as [CaseMode, string][]
                  ).map(([mode, label]) => (
                    <DropdownMenuItem
                      key={mode}
                      onSelect={() => { changeCase(editor, mode); editor.tf.focus(); }}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </SubMenuContent>
              </DropdownMenuSub>
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Paragraph styles</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[220px]">
              {PARAGRAPH_STYLES.map((style, i) => (
                <DropdownMenuItem key={style.type} onSelect={() => setStyle(editor, style.type)}>
                  <span className={style.className}>{style.label}</span>
                  {i < 4 && <Shortcut keys={`mod+alt+${i}`} />}
                </DropdownMenuItem>
              ))}
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Align &amp; indent</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[220px]">
              <DropdownMenuItem onSelect={() => setAlign(editor, 'left')}>
                Left<Shortcut keys="mod+shift+l" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAlign(editor, 'center')}>
                Center<Shortcut keys="mod+shift+e" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAlign(editor, 'right')}>
                Right<Shortcut keys="mod+shift+r" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAlign(editor, 'justify')}>
                Justified<Shortcut keys="mod+shift+j" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { indent(editor); editor.tf.focus(); }}>
                Increase indent
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { outdent(editor); editor.tf.focus(); }}>
                Decrease indent
              </DropdownMenuItem>
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Line &amp; paragraph spacing</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[180px]">
              {LINE_SPACINGS.map(({ label, value }) => (
                <DropdownMenuItem
                  key={value}
                  onSelect={() => {
                    editor.getTransforms(LineHeightPlugin).lineHeight.setNodes(value);
                    editor.tf.focus();
                  }}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Bullets &amp; numbering</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[220px]">
              <DropdownMenuItem onSelect={() => list(editor, ListStyleType.Disc)}>
                Bulleted list<Shortcut keys="mod+shift+8" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => list(editor, ListStyleType.Decimal)}>
                Numbered list<Shortcut keys="mod+shift+7" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => list(editor, KEYS.listTodo)}>Checklist</DropdownMenuItem>
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => clearFormatting(editor)}>
            Clear formatting
            <Shortcut keys="mod+\" />
          </DropdownMenuItem>
        </>
      ))}

      {menu('tools', 'Tools', (
        <>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Spelling and grammar</DropdownMenuSubTrigger>
            <SubMenuContent className="min-w-[260px]">
              <DropdownMenuItem onSelect={() => harper.openPanel()}>
                Spelling and grammar check
                <Shortcut keys="mod+alt+x" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={harperEnabled}
                onCheckedChange={(checked) => harper.setEnabled(checked === true)}
              >
                Check spelling and grammar
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={harperEnabled && showSpelling}
                disabled={!harperEnabled}
                onCheckedChange={(checked) => harper.setShow('spelling', checked === true)}
              >
                Show spelling suggestions
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={harperEnabled && showGrammar}
                disabled={!harperEnabled}
                onCheckedChange={(checked) => harper.setShow('grammar', checked === true)}
              >
                Show grammar suggestions
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>English dialect</DropdownMenuSubTrigger>
                <SubMenuContent>
                  <DropdownMenuRadioGroup
                    onValueChange={(value) => harper.setDialect(value as HarperDialect)}
                    value={dialect}
                  >
                    {DIALECTS.map((d) => (
                      <DropdownMenuRadioItem key={d} value={d}>
                        {d}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </SubMenuContent>
              </DropdownMenuSub>
            </SubMenuContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => setDialog('wordCount')}>
            Word count
            <Shortcut keys="mod+shift+c" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={listening}
            disabled={!isTranscriptionSupported()}
            onCheckedChange={() => transcribe.toggle()}
          >
            Voice typing
            <Shortcut keys="ctrl+shift+d" />
          </DropdownMenuCheckboxItem>
        </>
      ))}

      {menu('help', 'Help', (
        <>
          <DropdownMenuItem onSelect={() => setDialog('shortcuts')}>
            Keyboard shortcuts
            <Shortcut keys="mod+/" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => window.open('https://writewithharper.com', '_blank', 'noopener')}
          >
            About the Harper grammar checker
          </DropdownMenuItem>
        </>
      ))}

      <button
        className="ml-auto rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
        onClick={() => harper.openPanel()}
        title="Spelling and grammar check"
        type="button"
      >
        {!harperEnabled
          ? 'Proofing off'
          : harperStatus === 'loading'
            ? 'Loading Harper…'
            : harperStatus === 'error'
              ? 'Proofing unavailable'
              : issueCount === 0
                ? 'No issues'
                : `${issueCount} suggestion${issueCount === 1 ? '' : 's'}`}
      </button>

      <HarperPanel className="top-full mt-2" />

      <WordCountDialog onOpenChange={(open) => setDialog(open ? 'wordCount' : null)} open={dialog === 'wordCount'} />
      <FindReplaceDialog onOpenChange={(open) => setDialog(open ? 'findReplace' : null)} open={dialog === 'findReplace'} />
      <ShortcutsDialog onOpenChange={(open) => setDialog(open ? 'shortcuts' : null)} open={dialog === 'shortcuts'} />
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WordCountDialog({ open, onOpenChange }: DialogProps) {
  const editor = useEditorRef();
  if (!open) return null;

  const selected = selectionText(editor);
  const counts = countWords(selected || documentText(editor));

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Word count</DialogTitle>
          <DialogDescription>{selected ? 'Selected text' : 'Whole document'}</DialogDescription>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody>
            {(
              [
                ['Words', counts.words],
                ['Characters', counts.characters],
                ['Characters excluding spaces', counts.charactersExcludingSpaces],
              ] as const
            ).map(([label, value]) => (
              <tr className="border-b border-gray-100 last:border-0 dark:border-slate-800" key={label}>
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right tabular-nums">{value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}

function FindReplaceDialog({ open, onOpenChange }: DialogProps) {
  const editor = useEditorRef();
  const [query, setQuery] = React.useState('');
  const [replacement, setReplacement] = React.useState('');
  const [matchCase, setMatchCase] = React.useState(false);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setQuery((q) => selectionText(editor) || q);
      setMessage('');
    }
  }, [editor, open]);

  if (!open) return null;

  const count = findMatches(editor, query, matchCase).length;
  const inputClass =
    'w-full rounded border border-gray-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-slate-600';

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Find and replace</DialogTitle>
          <DialogDescription>
            {query ? `${count} match${count === 1 ? '' : 'es'}` : 'Search the document'}
            {message && ` · ${message}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span>Find</span>
            <input
              autoFocus
              className={inputClass}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  findNext(editor, query, matchCase);
                }
              }}
              value={query}
            />
          </label>
          <label className="block space-y-1">
            <span>Replace with</span>
            <input
              className={inputClass}
              onChange={(event) => setReplacement(event.target.value)}
              value={replacement}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              checked={matchCase}
              onChange={(event) => setMatchCase(event.target.checked)}
              type="checkbox"
            />
            Match case
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button
            disabled={!query || count === 0}
            onClick={() => findNext(editor, query, matchCase)}
            variant="outline"
          >
            Next
          </Button>
          <Button
            disabled={!query || count === 0}
            onClick={() => {
              const replaced = replaceAll(editor, query, replacement, matchCase);
              setMessage(`replaced ${replaced}`);
            }}
          >
            Replace all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutsDialog({ open, onOpenChange }: DialogProps) {
  if (!open) return null;

  const rows = [...EDITOR_SHORTCUTS, ...MENU_SHORTCUTS];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(({ keys, label }) => (
              <tr className="border-b border-gray-100 last:border-0 dark:border-slate-800" key={keys}>
                <td className="py-1">{label}</td>
                <td className="py-1 text-right font-mono text-xs text-gray-500">{formatShortcut(keys)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Central registry describing every toggleable editor plugin (extension). Each
 * entry carries the metadata the Settings UI renders (label, description,
 * category, whether it ships in the default set) plus an optional settings
 * schema and a `create()` factory that builds the underlying Tiptap
 * extension(s) from the resolved settings. This is the single source of truth
 * that both `buildExtensions` (runtime) and the Settings modal (UI) read from,
 * so adding a plugin here makes it appear in the config JSON, the pill box, and
 * the discovery list automatically.
 */

import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml';
import { createLowlight } from 'lowlight';

import { Attachment } from 'react-reason-editor/attachment';
import { Blockquote } from 'react-reason-editor/blockquote';
import { Bold } from 'react-reason-editor/bold';
import { BulletList } from 'react-reason-editor/bulletlist';
import { Callout } from 'react-reason-editor/callout';
import { Clear } from 'react-reason-editor/clear';
import { Code } from 'react-reason-editor/code';
import { CodeBlock } from 'react-reason-editor/codeblock';
import { CodeView } from 'react-reason-editor/codeview';
import { Color } from 'react-reason-editor/color';
import { Column, ColumnNode, MultipleColumnNode } from 'react-reason-editor/column';
import { Drawer } from 'react-reason-editor/drawer';
import { Emoji } from 'react-reason-editor/emoji';
import { ExportPdf } from 'react-reason-editor/exportpdf';
import { ExportWord } from 'react-reason-editor/exportword';
import { FontFamily } from 'react-reason-editor/fontfamily';
import { FontSize } from 'react-reason-editor/fontsize';
import { Heading } from 'react-reason-editor/heading';
import { Highlight } from 'react-reason-editor/highlight';
import { History } from 'react-reason-editor/history';
import { HorizontalRule } from 'react-reason-editor/horizontalrule';
import { Iframe } from 'react-reason-editor/iframe';
import { Image } from 'react-reason-editor/image';
import { ImageGif } from 'react-reason-editor/imagegif';
import { ImportWord } from 'react-reason-editor/importword';
import { Indent } from 'react-reason-editor/indent';
import { Italic } from 'react-reason-editor/italic';
import { Katex } from 'react-reason-editor/katex';
import { LineHeight } from 'react-reason-editor/lineheight';
import { Link } from 'react-reason-editor/link';
import { MarkdownPaste } from 'react-reason-editor/markdownpaste';
import { Mention } from 'react-reason-editor/mention';
import { Mermaid } from 'react-reason-editor/mermaid';
import { MoreMark } from 'react-reason-editor/moremark';
import { OrderedList } from 'react-reason-editor/orderedlist';
import { SearchAndReplace } from 'react-reason-editor/searchandreplace';
import { SlashCommand } from 'react-reason-editor/slashcommand';
import { Strike } from 'react-reason-editor/strike';
import { Table } from 'react-reason-editor/table';
import { TaskList } from 'react-reason-editor/tasklist';
import { TextAlign } from 'react-reason-editor/textalign';
import { TextDirection } from 'react-reason-editor/textdirection';
import { TextUnderline } from 'react-reason-editor/textunderline';
import { Twitter } from 'react-reason-editor/twitter';
import { Video } from 'react-reason-editor/video';
import { WordCount } from 'react-reason-editor/wordcount';

import { Comment } from '@/extensions/Comment';
import { Drawio } from '@/extensions/Drawio';
import { Harper } from '@/extensions/Harper';
import { OfficePaste } from '@/extensions/OfficePaste';
import { Pagination } from '@/extensions/Pagination';

import { EMOJI_LIST } from '../emojis';
import { convertBase64ToBlob, MOCK_USERS } from '../components/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettingFieldType = 'text' | 'number' | 'boolean' | 'color';

export interface SettingField {
  /** key stored under the plugin's `settings` object in the config JSON */
  key: string;
  label: string;
  type: SettingFieldType;
  default: string | number | boolean;
  placeholder?: string;
  /** optional hint rendered under the field */
  help?: string;
}

export interface PluginDefinition {
  /** stable key used in the config JSON and everywhere in the UI */
  key: string;
  /** human-readable name shown on the pill / discovery list */
  label: string;
  description: string;
  category: string;
  /** whether the plugin is part of the default (out-of-the-box) set */
  defaultEnabled: boolean;
  /** schema whose fields generate the plugin's settings form once enabled */
  settings?: SettingField[];
  /**
   * Builds the Tiptap extension(s). Receives the resolved settings values
   * (defaults merged with any user overrides). May return a single extension
   * or an array; the result is flattened by `buildExtensions`.
   */
  create: (settings: Record<string, any>) => any;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

// A lowlight instance shared by the code-block plugin, with a handful of
// common languages registered for syntax highlighting.
const lowlight = createLowlight();
lowlight.register('html', html);
lowlight.register('css', css);
lowlight.register('js', js);
lowlight.register('ts', ts);

// Demo upload handler shared by media plugins — turns a File into an object URL
// (image/video) or a base64-backed blob URL (attachment/mermaid/drawer).
const demoObjectUrlUpload = (file: File) =>
  new Promise<string>((resolve) => {
    setTimeout(() => resolve(URL.createObjectURL(file)), 300);
  });

const demoBase64Upload = (file: File) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      const blob = convertBase64ToBlob(reader.result as string);
      resolve(URL.createObjectURL(blob));
    }, 300);
  });
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const PLUGIN_REGISTRY: PluginDefinition[] = [
  // ── History & editing ──
  {
    key: 'history',
    label: 'History',
    description: 'Undo and redo support.',
    category: 'Editing',
    defaultEnabled: true,
    create: () => History,
  },
  {
    key: 'searchAndReplace',
    label: 'Find & Replace',
    description: 'Search the document and replace matches.',
    category: 'Editing',
    defaultEnabled: true,
    create: () => SearchAndReplace,
  },
  {
    key: 'wordCount',
    label: 'Word Count',
    description: 'Live word and character counter.',
    category: 'Editing',
    defaultEnabled: true,
    create: () => WordCount,
  },
  {
    key: 'clear',
    label: 'Clear Formatting',
    description: 'Strip inline marks and block formatting.',
    category: 'Editing',
    defaultEnabled: true,
    create: () => Clear,
  },

  // ── Text formatting ──
  {
    key: 'fontFamily',
    label: 'Font Family',
    description: 'Change the typeface of selected text.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => FontFamily,
  },
  {
    key: 'heading',
    label: 'Headings',
    description: 'H1–H6 block headings.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => Heading,
  },
  {
    key: 'fontSize',
    label: 'Font Size',
    description: 'Set an explicit font size.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => FontSize,
  },
  {
    key: 'bold',
    label: 'Bold',
    description: 'Bold inline text.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => Bold,
  },
  {
    key: 'italic',
    label: 'Italic',
    description: 'Italic inline text.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => Italic,
  },
  {
    key: 'underline',
    label: 'Underline',
    description: 'Underline inline text.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => TextUnderline,
  },
  {
    key: 'strike',
    label: 'Strikethrough',
    description: 'Strike through inline text.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => Strike,
  },
  {
    key: 'moreMark',
    label: 'Sub / Superscript',
    description: 'Subscript and superscript marks.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => MoreMark,
  },
  {
    key: 'color',
    label: 'Text Color',
    description: 'Apply foreground colors to text.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => Color,
  },
  {
    key: 'highlight',
    label: 'Highlight',
    description: 'Highlight text with background colors.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => Highlight,
  },
  {
    key: 'code',
    label: 'Inline Code',
    description: 'Monospace inline code marks.',
    category: 'Formatting',
    defaultEnabled: true,
    create: () => Code,
  },

  // ── Blocks & layout ──
  {
    key: 'bulletList',
    label: 'Bullet List',
    description: 'Unordered lists.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => BulletList,
  },
  {
    key: 'orderedList',
    label: 'Ordered List',
    description: 'Numbered lists.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => OrderedList,
  },
  {
    key: 'taskList',
    label: 'Task List',
    description: 'Checkbox to-do lists.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => TaskList,
  },
  {
    key: 'textAlign',
    label: 'Text Align',
    description: 'Left / center / right / justify alignment.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => TextAlign,
  },
  {
    key: 'indent',
    label: 'Indent',
    description: 'Indent and outdent blocks.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => Indent,
  },
  {
    key: 'lineHeight',
    label: 'Line Height',
    description: 'Adjust line spacing.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => LineHeight,
  },
  {
    key: 'blockquote',
    label: 'Blockquote',
    description: 'Quoted block passages.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => Blockquote,
  },
  {
    key: 'horizontalRule',
    label: 'Divider',
    description: 'Horizontal rule / divider.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => HorizontalRule,
  },
  {
    key: 'codeBlock',
    label: 'Code Block',
    description: 'Fenced code blocks with syntax highlighting.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => CodeBlock.configure({ lowlight }),
  },
  {
    key: 'columns',
    label: 'Columns',
    description: 'Multi-column layouts.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => [Column, ColumnNode, MultipleColumnNode],
  },
  {
    key: 'table',
    label: 'Table',
    description: 'Insert and edit tables.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => Table,
  },
  {
    key: 'callout',
    label: 'Callout',
    description: 'Info / warning / success callout boxes.',
    category: 'Blocks',
    defaultEnabled: true,
    create: () => Callout,
  },

  // ── Media & embeds ──
  {
    key: 'link',
    label: 'Link',
    description: 'Hyperlinks with an edit popover.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Link,
  },
  {
    key: 'image',
    label: 'Image',
    description: 'Upload and resize images.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Image.configure({ upload: demoObjectUrlUpload }),
  },
  {
    key: 'video',
    label: 'Video',
    description: 'Embed and upload videos.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Video.configure({ upload: demoObjectUrlUpload }),
  },
  {
    key: 'imageGif',
    label: 'GIF / Meme',
    description: 'Search and insert GIFs from a provider.',
    category: 'Media',
    defaultEnabled: true,
    settings: [
      { key: 'provider', label: 'Provider', type: 'text', default: 'giphy', placeholder: 'giphy' },
      {
        key: 'apiKey',
        label: 'API key',
        type: 'text',
        default: (import.meta.env.VITE_GIPHY_API_KEY as string) || '',
        placeholder: 'Your provider API key',
        help: 'Required for live GIF search.',
      },
    ],
    create: (s) => ImageGif.configure({ provider: s.provider, API_KEY: s.apiKey }),
  },
  {
    key: 'attachment',
    label: 'Attachment',
    description: 'Attach arbitrary files.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Attachment.configure({ upload: demoBase64Upload }),
  },
  {
    key: 'katex',
    label: 'Math (KaTeX)',
    description: 'Render LaTeX math equations.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Katex,
  },
  {
    key: 'mermaid',
    label: 'Flowchart (Mermaid)',
    description: 'Render Mermaid diagrams.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Mermaid.configure({ upload: demoBase64Upload }),
  },
  {
    key: 'drawer',
    label: 'Drawing',
    description: 'Freehand sketch canvas.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Drawer.configure({ upload: demoBase64Upload }),
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    description: 'Embed tweets.',
    category: 'Media',
    defaultEnabled: true,
    create: () => Twitter,
  },
  {
    key: 'emoji',
    label: 'Emoji',
    description: 'Inline emoji picker with `:` suggestions.',
    category: 'Media',
    defaultEnabled: true,
    create: () =>
      Emoji.configure({
        suggestion: {
          items: async ({ query }: any) => {
            const q = query?.toLowerCase();
            return EMOJI_LIST.filter(({ name }) => name.toLowerCase().includes(q));
          },
        },
      }),
  },
  {
    key: 'mention',
    label: 'Mentions',
    description: '@-mention people with suggestions.',
    category: 'Media',
    defaultEnabled: true,
    settings: [
      { key: 'char', label: 'Trigger character', type: 'text', default: '@', placeholder: '@' },
    ],
    create: (s) =>
      Mention.configure({
        suggestion: {
          char: s.char || '@',
          items: async ({ query }: any) =>
            MOCK_USERS.filter((item) =>
              item.label.toLowerCase().startsWith(query.toLowerCase())
            ),
        },
      }),
  },

  // ── Tools & IO ──
  {
    key: 'slashCommand',
    label: 'Slash Commands',
    description: 'Type `/` for a command menu.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => SlashCommand,
  },
  {
    key: 'codeView',
    label: 'View Source',
    description: 'Toggle raw HTML source view.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => CodeView,
  },
  {
    key: 'textDirection',
    label: 'Text Direction',
    description: 'LTR / RTL text direction.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => TextDirection,
  },
  {
    key: 'markdownPaste',
    label: 'Markdown Paste',
    description: 'Auto-convert pasted Markdown.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => MarkdownPaste,
  },
  {
    key: 'officePaste',
    label: 'Office Paste',
    description: 'Clean up content pasted from Word / Office.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => OfficePaste,
  },
  {
    key: 'importWord',
    label: 'Import Word',
    description: 'Import .docx documents.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => ImportWord,
  },
  {
    key: 'exportWord',
    label: 'Export Word',
    description: 'Export to .docx.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => ExportWord,
  },
  {
    key: 'exportPdf',
    label: 'Export PDF',
    description: 'Export to PDF.',
    category: 'Tools',
    defaultEnabled: true,
    create: () => ExportPdf,
  },
  {
    key: 'pagination',
    label: 'Pagination',
    description: 'Paginated page view with headers and margins.',
    category: 'Tools',
    // Off by default: the editor opens in the continuous "web" layout. Users
    // can switch to the paginated page view from the Tools / page menu.
    defaultEnabled: false,
    settings: [
      { key: 'pageWidth', label: 'Page width (px)', type: 'number', default: 816 },
      { key: 'pageHeight', label: 'Page height (px)', type: 'number', default: 1056 },
      { key: 'marginTop', label: 'Margin top (px)', type: 'number', default: 48 },
      { key: 'marginBottom', label: 'Margin bottom (px)', type: 'number', default: 48 },
      { key: 'marginLeft', label: 'Margin left (px)', type: 'number', default: 72 },
      { key: 'marginRight', label: 'Margin right (px)', type: 'number', default: 72 },
      { key: 'headerRight', label: 'Header (right)', type: 'text', default: 'Page {page}', placeholder: 'Page {page}' },
      { key: 'footerRight', label: 'Footer (right)', type: 'text', default: '', placeholder: 'Footer text' },
    ],
    create: (s) =>
      Pagination.configure({
        pageHeight: s.pageHeight,
        pageWidth: s.pageWidth,
        pageGap: 50,
        pageGapBorderSize: 1,
        pageGapBorderColor: '#e5e5e5',
        pageBreakBackground: '#ffffff',
        marginTop: s.marginTop,
        marginBottom: s.marginBottom,
        marginLeft: s.marginLeft,
        marginRight: s.marginRight,
        contentMarginTop: 10,
        contentMarginBottom: 10,
        headerLeft: '',
        headerRight: s.headerRight,
        footerLeft: '',
        footerRight: s.footerRight,
      }),
  },

  // ── Collaboration & proofing (advanced — off by default, discoverable) ──
  {
    key: 'comment',
    label: 'Comments',
    description: 'Anchored comment threads for collaboration.',
    category: 'Collaboration',
    defaultEnabled: false,
    settings: [
      { key: 'authorName', label: 'Author name', type: 'text', default: 'Current User', placeholder: 'Your name' },
      { key: 'authorColor', label: 'Author color', type: 'color', default: '#4F46E5' },
    ],
    create: (s) =>
      Comment.configure({
        authorId: 'user-1',
        authorName: s.authorName,
        authorColor: s.authorColor,
      }),
  },
  {
    key: 'harper',
    label: 'Spelling & Grammar',
    description: 'Harper WASM proofreader (loads on demand).',
    category: 'Collaboration',
    // Registered by default so the Tools-menu proofing toggle is available; the
    // WASM linter itself still loads lazily, only once proofing is turned on.
    defaultEnabled: true,
    settings: [
      {
        key: 'autoLint',
        label: 'Lint automatically',
        type: 'boolean',
        default: false,
        help: 'When off, proofing only runs from the Tools toggle.',
      },
    ],
    create: (s) => Harper.configure({ autoLint: !!s.autoLint }),
  },

  // ── Discoverable extras (off by default) ──
  {
    key: 'iframe',
    label: 'Iframe Embed',
    description: 'Embed arbitrary iframes / external pages.',
    category: 'Media',
    defaultEnabled: false,
    create: () => Iframe,
  },
  {
    key: 'drawio',
    label: 'Draw.io Diagram',
    description: 'Embed draw.io / diagrams.net diagrams.',
    category: 'Media',
    defaultEnabled: false,
    create: () => Drawio,
  },
];

// Fast lookup by key.
export const PLUGIN_BY_KEY: Record<string, PluginDefinition> = Object.fromEntries(
  PLUGIN_REGISTRY.map((p) => [p.key, p])
);

/** Resolve a plugin's settings by merging schema defaults with saved overrides. */
export function resolvePluginSettings(
  def: PluginDefinition,
  saved?: Record<string, any>
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const field of def.settings ?? []) {
    out[field.key] = saved && field.key in saved ? saved[field.key] : field.default;
  }
  return out;
}

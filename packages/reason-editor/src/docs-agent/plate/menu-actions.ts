/**
 * Editor actions behind the Google Docs-style menu bar (`./ui/menu-bar.tsx`)
 * that are more than a one-line call into a Plate transform: word count, find
 * and replace, case changes, clipboard paste, and the File menu's downloads and
 * print. Kept apart from the menu so they can be tested against a bare editor.
 */

import { MarkdownPlugin } from '@platejs/markdown';
import {
  KEYS,
  NodeApi,
  PathApi,
  PointApi,
  RangeApi,
  TextApi,
  type TRange,
  type TText,
} from 'platejs';
import type { PlateEditor } from 'platejs/react';

import { plateValueToHtml } from '@/docs-agent/plate/plate-to-html';
import { downloadFromBlob } from '@/utils/download';

/** Every mark Format → Clear formatting removes. */
export const CLEARABLE_MARKS = [
  KEYS.bold,
  KEYS.italic,
  KEYS.underline,
  KEYS.strikethrough,
  KEYS.sup,
  KEYS.sub,
  KEYS.code,
  KEYS.highlight,
  KEYS.kbd,
  KEYS.color,
  KEYS.backgroundColor,
  KEYS.fontSize,
  KEYS.fontFamily,
];

export interface WordCount {
  words: number;
  characters: number;
  charactersExcludingSpaces: number;
}

export function countWords(text: string): WordCount {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/u).length : 0,
    characters: text.replace(/\n/g, '').length,
    charactersExcludingSpaces: text.replace(/\s/gu, '').length,
  };
}

/** The document's plain text, one line per top-level block. */
export function documentText(editor: PlateEditor): string {
  return editor.children.map((node) => NodeApi.string(node)).join('\n');
}

/** Text of the current selection, or `''` when it is collapsed. */
export function selectionText(editor: PlateEditor): string {
  const { selection } = editor;
  if (!selection || RangeApi.isCollapsed(selection)) return '';
  return editor.api.string(selection);
}

export type CaseMode = 'lower' | 'upper' | 'title';

/**
 * Applies a capitalization mode to a run of text. `before` is the character
 * preceding the run, so title case knows whether the run starts mid-word.
 */
export function transformCase(text: string, mode: CaseMode, before = ' '): string {
  if (mode === 'lower') return text.toLowerCase();
  if (mode === 'upper') return text.toUpperCase();

  let previous = before;
  let out = '';
  for (const char of text) {
    const startsWord = !/[\p{L}\p{N}'’]/u.test(previous);
    out += startsWord ? char.toUpperCase() : char.toLowerCase();
    previous = char;
  }
  return out;
}

/** Format → Text → Capitalization, keeping every leaf's marks. */
export function changeCase(editor: PlateEditor, mode: CaseMode) {
  const { selection } = editor;
  if (!selection || RangeApi.isCollapsed(selection)) return;

  const [start, end] = RangeApi.edges(selection);
  const entries = Array.from(
    editor.api.nodes<TText>({ at: selection, match: (n) => TextApi.isText(n) }),
  );

  editor.tf.withoutNormalizing(() => {
    let before = ' ';
    for (const [node, path] of entries) {
      const from = PathApi.equals(path, start.path) ? start.offset : 0;
      const to = PathApi.equals(path, end.path) ? end.offset : node.text.length;
      if (to <= from) continue;

      const segment = node.text.slice(from, to);
      const next = transformCase(segment, mode, from > 0 ? node.text[from - 1] : before);
      before = segment[segment.length - 1] ?? before;
      if (next === segment) continue;

      editor.tf.insertText(next, {
        at: { anchor: { path, offset: from }, focus: { path, offset: to } },
      });
    }
  });

  editor.tf.select(selection);
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every occurrence of `query`, each inside a single text leaf, in document order. */
export function findMatches(editor: PlateEditor, query: string, matchCase = false): TRange[] {
  if (!query) return [];
  const pattern = new RegExp(escapeRegExp(query), matchCase ? 'g' : 'gi');
  const ranges: TRange[] = [];

  for (const [node, path] of NodeApi.texts(editor)) {
    const text = (node as TText).text;
    for (const match of text.matchAll(pattern)) {
      const offset = match.index ?? 0;
      ranges.push({
        anchor: { path, offset },
        focus: { path, offset: offset + match[0].length },
      });
    }
  }

  return ranges;
}

/** Selects the first match after the caret, wrapping around. */
export function findNext(editor: PlateEditor, query: string, matchCase = false): TRange | null {
  const matches = findMatches(editor, query, matchCase);
  if (matches.length === 0) return null;

  const caret = editor.selection ? RangeApi.end(editor.selection) : null;
  const next =
    (caret && matches.find((range) => PointApi.compare(range.anchor, caret) >= 0)) ||
    matches[0];

  editor.tf.select(next);
  return next;
}

/** Replaces every match. Returns how many were replaced. */
export function replaceAll(
  editor: PlateEditor,
  query: string,
  replacement: string,
  matchCase = false,
): number {
  const matches = findMatches(editor, query, matchCase);
  if (matches.length === 0) return 0;

  // Back to front, so earlier offsets in the same leaf stay valid.
  editor.tf.withoutNormalizing(() => {
    for (const range of [...matches].reverse()) {
      editor.tf.insertText(replacement, { at: range });
    }
  });

  return matches.length;
}

/** Edit → Paste (and Paste without formatting) through the async Clipboard API. */
export async function pasteFromClipboard(editor: PlateEditor, plainText = false) {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard) return;

  try {
    const data = new DataTransfer();

    if (!plainText && clipboard.read) {
      for (const item of await clipboard.read()) {
        for (const type of ['text/html', 'text/plain']) {
          if (item.types.includes(type)) {
            data.setData(type, await (await item.getType(type)).text());
          }
        }
      }
    } else {
      data.setData('text/plain', await clipboard.readText());
    }

    editor.tf.focus();
    editor.tf.insertData(data);
  } catch (error) {
    // Permission denied, or no DataTransfer constructor: the keyboard
    // shortcut still works, so there is nothing more useful to do here.
    console.warn('[menu-bar] clipboard paste unavailable', error);
  }
}

/** A filesystem-friendly name for downloads. */
export function documentFileName(title: string | undefined, extension: string) {
  const base =
    (title ?? '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || 'document';
  return `${base}.${extension}`;
}

function htmlDocument(body: string, title: string) {
  const safeTitle = title.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>body{font-family:Arial,sans-serif;line-height:1.5;max-width:8.5in;margin:1in auto;padding:0 1rem;color:#202124}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export type DownloadFormat = 'md' | 'html' | 'txt';

/** File → Download. */
export async function downloadDocument(
  editor: PlateEditor,
  format: DownloadFormat,
  title?: string,
) {
  const name = documentFileName(title, format);

  if (format === 'md') {
    const markdown = editor.getApi(MarkdownPlugin).markdown.serialize();
    downloadFromBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), name);
  } else if (format === 'html') {
    const html = htmlDocument(await plateValueToHtml(editor.children), title || 'Document');
    downloadFromBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), name);
  } else {
    downloadFromBlob(new Blob([documentText(editor)], { type: 'text/plain;charset=utf-8' }), name);
  }
}

/** File → Print: the document alone, in a fresh window. */
export async function printDocument(editor: PlateEditor, title?: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(htmlDocument(await plateValueToHtml(editor.children), title || 'Document'));
  win.document.close();
  win.focus();
  win.print();
}

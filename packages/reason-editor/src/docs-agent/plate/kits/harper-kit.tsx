'use client';

/**
 * Harper spelling and grammar checking for the Plate editor — the Plate
 * counterpart of the Tiptap `Harper` extension in `@/extensions/Harper`, and
 * the engine behind the menu bar's Tools → Spelling and grammar entries.
 *
 * Linting runs over the whole document in one `harper.js` call (blocks joined
 * by blank lines, so words never run together across a block boundary). Each
 * lint is then pinned to the lowest text block it falls in, by that block's
 * path and its exact text. `decorate` only draws an issue while the block still
 * holds that text, so an edit hides the stale underlines in that block straight
 * away and the debounced re-lint that follows puts fresh ones back.
 *
 * Nothing loads until `api.harper.start()` is called (the menu bar does, on
 * mount): the WebAssembly linter is a few megabytes and builds Harper's whole
 * dictionary, so an editor without the menu bar never pays for it.
 */

import type { Linter } from 'harper.js';

import {
  ElementApi,
  KEYS,
  NodeApi,
  type Path,
  type Point,
  type TElement,
  type TRange,
  type TText,
} from 'platejs';
import { createPlatePlugin, type PlateEditor } from 'platejs/react';

import {
  createHarperLinter,
  type HarperDialect,
} from '@/extensions/Harper/lib/createHarperLinter';
import { HarperLeaf } from '@/docs-agent/plate/ui/harper-leaf';

export type { HarperDialect } from '@/extensions/Harper/lib/createHarperLinter';

// Mirror of `harper.js` `SuggestionKind`, so this module never needs a static
// import of the WebAssembly package (which must stay lazily loaded).
export const HARPER_SUGGESTION_REPLACE = 0;
export const HARPER_SUGGESTION_REMOVE = 1;
export const HARPER_SUGGESTION_INSERT_AFTER = 2;

export interface PlateHarperSuggestion {
  /** 0 = replace, 1 = remove, 2 = insert-after (mirrors Harper's SuggestionKind). */
  kind: number;
  replacement: string;
  label: string;
}

export interface PlateHarperIssue {
  /** Stable across re-lints while the flagged text stays put. */
  id: string;
  /** Path of the lowest text block the issue sits in. */
  path: Path;
  /** UTF-16 offsets into `NodeApi.string(block)`. */
  start: number;
  end: number;
  /** Harper's pretty kind, e.g. `Spelling`, `Grammar`. */
  kind: string;
  /** Spelling issues get the red underline and "Add to dictionary". */
  spelling: boolean;
  message: string;
  problemText: string;
  suggestions: PlateHarperSuggestion[];
}

export type HarperStatus = 'idle' | 'loading' | 'checking' | 'ready' | 'error';

export interface HarperPluginOptions {
  /** Master switch: off clears every underline and stops linting. */
  enabled: boolean;
  showSpelling: boolean;
  showGrammar: boolean;
  dialect: HarperDialect;
  /** Debounce (ms) between an edit and the lint pass it triggers. */
  debounce: number;
  /** Set by `api.harper.start()`; until then edits do not lint. */
  started: boolean;
  status: HarperStatus;
  issues: PlateHarperIssue[];
  /** Block text each issue was computed against, keyed by `pathKey`. */
  blockTexts: Record<string, string>;
  /** `problemText|message` pairs the user chose to ignore. */
  ignored: string[];
  /** The issue the spelling and grammar panel is showing. */
  activeId: string | null;
  panelOpen: boolean;
}

/** Joins blocks so Harper sees them as separate paragraphs. */
const BLOCK_SEPARATOR = '\n\n';

export const pathKey = (path: Path) => path.join('.');

const ignoreKey = (issue: Pick<PlateHarperIssue, 'problemText' | 'message'>) =>
  `${issue.problemText}|${issue.message}`;

/** Per-editor runtime state that is not worth re-rendering for. */
interface HarperRuntime {
  linter: Linter | null;
  linterDialect: HarperDialect | null;
  timer: ReturnType<typeof setTimeout> | null;
  token: number;
  lastValue: unknown;
}

const runtimes = new WeakMap<object, HarperRuntime>();

function runtimeFor(editor: object): HarperRuntime {
  let runtime = runtimes.get(editor);
  if (!runtime) {
    runtime = { linter: null, linterDialect: null, timer: null, token: 0, lastValue: null };
    runtimes.set(editor, runtime);
  }
  return runtime;
}

/** Harper spans count Unicode scalar values; Slate offsets count UTF-16 units. */
function codePointToUtf16(text: string, codePoint: number): number {
  let units = 0;
  let seen = 0;
  for (const char of text) {
    if (seen >= codePoint) break;
    units += char.length;
    seen += 1;
  }
  return units;
}

/** Every lowest text block worth proofreading, in document order. */
export function collectTextBlocks(editor: PlateEditor): { path: Path; text: string }[] {
  const blocks: { path: Path; text: string }[] = [];
  const codeLine = editor.getType(KEYS.codeLine);

  for (const [node, path] of NodeApi.nodes(editor, { pass: ([n]) => isProofedBlock(editor, n, codeLine) })) {
    if (!isProofedBlock(editor, node, codeLine)) continue;
    const text = NodeApi.string(node);
    if (text.trim()) blocks.push({ path, text });
  }

  return blocks;
}

/** A block whose children are text and inline nodes, outside code. */
function isProofedBlock(editor: PlateEditor, node: unknown, codeLine: string): node is TElement {
  if (!ElementApi.isElement(node) || !editor.api.isBlock(node)) return false;
  if (node.type === codeLine || node.type === editor.getType(KEYS.codeBlock)) return false;
  return !node.children.some((child) => ElementApi.isElement(child) && editor.api.isBlock(child));
}

/** Maps a UTF-16 offset in a block's string to a point in one of its texts. */
function offsetToPoint(block: TElement, path: Path, offset: number, isEnd: boolean): Point | null {
  let consumed = 0;
  for (const [text, relPath] of NodeApi.texts(block)) {
    const length = (text as TText).text.length;
    if (offset < consumed + length || (isEnd && offset === consumed + length)) {
      return { path: [...path, ...relPath], offset: offset - consumed };
    }
    consumed += length;
  }
  return null;
}

/** Live document range for an issue, or `null` once its block has changed. */
export function getHarperIssueRange(editor: PlateEditor, issue: PlateHarperIssue): TRange | null {
  const entry = editor.api.node<TElement>(issue.path);
  if (!entry || !ElementApi.isElement(entry[0])) return null;

  const expected = editor.getOption(HarperPlugin, 'blockTexts')[pathKey(issue.path)];
  if (NodeApi.string(entry[0]) !== expected) return null;

  const anchor = offsetToPoint(entry[0], issue.path, issue.start, false);
  const focus = offsetToPoint(entry[0], issue.path, issue.end, true);
  return anchor && focus ? { anchor, focus } : null;
}

/** Issues the user can currently see, given the show/ignore settings. */
export function visibleHarperIssues(options: Pick<
  HarperPluginOptions,
  'enabled' | 'issues' | 'ignored' | 'showGrammar' | 'showSpelling'
>): PlateHarperIssue[] {
  if (!options.enabled) return [];
  const ignored = new Set(options.ignored);
  return options.issues.filter(
    (issue) =>
      (issue.spelling ? options.showSpelling : options.showGrammar) &&
      !ignored.has(ignoreKey(issue)),
  );
}

async function ensureLinter(editor: PlateEditor, runtime: HarperRuntime): Promise<Linter> {
  const dialect = editor.getOption(HarperPlugin, 'dialect');

  if (!runtime.linter) {
    editor.setOption(HarperPlugin, 'status', 'loading');
    runtime.linter = await createHarperLinter({ dialect });
    runtime.linterDialect = dialect;
  } else if (runtime.linterDialect !== dialect) {
    const harper = await import('harper.js');
    await runtime.linter.setDialect(harper.Dialect[dialect]);
    runtime.linterDialect = dialect;
  }

  return runtime.linter;
}

async function lintNow(editor: PlateEditor): Promise<void> {
  const runtime = runtimeFor(editor);
  const token = (runtime.token += 1);

  if (!editor.getOption(HarperPlugin, 'enabled')) return;

  const blocks = collectTextBlocks(editor);
  const valueAtStart = editor.children;

  let linter: Linter;
  try {
    linter = await ensureLinter(editor, runtime);
  } catch (error) {
    console.warn('[harper] linter failed to load', error);
    editor.setOption(HarperPlugin, 'status', 'error');
    return;
  }

  if (token !== runtime.token) return;

  if (blocks.length === 0) {
    editor.setOption(HarperPlugin, 'issues', []);
    editor.setOption(HarperPlugin, 'blockTexts', {});
    editor.setOption(HarperPlugin, 'status', 'ready');
    editor.api.redecorate();
    return;
  }

  editor.setOption(HarperPlugin, 'status', 'checking');

  // Block start offsets in code points, the unit Harper reports spans in.
  const starts: number[] = [];
  let cursor = 0;
  for (const block of blocks) {
    starts.push(cursor);
    cursor += Array.from(block.text).length + BLOCK_SEPARATOR.length;
  }

  let lints;
  try {
    lints = await linter.lint(blocks.map((b) => b.text).join(BLOCK_SEPARATOR), {
      language: 'plaintext',
    });
  } catch (error) {
    console.warn('[harper] lint failed', error);
    editor.setOption(HarperPlugin, 'status', 'error');
    return;
  }

  // Superseded, or the document moved while the worker was busy: offsets
  // computed against the old text would land on the wrong characters.
  if (token !== runtime.token || editor.children !== valueAtStart) return;

  const issues: PlateHarperIssue[] = [];
  const blockTexts: Record<string, string> = {};

  for (const lint of lints) {
    const span = lint.span();
    // Last block starting at or before the span.
    let index = starts.length - 1;
    while (index > 0 && starts[index] > span.start) index -= 1;

    const block = blocks[index];
    const local = span.start - starts[index];
    const localEnd = span.end - starts[index];
    if (localEnd > Array.from(block.text).length) continue; // spans a boundary

    const start = codePointToUtf16(block.text, local);
    const end = codePointToUtf16(block.text, localEnd);
    if (end <= start) continue;

    const machineKind = lint.lint_kind();
    const key = pathKey(block.path);
    blockTexts[key] = block.text;

    issues.push({
      id: `${key}:${start}:${end}:${machineKind}`,
      path: block.path,
      start,
      end,
      kind: lint.lint_kind_pretty(),
      spelling: machineKind.toLowerCase().includes('spell'),
      message: lint.message(),
      problemText: lint.get_problem_text(),
      suggestions: lint.suggestions().map((s) => {
        const kind = s.kind() as unknown as number;
        const replacement = s.get_replacement_text();
        let label = replacement;
        if (kind === HARPER_SUGGESTION_REMOVE) label = 'Remove';
        else if (kind === HARPER_SUGGESTION_INSERT_AFTER) label = `Insert “${replacement}”`;
        return { kind, replacement, label };
      }),
    });
  }

  editor.setOption(HarperPlugin, 'blockTexts', blockTexts);
  editor.setOption(HarperPlugin, 'issues', issues);
  editor.setOption(HarperPlugin, 'status', 'ready');
  editor.api.redecorate();
}

function scheduleLint(editor: PlateEditor) {
  const runtime = runtimeFor(editor);
  if (runtime.timer) clearTimeout(runtime.timer);
  runtime.timer = setTimeout(() => {
    runtime.timer = null;
    void lintNow(editor);
  }, editor.getOption(HarperPlugin, 'debounce'));
}

export const HarperPlugin = createPlatePlugin({
  key: 'harper',
  node: { isLeaf: true, isDecoration: true },
  options: {
    enabled: true,
    showSpelling: true,
    showGrammar: true,
    dialect: 'American',
    debounce: 400,
    started: false,
    status: 'idle',
    issues: [],
    blockTexts: {},
    ignored: [],
    activeId: null,
    panelOpen: false,
  } as HarperPluginOptions,
  decorate: ({ editor, entry: [node, path], getOptions, type }) => {
    if (!ElementApi.isElement(node)) return [];

    const options = getOptions();
    if (!options.enabled || options.issues.length === 0) return [];

    const key = pathKey(path);
    const expected = options.blockTexts[key];
    if (expected === undefined || NodeApi.string(node) !== expected) return [];

    const ranges: TRange[] = [];
    for (const issue of visibleHarperIssues(options)) {
      if (pathKey(issue.path) !== key) continue;
      const anchor = offsetToPoint(node, path, issue.start, false);
      const focus = offsetToPoint(node, path, issue.end, true);
      if (!anchor || !focus) continue;
      ranges.push({
        anchor,
        focus,
        [type]: true,
        harperId: issue.id,
        harperSpelling: issue.spelling,
        harperMessage: issue.message,
      } as TRange);
    }
    return ranges;
  },
  handlers: {
    onChange: ({ editor, getOptions }) => {
      const { enabled, started } = getOptions();
      if (!enabled || !started) return;

      // Selection moves call onChange too; only content changes re-lint.
      const runtime = runtimeFor(editor);
      if (runtime.lastValue === editor.children) return;
      runtime.lastValue = editor.children;
      scheduleLint(editor as PlateEditor);
    },
  },
})
  .withComponent(HarperLeaf)
  .extendApi(({ editor }) => ({
    /** Begin proofreading: lints now, then after every edit. */
    start: () => {
      if (editor.getOption(HarperPlugin, 'started')) return;
      editor.setOption(HarperPlugin, 'started', true);
      runtimeFor(editor).lastValue = editor.children;
      void lintNow(editor as PlateEditor);
    },
    /** Lint immediately, bypassing the debounce. */
    check: () => lintNow(editor as PlateEditor),
    setEnabled: (enabled: boolean) => {
      editor.setOption(HarperPlugin, 'enabled', enabled);
      if (enabled) {
        void lintNow(editor as PlateEditor);
      } else {
        runtimeFor(editor).token += 1;
        editor.setOption(HarperPlugin, 'issues', []);
        editor.setOption(HarperPlugin, 'panelOpen', false);
        editor.setOption(HarperPlugin, 'status', 'idle');
      }
      editor.api.redecorate();
    },
    setShow: (kind: 'spelling' | 'grammar', show: boolean) => {
      editor.setOption(HarperPlugin, kind === 'spelling' ? 'showSpelling' : 'showGrammar', show);
      editor.api.redecorate();
    },
    setDialect: (dialect: HarperDialect) => {
      editor.setOption(HarperPlugin, 'dialect', dialect);
      void lintNow(editor as PlateEditor);
    },
    /** Open the spelling and grammar panel, optionally on one issue. */
    openPanel: (id?: string | null) => {
      const issues = visibleHarperIssues(editor.getOptions(HarperPlugin));
      editor.setOption(HarperPlugin, 'activeId', id ?? issues[0]?.id ?? null);
      editor.setOption(HarperPlugin, 'panelOpen', true);
      if (!editor.getOption(HarperPlugin, 'enabled')) {
        editor.getApi(HarperPlugin).harper.setEnabled(true);
      } else if (!editor.getOption(HarperPlugin, 'started')) {
        editor.getApi(HarperPlugin).harper.start();
      }
    },
    closePanel: () => editor.setOption(HarperPlugin, 'panelOpen', false),
    /** Apply one of an issue's suggestions. Returns false if the text moved. */
    accept: (id: string, suggestionIndex = 0): boolean => {
      const issue = editor.getOption(HarperPlugin, 'issues').find((i) => i.id === id);
      const suggestion = issue?.suggestions[suggestionIndex];
      if (!issue || !suggestion) return false;

      const range = getHarperIssueRange(editor as PlateEditor, issue);
      if (!range) return false;

      if (suggestion.kind === HARPER_SUGGESTION_REMOVE) {
        editor.tf.delete({ at: range });
      } else if (suggestion.kind === HARPER_SUGGESTION_INSERT_AFTER) {
        editor.tf.insertText(suggestion.replacement, { at: range.focus });
      } else {
        editor.tf.insertText(suggestion.replacement, { at: range });
      }

      editor.setOption(
        HarperPlugin,
        'issues',
        editor.getOption(HarperPlugin, 'issues').filter((i) => i.id !== id),
      );
      return true;
    },
    /** Hide every occurrence of this issue for the rest of the session. */
    ignore: (id: string) => {
      const issue = editor.getOption(HarperPlugin, 'issues').find((i) => i.id === id);
      if (!issue) return;
      editor.setOption(HarperPlugin, 'ignored', [
        ...editor.getOption(HarperPlugin, 'ignored'),
        ignoreKey(issue),
      ]);
      editor.api.redecorate();
    },
    /** Teach Harper a word, then re-check so every occurrence clears. */
    addToDictionary: async (word: string) => {
      const runtime = runtimeFor(editor);
      const linter = runtime.linter;
      if (!linter || !word.trim()) return;
      await linter.importWords([word.trim()]);
      await lintNow(editor as PlateEditor);
    },
  }));

export const HarperKit = [HarperPlugin];

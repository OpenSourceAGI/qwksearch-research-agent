/**
 * Defines the Harper Tiptap extension, which adds the Harper grammar and spell checker to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { type Editor, Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { Linter } from 'harper.js';

import {
  type CreateHarperLinterOptions,
  type HarperDialect,
  getSharedHarperLinter,
} from './lib/createHarperLinter';
import { extractTextWithMap, spanToRange } from './lib/extractTextWithMap';

export type { HarperDialect } from './lib/createHarperLinter';

// Mirror of `harper.js` `SuggestionKind` so this module never needs a static
// import of the WebAssembly package (which must stay lazily loaded).
const SUGGESTION_REPLACE = 0;
const SUGGESTION_REMOVE = 1;
const SUGGESTION_INSERT_AFTER = 2;

export interface HarperSuggestion {
  /** 0 = replace, 1 = remove, 2 = insert-after (mirrors Harper's SuggestionKind). */
  kind: number;
  /** Text that replaces (or is inserted after) the flagged span. */
  replacement: string;
  /** Human-readable label for the suggestion action. */
  label: string;
}

export interface HarperIssue {
  id: string;
  /** Short description of the issue, e.g. `Spelling`, `Grammar`. */
  kind: string;
  /** Full human-readable message from Harper. */
  message: string;
  /** The offending text as it currently appears in the document. */
  problemText: string;
  suggestions: HarperSuggestion[];
}

interface HarperPluginState {
  decorations: DecorationSet;
  /** Issue metadata keyed by id. Live positions come from `decorations`. */
  issues: Map<string, HarperIssue>;
}

type HarperMeta =
  | { type: 'set'; decorations: Decoration[]; issues: Map<string, HarperIssue> }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

export const harperPluginKey = new PluginKey<HarperPluginState>('harper');

export interface HarperOptions {
  /** Prefer a web-worker linter to keep large-document linting off the editor thread. */
  preferWorker: boolean;
  /** English dialect to lint against. */
  dialect: HarperDialect;
  /** Debounce (ms) between an edit and the lint pass it triggers. */
  debounce: number;
  /** Re-lint automatically as the document changes. */
  autoLint: boolean;
  /** Base class applied to every issue decoration. */
  issueClass: string;
  /** Called after every completed lint pass with the current issue list. */
  onUpdate?: (issues: HarperIssue[]) => void;
}

export interface HarperStorage {
  linter: Linter | null;
  ready: boolean;
  error: unknown;
  issues: HarperIssue[];
  timer: ReturnType<typeof setTimeout> | null;
  runToken: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    harper: {
      /** Run a full proofing pass immediately, bypassing the debounce. */
      runProofing: () => ReturnType;
      /** Remove all Harper decorations. */
      clearProofing: () => ReturnType;
      /** Apply one of an issue's suggestions to the document. */
      applyHarperSuggestion: (id: string, suggestionIndex: number) => ReturnType;
      /** Dismiss a single issue without changing the document. */
      ignoreHarperSuggestion: (id: string) => ReturnType;
    };
  }
}

function issueDecorationClass(machineKind: string, base: string): string {
  const modifier = machineKind.toLowerCase().includes('spell')
    ? `${base}-spelling`
    : `${base}-grammar`;
  return `${base} ${modifier}`;
}

function findDecorationById(
  set: DecorationSet,
  id: string
): { from: number; to: number } | null {
  const found = set.find(undefined, undefined, (spec) => spec['data-harper-id'] === id);
  if (found.length === 0) return null;
  return { from: found[0].from, to: found[0].to };
}

export function getHarperState(state: EditorState): HarperPluginState | undefined {
  return harperPluginKey.getState(state);
}

/** Look up the live document range for an issue, or `null` if it no longer exists. */
export function getHarperIssueRange(
  state: EditorState,
  id: string
): { from: number; to: number } | null {
  const pluginState = getHarperState(state);
  if (!pluginState) return null;
  return findDecorationById(pluginState.decorations, id);
}

async function runLint(editor: Editor, options: HarperOptions, storage: HarperStorage) {
  if (editor.isDestroyed) return;

  const token = (storage.runToken += 1);

  if (!storage.linter) {
    try {
      const linterOptions: CreateHarperLinterOptions = {
        preferWorker: options.preferWorker,
        dialect: options.dialect,
      };
      storage.linter = await getSharedHarperLinter(linterOptions);
      storage.ready = true;
    } catch (error) {
      storage.error = error;
      return;
    }
  }

  const linter = storage.linter;
  if (!linter || token !== storage.runToken || editor.isDestroyed) return;

  const docAtStart = editor.state.doc;
  const { text, map } = extractTextWithMap(docAtStart);

  if (!text.trim()) {
    editor.view.dispatch(editor.state.tr.setMeta(harperPluginKey, { type: 'clear' } as HarperMeta));
    storage.issues = [];
    options.onUpdate?.([]);
    return;
  }

  let lints;
  try {
    lints = await linter.lint(text, { language: 'plaintext' });
  } catch (error) {
    storage.error = error;
    return;
  }

  // Discard the pass if it was superseded or the document moved underneath us;
  // decorations built against stale text would land on the wrong characters.
  if (token !== storage.runToken || editor.isDestroyed || editor.state.doc !== docAtStart) {
    return;
  }

  const issues = new Map<string, HarperIssue>();
  const decorations: Decoration[] = [];

  for (const lint of lints) {
    const span = lint.span();
    const range = spanToRange(map, span.start, span.end);
    if (!range) continue;

    const id = `harper-${token}-${decorations.length}`;
    const machineKind = lint.lint_kind();
    const suggestions: HarperSuggestion[] = lint.suggestions().map((s) => {
      const kind = s.kind() as unknown as number;
      const replacement = s.get_replacement_text();
      let label = replacement;
      if (kind === SUGGESTION_REMOVE) label = 'Remove';
      else if (kind === SUGGESTION_INSERT_AFTER) label = `Insert “${replacement}”`;
      return { kind, replacement, label };
    });

    issues.set(id, {
      id,
      kind: lint.lint_kind_pretty(),
      message: lint.message(),
      problemText: lint.get_problem_text(),
      suggestions,
    });

    decorations.push(
      Decoration.inline(
        range.from,
        range.to,
        {
          nodeName: 'span',
          class: issueDecorationClass(machineKind, options.issueClass),
          'data-harper-id': id,
        },
        // Spec (4th arg): what `DecorationSet.find` predicates receive. The id
        // must live here for lookups, separate from the DOM attribute above.
        { 'data-harper-id': id }
      )
    );
  }

  editor.view.dispatch(
    editor.state.tr.setMeta(harperPluginKey, { type: 'set', decorations, issues } as HarperMeta)
  );

  storage.issues = Array.from(issues.values());
  options.onUpdate?.(storage.issues);
}

function scheduleLint(editor: Editor, options: HarperOptions, storage: HarperStorage) {
  if (storage.timer) clearTimeout(storage.timer);
  storage.timer = setTimeout(() => {
    storage.timer = null;
    void runLint(editor, options, storage);
  }, options.debounce);
}

export const Harper = Extension.create<HarperOptions, HarperStorage>({
  name: 'harper',

  addOptions() {
    return {
      preferWorker: true,
      dialect: 'American',
      debounce: 300,
      autoLint: true,
      issueClass: 'harper-issue',
      onUpdate: undefined,
    };
  },

  addStorage() {
    return {
      linter: null,
      ready: false,
      error: null,
      issues: [],
      timer: null,
      runToken: 0,
    };
  },

  onCreate() {
    if (this.options.autoLint) {
      scheduleLint(this.editor, this.options, this.storage);
    }
  },

  onUpdate() {
    if (this.options.autoLint) {
      scheduleLint(this.editor, this.options, this.storage);
    }
  },

  onDestroy() {
    if (this.storage.timer) {
      clearTimeout(this.storage.timer);
      this.storage.timer = null;
    }
  },

  addCommands() {
    return {
      runProofing:
        () =>
        ({ editor }) => {
          void runLint(editor as Editor, this.options, this.storage);
          return true;
        },

      clearProofing:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            dispatch(state.tr.setMeta(harperPluginKey, { type: 'clear' } as HarperMeta));
          }
          this.storage.issues = [];
          return true;
        },

      applyHarperSuggestion:
        (id: string, suggestionIndex: number) =>
        ({ state, dispatch, tr }) => {
          const pluginState = getHarperState(state);
          if (!pluginState) return false;

          const range = findDecorationById(pluginState.decorations, id);
          const issue = pluginState.issues.get(id);
          if (!range || !issue) return false;

          const suggestion = issue.suggestions[suggestionIndex];
          if (!suggestion) return false;

          const { from, to } = range;
          if (suggestion.kind === SUGGESTION_REMOVE) {
            tr.delete(from, to);
          } else if (suggestion.kind === SUGGESTION_INSERT_AFTER) {
            tr.insertText(suggestion.replacement, to, to);
          } else if (suggestion.kind === SUGGESTION_REPLACE) {
            tr.insertText(suggestion.replacement, from, to);
          } else {
            return false;
          }

          tr.setMeta(harperPluginKey, { type: 'remove', id } as HarperMeta);
          if (dispatch) dispatch(tr);
          return true;
        },

      ignoreHarperSuggestion:
        (id: string) =>
        ({ state, dispatch }) => {
          const pluginState = getHarperState(state);
          if (!pluginState || !pluginState.issues.has(id)) return false;
          if (dispatch) {
            dispatch(state.tr.setMeta(harperPluginKey, { type: 'remove', id } as HarperMeta));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const issueClass = this.options.issueClass;

    return [
      new Plugin<HarperPluginState>({
        key: harperPluginKey,
        state: {
          init() {
            return { decorations: DecorationSet.empty, issues: new Map() };
          },
          apply(tr, value, _oldState, newState) {
            let decorations = value.decorations;
            let issues = value.issues;

            if (tr.docChanged) {
              decorations = decorations.map(tr.mapping, tr.doc);
            }

            const meta = tr.getMeta(harperPluginKey) as HarperMeta | undefined;
            if (meta) {
              if (meta.type === 'clear') {
                return { decorations: DecorationSet.empty, issues: new Map() };
              }
              if (meta.type === 'set') {
                return {
                  decorations: DecorationSet.create(newState.doc, meta.decorations),
                  issues: meta.issues,
                };
              }
              if (meta.type === 'remove') {
                const found = decorations.find(
                  undefined,
                  undefined,
                  (spec) => spec['data-harper-id'] === meta.id
                );
                const nextIssues = new Map(issues);
                nextIssues.delete(meta.id);
                return { decorations: decorations.remove(found), issues: nextIssues };
              }
            }

            return { decorations, issues };
          },
        },
        props: {
          // Suppress the browser's native spell checker so its underlines do
          // not duplicate Harper's decorations.
          attributes: {
            spellcheck: 'false',
          },
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

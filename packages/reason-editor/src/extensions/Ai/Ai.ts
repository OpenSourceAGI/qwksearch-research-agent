/**
 * Defines the Ai Tiptap extension: a writing-assistant menu ("Ask AI
 * anything…" + quick commands like Improve writing / Make shorter / Fix
 * spelling) that streams a suggestion, renders it as a non-destructive
 * red/green diff over the selection, and lets the user Accept, Discard,
 * Insert below, or Try again before anything is written to the document.
 *
 * Ported from `packages/reason-editor/ai` (the Plate.js `@platejs/ai`
 * package) and rebuilt on Tiptap/ProseMirror: a decoration-driven plugin
 * (state machine + diff rendering) in place of Slate's editor transforms,
 * following the same shape as this package's `Harper` extension.
 */

import { type Editor, Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import type { Mapping } from '@tiptap/pm/transform';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { DEFAULT_AI_COMMANDS } from './commands';
import { mockAiCompletion } from './lib/mockCompletion';

import type {
  AiCommandDefinition,
  AiCompletionFn,
  AiLastRequest,
  AiPanelState,
  AiSuggestion,
} from './types';

export * from './types';
export { DEFAULT_AI_COMMANDS } from './commands';

export interface AiOptions {
  /** Quick commands offered in the "Ask AI anything…" menu. */
  commands: AiCommandDefinition[];
  /**
   * Runs a completion for an instruction. Defaults to an offline demo
   * transform; host apps should supply a real implementation, the same way
   * `Image`/`Video` take an `upload` callback.
   */
  getCompletion: AiCompletionFn;
  /** Class applied to the (still-present) original text while a replacement is reviewed. */
  removedClass: string;
  /** Class applied to the streamed/suggested text widget. */
  insertedClass: string;
  /** Class applied to the "thinking" placeholder shown before the first chunk arrives. */
  loadingClass: string;
}

export interface AiStorage {
  requestToken: number;
  abortController: AbortController | null;
}

interface AiPluginState {
  panel: AiPanelState;
  decorations: DecorationSet;
  lastRequest: AiLastRequest | null;
}

type AiMeta =
  | { type: 'open-menu'; from: number; to: number }
  | { type: 'set-loading'; from: number; to: number; commandLabel: string; instruction: string }
  | { type: 'set-suggestion'; suggestion: AiSuggestion; commandLabel: string }
  | { type: 'set-error'; from: number; to: number; commandLabel: string; message: string }
  | { type: 'close' };

export const aiPluginKey = new PluginKey<AiPluginState>('ai');

export function getAiState(state: EditorState): AiPluginState | undefined {
  return aiPluginKey.getState(state);
}

/** Reads the live, resolved options (including any `commands` override) off the registered extension instance. */
export function getAiOptions(editor: Editor): AiOptions | undefined {
  return editor.extensionManager.extensions.find((extension) => extension.name === 'ai')?.options as
    | AiOptions
    | undefined;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ai: {
      /** Open the quick-command / free-form prompt menu at the current selection (or cursor). */
      openAiMenu: () => ReturnType;
      /** Close the menu and discard any pending suggestion without touching the document. */
      closeAiMenu: () => ReturnType;
      /** Run one of `options.commands` against the menu's range. */
      runAiCommand: (commandId: string) => ReturnType;
      /** Run a free-form instruction typed into the menu's input. */
      submitAiPrompt: (instruction: string) => ReturnType;
      /** Replace the original range with the suggestion (or insert it, when there was no selection). */
      acceptAiSuggestion: () => ReturnType;
      /** Discard the suggestion, leaving the document untouched. */
      discardAiSuggestion: () => ReturnType;
      /** Keep the original text and insert the suggestion as a new paragraph below it. */
      insertAiSuggestionBelow: () => ReturnType;
      /** Re-run the last instruction against its original range. */
      retryAiSuggestion: () => ReturnType;
    };
  }
}

function getPanelRange(
  panel: AiPanelState,
  fallback: { from: number; to: number }
): { from: number; to: number } {
  switch (panel.status) {
    case 'menu':
    case 'loading':
    case 'error':
      return { from: panel.from, to: panel.to };
    case 'reviewing':
      return { from: panel.suggestion.from, to: panel.suggestion.to };
    default:
      return fallback;
  }
}

function mapPanel(panel: AiPanelState, mapping: Mapping): AiPanelState {
  switch (panel.status) {
    case 'closed':
      return panel;
    case 'menu':
    case 'loading':
    case 'error':
      return { ...panel, from: mapping.map(panel.from), to: mapping.map(panel.to) };
    case 'reviewing':
      return {
        ...panel,
        suggestion: {
          ...panel.suggestion,
          from: mapping.map(panel.suggestion.from),
          to: mapping.map(panel.suggestion.to),
        },
      };
    default:
      return panel;
  }
}

function buildDecorations(doc: ProseMirrorNode, panel: AiPanelState, options: AiOptions): DecorationSet {
  if (panel.status === 'loading') {
    return DecorationSet.create(doc, [
      Decoration.widget(
        panel.to,
        () => {
          const span = document.createElement('span');
          span.className = options.loadingClass;
          span.textContent = '● ● ●';
          return span;
        },
        { side: 1 }
      ),
    ]);
  }

  if (panel.status === 'reviewing') {
    const { from, to, suggestedText, mode } = panel.suggestion;
    const decorations: Decoration[] = [];

    if (mode === 'replace' && to > from) {
      decorations.push(Decoration.inline(from, to, { class: options.removedClass }));
    }

    decorations.push(
      Decoration.widget(
        to,
        () => {
          const span = document.createElement('span');
          span.className = options.insertedClass;
          span.textContent = suggestedText || '…';
          return span;
        },
        { side: 1 }
      )
    );

    return DecorationSet.create(doc, decorations);
  }

  return DecorationSet.empty;
}

async function runAiRequest(
  editor: Editor,
  options: AiOptions,
  storage: AiStorage,
  instruction: string,
  commandLabel: string,
  from: number,
  to: number
) {
  const { view } = editor;
  const doc = editor.state.doc;
  const selectedText = from === to ? '' : doc.textBetween(from, to, '\n');
  const documentText = doc.textBetween(0, doc.content.size, '\n');
  const mode: AiSuggestion['mode'] = selectedText ? 'replace' : 'insert';

  storage.abortController?.abort();
  const controller = new AbortController();
  storage.abortController = controller;
  const token = (storage.requestToken += 1);

  view.dispatch(
    view.state.tr.setMeta(aiPluginKey, {
      type: 'set-loading',
      from,
      to,
      commandLabel,
      instruction,
    } satisfies AiMeta)
  );

  const dispatchSuggestion = (text: string, isStreaming: boolean) => {
    if (token !== storage.requestToken || editor.isDestroyed) return;
    editor.view.dispatch(
      editor.view.state.tr.setMeta(aiPluginKey, {
        type: 'set-suggestion',
        commandLabel,
        suggestion: { from, to, originalText: selectedText, suggestedText: text, mode, isStreaming },
      } satisfies AiMeta)
    );
  };

  try {
    const result = await options.getCompletion(
      { instruction, selectedText, documentText },
      (chunk) => dispatchSuggestion(chunk, true),
      controller.signal
    );
    dispatchSuggestion(result, false);
  } catch (error) {
    if (controller.signal.aborted || token !== storage.requestToken || editor.isDestroyed) return;
    editor.view.dispatch(
      editor.view.state.tr.setMeta(aiPluginKey, {
        type: 'set-error',
        from,
        to,
        commandLabel,
        message: error instanceof Error ? error.message : 'Something went wrong.',
      } satisfies AiMeta)
    );
  }
}

export const Ai = Extension.create<AiOptions, AiStorage>({
  name: 'ai',

  addOptions() {
    return {
      commands: DEFAULT_AI_COMMANDS,
      getCompletion: mockAiCompletion,
      removedClass: 'ai-removed-text',
      insertedClass: 'ai-suggested-text',
      loadingClass: 'ai-loading-indicator',
    };
  },

  addStorage() {
    return {
      requestToken: 0,
      abortController: null,
    };
  },

  onDestroy() {
    this.storage.abortController?.abort();
  },

  addKeyboardShortcuts() {
    return {
      'Mod-j': () => this.editor.commands.openAiMenu(),
    };
  },

  addCommands() {
    return {
      openAiMenu:
        () =>
        ({ state, dispatch }) => {
          const { from, to } = state.selection;
          if (dispatch) {
            dispatch(state.tr.setMeta(aiPluginKey, { type: 'open-menu', from, to } satisfies AiMeta));
          }
          return true;
        },

      closeAiMenu:
        () =>
        ({ state, dispatch }) => {
          this.storage.abortController?.abort();
          this.storage.requestToken += 1;
          if (dispatch) {
            dispatch(state.tr.setMeta(aiPluginKey, { type: 'close' } satisfies AiMeta));
          }
          return true;
        },

      runAiCommand:
        (commandId: string) =>
        ({ state, editor }) => {
          const command = this.options.commands.find((c) => c.id === commandId);
          if (!command) return false;

          const panel = getAiState(state)?.panel ?? { status: 'closed' as const };
          const { from, to } = getPanelRange(panel, state.selection);
          void runAiRequest(editor as Editor, this.options, this.storage, command.prompt, command.label, from, to);
          return true;
        },

      submitAiPrompt:
        (instruction: string) =>
        ({ state, editor }) => {
          const trimmed = instruction.trim();
          if (!trimmed) return false;

          const panel = getAiState(state)?.panel ?? { status: 'closed' as const };
          const { from, to } = getPanelRange(panel, state.selection);
          void runAiRequest(editor as Editor, this.options, this.storage, trimmed, 'Custom', from, to);
          return true;
        },

      retryAiSuggestion:
        () =>
        ({ state, editor }) => {
          const last = getAiState(state)?.lastRequest;
          if (!last) return false;
          void runAiRequest(
            editor as Editor,
            this.options,
            this.storage,
            last.instruction,
            last.commandLabel,
            last.from,
            last.to
          );
          return true;
        },

      acceptAiSuggestion:
        () =>
        ({ state, dispatch, tr }) => {
          const panel = getAiState(state)?.panel;
          if (!panel || panel.status !== 'reviewing' || panel.suggestion.isStreaming) return false;

          const { from, to, suggestedText } = panel.suggestion;
          tr.insertText(suggestedText, from, to);
          tr.setMeta(aiPluginKey, { type: 'close' } satisfies AiMeta);

          if (dispatch) dispatch(tr);
          return true;
        },

      discardAiSuggestion:
        () =>
        ({ state, dispatch }) => {
          this.storage.abortController?.abort();
          this.storage.requestToken += 1;
          if (dispatch) {
            dispatch(state.tr.setMeta(aiPluginKey, { type: 'close' } satisfies AiMeta));
          }
          return true;
        },

      insertAiSuggestionBelow:
        () =>
        ({ state, dispatch, tr }) => {
          const panel = getAiState(state)?.panel;
          if (!panel || panel.status !== 'reviewing' || panel.suggestion.isStreaming) return false;

          const { to, suggestedText } = panel.suggestion;
          const $to = tr.doc.resolve(Math.min(to, tr.doc.content.size));
          const blockEnd = $to.end($to.depth);

          const paragraphType = state.schema.nodes.paragraph;
          const node = paragraphType.create(null, suggestedText ? state.schema.text(suggestedText) : undefined);
          tr.insert(blockEnd, node);
          tr.setMeta(aiPluginKey, { type: 'close' } satisfies AiMeta);

          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<AiPluginState>({
        key: aiPluginKey,
        state: {
          init() {
            return { panel: { status: 'closed' }, decorations: DecorationSet.empty, lastRequest: null };
          },
          apply(tr, value) {
            let panel = value.panel;
            let lastRequest = value.lastRequest;

            if (tr.docChanged) {
              panel = mapPanel(panel, tr.mapping);
            }

            const meta = tr.getMeta(aiPluginKey) as AiMeta | undefined;
            if (meta) {
              switch (meta.type) {
                case 'open-menu':
                  panel = { status: 'menu', from: meta.from, to: meta.to };
                  break;
                case 'set-loading':
                  panel = { status: 'loading', from: meta.from, to: meta.to, commandLabel: meta.commandLabel };
                  lastRequest = {
                    instruction: meta.instruction,
                    commandLabel: meta.commandLabel,
                    from: meta.from,
                    to: meta.to,
                  };
                  break;
                case 'set-suggestion':
                  panel = { status: 'reviewing', suggestion: meta.suggestion, commandLabel: meta.commandLabel };
                  break;
                case 'set-error':
                  panel = {
                    status: 'error',
                    from: meta.from,
                    to: meta.to,
                    commandLabel: meta.commandLabel,
                    message: meta.message,
                  };
                  break;
                case 'close':
                  panel = { status: 'closed' };
                  break;
              }
            }

            return { panel, decorations: buildDecorations(tr.doc, panel, options), lastRequest };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

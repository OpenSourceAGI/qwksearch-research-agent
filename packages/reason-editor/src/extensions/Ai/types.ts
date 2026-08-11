/**
 * Shared type definitions for the Ai extension: the quick-command menu, the
 * pluggable completion function apps wire real model calls into, and the
 * panel/suggestion state that drives both the ProseMirror decorations and
 * the floating React menu.
 */

import type { ComponentType } from 'react';

/** A single quick-action offered in the "Ask AI anything…" command list. */
export interface AiCommandDefinition {
  /** Stable identifier, also used as the React key. */
  id: string;
  /** Label shown in the command list. */
  label: string;
  /** Short helper text shown under the label. */
  description?: string;
  /** `lucide-react` icon component rendered next to the label. */
  icon: ComponentType<{ className?: string }>;
  /**
   * Instruction sent to the completion function as `request.instruction`.
   * The selection (or, when nothing is selected, an empty string) is passed
   * alongside it as `request.selectedText` — combine them however the
   * backend prompt format needs.
   */
  prompt: string;
}

/** What the completion function is asked to do. */
export interface AiCompletionRequest {
  /** The resolved instruction, e.g. a command's `prompt` or free-form text typed by the user. */
  instruction: string;
  /** The selected text the instruction should act on. Empty when generating fresh content. */
  selectedText: string;
  /** Plain-text of the whole document, for context. */
  documentText: string;
}

/**
 * Runs an AI completion. Called with an `onChunk` callback so implementations
 * can stream partial text as it arrives; the returned promise must resolve
 * with the final full text. Apps supply their own implementation (real LLM
 * call) via `Ai.configure({ getCompletion })`, the same way `Image`/`Video`
 * take an `upload` callback.
 */
export type AiCompletionFn = (
  request: AiCompletionRequest,
  onChunk: (accumulatedText: string) => void,
  signal: AbortSignal
) => Promise<string>;

/** A suggestion currently being reviewed: either a replacement for a selection or a fresh insertion at the cursor. */
export interface AiSuggestion {
  from: number;
  to: number;
  originalText: string;
  suggestedText: string;
  /** `replace` swaps `[from, to]` on accept; `insert` adds a new block below on accept. */
  mode: 'replace' | 'insert';
  /** True while text is still streaming in; accept/insert-below are disabled until it settles. */
  isStreaming: boolean;
}

/** The last request that ran, kept around so "Try again" can be re-issued without retyping. */
export interface AiLastRequest {
  instruction: string;
  commandLabel: string;
  from: number;
  to: number;
}

export type AiPanelState =
  | { status: 'closed' }
  | { status: 'menu'; from: number; to: number }
  | { status: 'loading'; from: number; to: number; commandLabel: string }
  | { status: 'reviewing'; suggestion: AiSuggestion; commandLabel: string }
  | { status: 'error'; from: number; to: number; commandLabel: string; message: string };

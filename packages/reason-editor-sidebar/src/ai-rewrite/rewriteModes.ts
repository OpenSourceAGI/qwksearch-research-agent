/**
 * @module rewriteModes
 * @description Defines and persists the list of AI rewrite modes available
 * in the editor. Modes are stored in `localStorage` so users can customise
 * them without losing changes on refresh.
 */

/** A single AI rewrite mode configuration. */
export interface RewriteMode {
  /** Unique identifier used to reference the mode programmatically. */
  id: string;
  /** Human-readable label shown in the UI badges. */
  name: string;
  /** System prompt prepended to the selected text when calling the AI API. */
  prompt: string;
  /** Tailwind colour key used to style the mode badge (e.g. `'blue'`). */
  color?: string;
}

/** Built-in rewrite modes shipped with the application. */
export const DEFAULT_REWRITE_MODES: RewriteMode[] = [
  {
    id: 'clarity',
    name: 'Clarity',
    prompt: 'Rewrite this paragraph for maximum clarity and straightforwardness, keeping all original meaning but removing ambiguity and simplifying complex sentences:',
    color: 'blue',
  },
  {
    id: 'concise',
    name: 'Concise',
    prompt: 'Rewrite this text to be more concise, removing redundancy and filler while preserving all key points and tone. Aim for about 50% of the original length:',
    color: 'purple',
  },
  {
    id: 'summarize',
    name: 'Summarize',
    prompt: 'Summarize the following text into a shorter paragraph, keeping the main ideas and overall tone but removing details and repetition:',
    color: 'green',
  },
  {
    id: 'rephrase',
    name: 'Rephrase',
    prompt: 'Rephrase this paragraph with fresh wording and more engaging style, varying sentence structure and word choice while preserving the core message:',
    color: 'orange',
  },
  {
    id: 'expand',
    name: 'Expand',
    prompt: 'Keep the original paragraph as-is, then expand it by adding one additional paragraph that elaborates on the main idea, gives an example, or adds helpful context for the reader:',
    color: 'pink',
  },
];

/** `localStorage` key under which custom rewrite modes are persisted. */
const STORAGE_KEY = 'REASON-rewrite-modes';

/**
 * Returns the current list of rewrite modes. Reads from `localStorage` when
 * a saved list exists, otherwise falls back to {@link DEFAULT_REWRITE_MODES}.
 *
 * @returns Array of rewrite mode objects.
 */
export const getRewriteModes = (): RewriteMode[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load rewrite modes:', e);
  }
  return DEFAULT_REWRITE_MODES;
};

/**
 * Persists a rewrite mode list to `localStorage`.
 *
 * @param modes - The array of modes to store.
 */
export const saveRewriteModes = (modes: RewriteMode[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
  } catch (e) {
    console.error('Failed to save rewrite modes:', e);
  }
};

/**
 * Resets rewrite modes to {@link DEFAULT_REWRITE_MODES} by overwriting the
 * stored list in `localStorage`.
 */
export const resetRewriteModes = (): void => {
  saveRewriteModes(DEFAULT_REWRITE_MODES);
};

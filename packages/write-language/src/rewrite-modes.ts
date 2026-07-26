export interface RewriteMode {
  id: string;
  name: string;
  prompt: string;
  color?: string;
}

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

const STORAGE_KEY = 'REASON-rewrite-modes';

export const getRewriteModes = (): RewriteMode[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load rewrite modes:', e);
  }
  return DEFAULT_REWRITE_MODES;
};

export const saveRewriteModes = (modes: RewriteMode[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
  } catch (e) {
    console.error('Failed to save rewrite modes:', e);
  }
};

export const resetRewriteModes = (): void => {
  saveRewriteModes(DEFAULT_REWRITE_MODES);
};

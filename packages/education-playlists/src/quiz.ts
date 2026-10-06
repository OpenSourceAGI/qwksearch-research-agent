/**
 * @fileoverview The quiz hook: the shape of a NotebookLM-style quiz over a
 * playlist item, and the prompt that asks for one.
 *
 * This is a stub on purpose. Generating a grounded quiz needs the item's
 * material loaded as a source (a NotebookLM notebook, or an extracted
 * transcript/PDF), and that belongs to the host — this repo's
 * `notebooklm-api-client` or the web app's `/api/notebooklm` routes. The
 * widget shows a Quiz button only when the host passes a `QuizGenerator`.
 */
import type { PlaylistItem } from './types';

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answerIndex: number;
  explanation?: string;
}

export interface Quiz {
  itemId: string;
  title: string;
  questions: QuizQuestion[];
  /** Which engine wrote it, so a learner can weigh it. */
  source: 'notebooklm' | 'llm';
}

/** Supplied by the host; resolves to a quiz grounded in the item's material. */
export type QuizGenerator = (item: PlaylistItem, options?: { questionCount?: number }) => Promise<Quiz>;

/**
 * The instruction to send alongside the item's material — to NotebookLM's
 * "ask" with the item added as a source, or to a model with the extracted text.
 */
export function buildQuizPrompt(item: PlaylistItem, questionCount = 5): string {
  return [
    `Write a ${questionCount}-question multiple-choice quiz on "${item.title}"${item.courseNumber ? ` (${[item.institution, item.courseNumber].filter(Boolean).join(' ')})` : ''}.`,
    'Use only the attached source material. Each question has 4 choices and exactly one correct answer, with a one-sentence explanation citing the material.',
    'Reply with JSON only: {"questions":[{"prompt":"...","choices":["...","...","...","..."],"answerIndex":0,"explanation":"..."}]}',
  ].join('\n');
}

/** Validates a quiz a generator produced; drops malformed questions. */
export function parseQuiz(item: PlaylistItem, raw: unknown, source: Quiz['source']): Quiz | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { questions?: unknown };
  if (!Array.isArray(r.questions)) return null;
  const questions = r.questions.flatMap((entry) => {
    const q = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const choices = Array.isArray(q.choices) ? q.choices.filter((c): c is string => typeof c === 'string') : [];
    const answerIndex = Number(q.answerIndex);
    if (typeof q.prompt !== 'string' || choices.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) return [];
    return [{ prompt: q.prompt, choices, answerIndex, explanation: typeof q.explanation === 'string' ? q.explanation : undefined }];
  });
  return questions.length ? { itemId: item.id, title: `Quiz: ${item.title}`, questions, source } : null;
}

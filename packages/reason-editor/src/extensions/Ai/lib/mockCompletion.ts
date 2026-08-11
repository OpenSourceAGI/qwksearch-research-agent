/**
 * Default `getCompletion` implementation used when the host app does not
 * configure one. Simulates a streaming model response with a handful of
 * deterministic, offline text transforms so the extension is usable out of
 * the box — the same role `demoObjectUrlUpload` plays for the Image/Video
 * extensions. Real apps should pass their own `Ai.configure({ getCompletion })`
 * backed by an actual LLM call.
 */

import type { AiCompletionFn } from '../types';

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

function transform(instruction: string, selectedText: string): string {
  const lower = instruction.toLowerCase();
  const text = selectedText.trim();

  if (!text) {
    return `${instruction.trim() || 'New content'}.`;
  }
  if (lower.includes('emoji')) {
    return `${text} ✨📝`;
  }
  if (lower.includes('shorter') || lower.includes('concise')) {
    const words = text.split(/\s+/);
    const half = Math.max(1, Math.ceil(words.length / 2));
    return words.slice(0, half).join(' ');
  }
  if (lower.includes('longer') || lower.includes('expand')) {
    return `${text} In other words, this point matters because it clarifies the reader's understanding and adds useful context.`;
  }
  if (lower.includes('simplify')) {
    return text
      .replace(/[;:]/g, '.')
      .split('. ')
      .map((s) => s.trim())
      .filter(Boolean)
      .join('. ');
  }
  // "Fix spelling & grammar" / "Improve writing" / anything else: a light,
  // visible touch-up so the diff view has something to show.
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/\s{2,}/g, ' ');
}

export const mockAiCompletion: AiCompletionFn = async (request, onChunk, signal) => {
  const full = transform(request.instruction, request.selectedText);
  const words = full.split(' ');

  let acc = '';
  for (let i = 0; i < words.length; i++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    acc += (i === 0 ? '' : ' ') + words[i];
    onChunk(acc);
    await wait(35, signal);
  }

  return acc;
};

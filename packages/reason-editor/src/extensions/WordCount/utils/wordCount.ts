/**
 * Helper that computes word and character counts for editor content. Backs the WordCount extension's live totals.
 */

import type { Editor } from '@tiptap/core';

/**
 * Split a block of text into individual sentences.
 *
 * NOTE: This mirrors the `splitTextToSentences` helper distributed by the
 * `export-webpage` package. That package is not published to the public npm
 * registry, so the implementation is inlined here to keep the word-count tool
 * self-contained (no unresolvable dependency). The behaviour is the same:
 * text is segmented on sentence-terminating punctuation while keeping common
 * abbreviations and decimal numbers from being split apart.
 */
export function splitTextToSentences(text: string): string[] {
  if (!text) return [];

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  // Protect a few common abbreviations and decimal numbers so their dots are
  // not treated as sentence boundaries.
  const guarded = normalized
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\./gi, '$1<dot>')
    .replace(/(\d)\.(\d)/g, '$1<dot>$2');

  const matches = guarded.match(/[^.!?…。！？]+(?:[.!?…。！？]+|$)/g);
  if (!matches) return [];

  return matches
    .map((s) => s.replace(/<dot>/g, '.').trim())
    .filter((s) => s.length > 0);
}

export interface WordCountStats {
  words: number;
  charactersWithSpaces: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  links: number;
  images: number;
}

const EMPTY_STATS: WordCountStats = {
  words: 0,
  charactersWithSpaces: 0,
  charactersNoSpaces: 0,
  sentences: 0,
  paragraphs: 0,
  links: 0,
  images: 0,
};

/**
 * Compute word-count statistics for the current editor document.
 */
export function getWordCountStats(editor?: Editor | null): WordCountStats {
  if (!editor) return { ...EMPTY_STATS };

  const text = editor.getText({ blockSeparator: '\n' }) ?? '';

  const words = (text.match(/[^\s]+/g) ?? []).length;
  const charactersWithSpaces = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const sentences = splitTextToSentences(text).length;

  let paragraphs = 0;
  let links = 0;
  let images = 0;

  editor.state.doc.descendants((node) => {
    if (node.isTextblock && node.textContent.trim().length > 0) {
      paragraphs += 1;
    }

    if (node.type.name === 'image') {
      images += 1;
    }

    if (node.isText) {
      const hasLink = node.marks.some((mark) => mark.type.name === 'link');
      if (hasLink) links += 1;
    }
  });

  return {
    words,
    charactersWithSpaces,
    charactersNoSpaces,
    sentences,
    paragraphs,
    links,
    images,
  };
}

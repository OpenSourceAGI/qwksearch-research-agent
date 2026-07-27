/**
 * Extracts plain text from the document while mapping offsets back to editor positions. Lets Harper diagnostics map back onto the exact source ranges.
 */

import { type Node as PMNode } from '@tiptap/pm/model';

/**
 * A plain-text projection of a ProseMirror document together with a lookup
 * table that maps every character offset in that text back to an exact
 * ProseMirror document position.
 *
 * Harper reports issues as character spans over the plain text it was given,
 * but TipTap decorations need concrete document positions. `map` bridges the
 * two: `map[offset]` is the document position of the character at `offset`,
 * and `map[text.length]` is the position immediately after the last character.
 */
export interface TextWithMap {
  text: string;
  map: number[];
}

// Inserted between text blocks so words at a paragraph boundary are not
// concatenated into a single token (which would produce spurious lints).
const BLOCK_SEPARATOR = '\n\n';

/**
 * Walk `doc` in document order, emit normalized plain text for each
 * text-bearing block, and record an offset-to-position mapping table.
 *
 * Only text-block content is emitted; the separator characters are mapped to
 * the boundary position between blocks so that a span landing on them still
 * resolves to a valid, stable location.
 */
export function extractTextWithMap(doc: PMNode): TextWithMap {
  let text = '';
  const map: number[] = [];

  const pushSeparator = () => {
    if (text.length === 0) return;
    const boundary = (map.length > 0 ? map[map.length - 1] : 0) + 1;
    for (let i = 0; i < BLOCK_SEPARATOR.length; i += 1) {
      map[text.length + i] = boundary;
    }
    text += BLOCK_SEPARATOR;
  };

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      pushSeparator();

      // Inline content of a text block starts one position after the block.
      const base = pos + 1;
      node.forEach((child, offset) => {
        if (child.isText && child.text) {
          const t = child.text;
          for (let i = 0; i < t.length; i += 1) {
            map[text.length + i] = base + offset + i;
          }
          text += t;
        }
        // Inline non-text leaves (mentions, inline images, …) advance the
        // ProseMirror offset but contribute no linkable text, so they are
        // intentionally skipped here.
      });

      // Already handled inline content; do not descend further.
      return false;
    }
    return true;
  });

  // End boundary: the position immediately after the final character.
  map[text.length] = (map.length > 0 ? map[map.length - 1] : 0) + 1;

  return { text, map };
}

/**
 * Convert a Harper character span into a ProseMirror `[from, to]` range using
 * a mapping table produced by {@link extractTextWithMap}. Returns `null` when
 * the span cannot be resolved (out of range or zero-width).
 */
export function spanToRange(
  map: number[],
  start: number,
  end: number
): { from: number; to: number } | null {
  if (start < 0 || end < start || end >= map.length) return null;
  const from = map[start];
  const to = map[end];
  if (from == null || to == null || to <= from) return null;
  return { from, to };
}

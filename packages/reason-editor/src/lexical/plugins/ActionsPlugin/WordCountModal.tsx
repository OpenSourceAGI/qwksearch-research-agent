/**
 * @fileoverview Modal showing document statistics: word/char/sentence/paragraph counts, links, images.
 */

import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';
import { $getRoot, $isElementNode, $isTextNode, $isParagraphNode } from 'lexical';
import { $isLinkNode } from '@lexical/link';

interface DocumentStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  links: number;
  images: number;
}

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/[^.!?\n]+[.!?]+(?:["')\]]*)?|[^.!?\n]+$/g);
  return matches ? matches.filter((s) => s.trim().length > 0).length : 0;
}

function computeStats(editor: LexicalEditor): DocumentStats {
  const stats: DocumentStats = {
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    sentences: 0,
    paragraphs: 0,
    links: 0,
    images: 0,
  };

  editor.getEditorState().read(() => {
    const root = $getRoot();
    const text = root.getTextContent();

    stats.characters = text.length;
    stats.charactersNoSpaces = text.replace(/\s/g, '').length;
    stats.words = text.trim() ? text.trim().split(/\s+/).length : 0;
    stats.sentences = countSentences(text);

    const walk = (node: any) => {
      if ($isParagraphNode(node)) {
        if (node.getTextContent().trim().length > 0) stats.paragraphs += 1;
      }
      if ($isLinkNode(node)) stats.links += 1;
      if (node.getType && node.getType() === 'image') stats.images += 1;
      if ($isElementNode(node) || node.getChildren) {
        const children = typeof node.getChildren === 'function' ? node.getChildren() : [];
        for (const child of children) walk(child);
      }
    };
    walk(root);
  });

  return stats;
}

const formatNum = (n: number) => n.toLocaleString();

export default function WordCountModal({ editor }: { editor: LexicalEditor }): JSX.Element {
  const stats = computeStats(editor);

  const rows: Array<[string, number]> = [
    ['Words', stats.words],
    ['Characters (with spaces)', stats.characters],
    ['Characters (no spaces)', stats.charactersNoSpaces],
    ['Sentences', stats.sentences],
    ['Paragraphs', stats.paragraphs],
    ['Links', stats.links],
    ['Images', stats.images],
  ];

  return (
    <div style={{ minWidth: 280 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: '6px 12px 6px 0', color: 'var(--muted-foreground, #888)' }}>
                {label}
              </td>
              <td style={{ padding: '6px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {formatNum(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

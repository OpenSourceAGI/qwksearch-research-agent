
/**
 * @fileoverview Plugin for enabling markdown keyboard shortcuts in the Lexical editor.
 */

import type { JSX } from 'react';

import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import * as React from 'react';

import { PLAYGROUND_TRANSFORMERS } from '../MarkdownTransformers';

/**
 * Plugin that enables markdown shortcuts like '#' for headings and '*' for lists.
 */
export default function MarkdownPlugin(): JSX.Element {
  return <MarkdownShortcutPlugin transformers={PLAYGROUND_TRANSFORMERS} />;
}

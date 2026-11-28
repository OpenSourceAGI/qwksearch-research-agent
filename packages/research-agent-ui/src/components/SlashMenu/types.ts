/**
 * @fileoverview Shared types for the slash menu.
 */
import type { ReactNode } from 'react';
import type { SlashMatchable } from './slashMatch';

/** Which group a row belongs to. */
export type SlashItemKind = 'command' | 'file';

/**
 * One selectable row.
 *
 * Choosing a row first replaces the typed `/query` token with `insertText`
 * (an empty or missing value just removes the token), then calls `run`.
 * Template commands and file mentions use `insertText`; commands that act
 * immediately and attachments use `run`.
 */
export interface SlashItem extends SlashMatchable {
  /** Stable and unique across kinds; used as the DOM id suffix. */
  id: string;
  kind: SlashItemKind;
  icon: ReactNode;
  /** Muted trailing text: the `/command` spelling, or a file extension. */
  hint?: string;
  insertText?: string;
  run?: () => void;
}

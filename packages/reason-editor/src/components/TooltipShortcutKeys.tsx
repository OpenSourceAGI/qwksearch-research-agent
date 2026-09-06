/**
 * Shortcut hint rendered inside a toolbar tooltip: the action's *current*
 * binding (user overrides included) as a row of highlighted <kbd> chips.
 * Styled by `.richtext-shortcut-keys` in styles/global.scss, since tooltip
 * content is portalled outside the editor root.
 */

import React from 'react';

import { useLiveShortcutKeys } from '@/shortcuts';
import { getShortcutKey } from '@/utils/plateform';

export interface TooltipShortcutKeysProps {
  /* Registry action id, when known */
  shortcutId?: string;
  /* Default keys, matched against the registry to find the live binding */
  shortcutKeys?: string[];
}

export function TooltipShortcutKeys({ shortcutId, shortcutKeys }: TooltipShortcutKeysProps) {
  const keys = useLiveShortcutKeys(shortcutKeys, shortcutId);

  if (!keys?.length) return null;

  return (
    <span className='richtext-shortcut-keys'>
      {keys.map((key, index) => (
        <kbd key={`${key}-${index}`}>{getShortcutKey(key)}</kbd>
      ))}
    </span>
  );
}

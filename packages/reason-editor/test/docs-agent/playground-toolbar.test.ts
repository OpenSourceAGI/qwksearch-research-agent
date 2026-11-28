/**
 * The playground toolbar is a second surface over the same editor, so what is
 * worth pinning is that it does not quietly lose product functionality the
 * shared `REASON_TOOLBAR` offers, and that it still looks like REASON.
 */

import { KEYS } from 'platejs';
import { describe, expect, it } from 'vitest';

import { insertMenuGroups } from '../../src/docs-agent/plate/ui/insert-toolbar-button';
import { REASON_TOOLBAR_SKIN } from '../../src/docs-agent/plate/ui/reason-toolbar-skin';
import { turnIntoItems } from '../../src/docs-agent/plate/ui/turn-into-toolbar-button';

/** Block commands in `REASON_TOOLBAR`'s Block Format menu, as Plate node types. */
const BLOCK_FORMAT_TYPES = [
  KEYS.p,
  KEYS.h1,
  KEYS.h2,
  KEYS.h3,
  KEYS.h4,
  KEYS.h5,
  KEYS.h6,
  KEYS.ul,
  KEYS.ol,
  KEYS.listTodo,
  KEYS.blockquote,
  KEYS.codeBlock,
];

describe('playground turn-into menu', () => {
  it('offers every block type the shared Block Format menu does', () => {
    const offered = new Set(turnIntoItems.map((item) => item.value));

    for (const type of BLOCK_FORMAT_TYPES) {
      expect(offered.has(type), `turn into ${type}`).toBe(true);
    }
  });

  it('gives every entry a label and a unique value', () => {
    const values = turnIntoItems.map((item) => item.value);

    expect(new Set(values).size).toBe(values.length);
    for (const item of turnIntoItems) expect(item.label).toBeTruthy();
  });
});

describe('playground insert menu', () => {
  it('covers the shared Insert menu, minus what it routes elsewhere', () => {
    const offered = new Set(
      insertMenuGroups.flatMap(({ items }) => items.map((item) => item.value)),
    );

    // `REASON_TOOLBAR`'s Insert menu, less emoji (its own toolbar button, via
    // the emoji picker) and callout/columns/table, which are asserted below.
    for (const type of [
      KEYS.link,
      KEYS.table,
      KEYS.img,
      KEYS.callout,
      KEYS.hr,
      KEYS.video,
      KEYS.equation,
    ]) {
      expect(offered.has(type), `insert ${type}`).toBe(true);
    }

    expect(offered.has('action_three_columns'), 'insert columns').toBe(true);
  });

  it('never lists the same node type twice', () => {
    const values = insertMenuGroups.flatMap(({ items }) =>
      items.map((item) => item.value),
    );

    expect(new Set(values).size).toBe(values.length);
  });

  it('gives every entry a label and an icon', () => {
    for (const { items } of insertMenuGroups) {
      for (const item of items) {
        expect(item.label, `${item.value} label`).toBeTruthy();
        expect(item.icon, `${item.value} icon`).toBeTruthy();
      }
    }
  });
});

describe('REASON_TOOLBAR_SKIN', () => {
  // The strip comes from `shared/toolbar-look.ts`, the same constants
  // `shared/toolbar-renderer.tsx` renders, so the two toolbars cannot drift.
  it.each(['gap-0.5', 'px-2', 'border-b-border', 'bg-background'])(
    'keeps the shared toolbar token %s',
    (token) => {
      expect(REASON_TOOLBAR_SKIN).toContain(token);
    },
  );

  it('sizes icons like the shared toolbar but spares dropdown chevrons', () => {
    expect(REASON_TOOLBAR_SKIN).toContain('svg:not([data-icon])]:size-4');
  });
});

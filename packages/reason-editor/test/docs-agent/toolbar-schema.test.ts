import { describe, expect, it } from 'vitest';

import {
  collectToolbarCommands,
  REASON_TOOLBAR,
  type ToolbarItem,
} from '../../src/docs-agent/shared/toolbar-schema';

function walk(items: ToolbarItem[], visit: (item: ToolbarItem, depth: number) => void, depth = 0) {
  for (const item of items) {
    visit(item, depth);
    if (item.kind === 'menu') walk(item.children, visit, depth + 1);
  }
}

describe('REASON_TOOLBAR', () => {
  it('gives every node a unique id', () => {
    const ids: string[] = [];
    walk(REASON_TOOLBAR, (item) => ids.push(item.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every button a label and an icon', () => {
    walk(REASON_TOOLBAR, (item) => {
      if (item.kind !== 'button' && item.kind !== 'menu') return;

      expect(item.label, `${item.id} label`).toBeTruthy();
      expect(typeof item.icon, `${item.id} icon`).not.toBe('undefined');
    });
  });

  it('never repeats a command across the tree', () => {
    const commands = collectToolbarCommands();

    expect(new Set(commands).size).toBe(commands.length);
  });

  it('keeps the history controls first, in undo/redo order', () => {
    expect(REASON_TOOLBAR[0]).toMatchObject({ id: 'undo', kind: 'button' });
    expect(REASON_TOOLBAR[1]).toMatchObject({ id: 'redo', kind: 'button' });
    expect(REASON_TOOLBAR[2]).toMatchObject({ kind: 'separator' });
  });

  it('gates the table submenu behind an active table', () => {
    const tableMenu = REASON_TOOLBAR.find(
      (item) => item.kind === 'menu' && item.id === 'table-tools',
    );

    expect(tableMenu).toBeDefined();
    expect(tableMenu).toMatchObject({ visibleWhenActive: 'table' });
  });

  it('scopes every table action under the contextual menu', () => {
    const tableCommands = collectToolbarCommands().filter((command) =>
      command.startsWith('table.'),
    );

    const menu = REASON_TOOLBAR.find(
      (item): item is Extract<ToolbarItem, { kind: 'menu' }> =>
        item.kind === 'menu' && item.id === 'table-tools',
    );

    const insideMenu = collectToolbarCommands(menu!.children);

    expect(tableCommands.sort()).toEqual(
      insideMenu.filter((command) => command.startsWith('table.')).sort(),
    );
  });

  it('nests no deeper than one submenu level', () => {
    let maxDepth = 0;
    walk(REASON_TOOLBAR, (_item, depth) => {
      maxDepth = Math.max(maxDepth, depth);
    });

    expect(maxDepth).toBeLessThanOrEqual(2);
  });
});

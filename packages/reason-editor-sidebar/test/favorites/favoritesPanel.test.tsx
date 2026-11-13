/**
 * The Files panel's favorites: a file's context menu favorites it and the
 * tree shows a gold star, and the header's star toggle swaps the tree for a
 * flat list of favorited files, most recently used first.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarContent } from '../../src/SidebarContent';
import { Sidebar } from '../../src/Sidebar';
import type { Document } from '../../src/documents/DocumentTree';
import {
  FAVORITES_STORAGE_KEY,
  LAST_USED_STORAGE_KEY,
  getFavorites,
  getLastUsed,
} from '../../src/favorites/favorites';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function doc(id: string, title: string, parentId: string | null = null, isFolder = false): Document {
  return { id, title, content: '', parentId, isFolder, isExpanded: true } as Document;
}

const DOCUMENTS = [
  doc('folder', 'Folder', null, true),
  doc('a', 'Alpha', 'folder'),
  doc('b', 'Bravo'),
  doc('c', 'Charlie'),
];

const renderFiles = (onSelect: (id: string) => void = () => {}) => {
  act(() => {
    root.render(
      <SidebarContent
        panels={['files']}
        persistenceKey="test"
        activeDocuments={DOCUMENTS}
        activeId={null}
        onSelect={onSelect}
        onAdd={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onMove={() => {}}
      />,
    );
  });
};

const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

const treeRow = (title: string) => {
  const row = Array.from(container.querySelectorAll('[role="treeitem"]')).find(
    (el) => el.textContent?.trim() === title,
  );
  if (!row) throw new Error(`No tree row for "${title}"`);
  return row;
};

const menuItems = () =>
  Array.from(document.querySelectorAll('[role="menuitem"]')).map((el) => el.textContent?.trim());

const openContextMenu = (el: Element) =>
  act(() => {
    el.querySelector('span, div, button')!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
  });

const favoritesToggle = () =>
  container.querySelector('button[aria-pressed]') as HTMLButtonElement;

const favoriteRowTitles = () =>
  Array.from(container.querySelectorAll('[data-testid="favorite-row"]')).map(
    (row) => row.querySelector('span.truncate')?.textContent,
  );

describe('favoriting from the file context menu', () => {
  it('favorites a file and shows a gold star on its row', () => {
    renderFiles();
    expect(treeRow('Bravo').querySelector('[data-testid="favorite-star"]')).toBeNull();

    openContextMenu(treeRow('Bravo'));
    const favorite = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === 'Favorite',
    )!;
    click(favorite);

    expect(getFavorites()).toHaveProperty('b');
    expect(treeRow('Bravo').querySelector('[data-testid="favorite-star"]')).not.toBeNull();
  });

  it('offers Unfavorite on a favorited file', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ b: 1 }));
    renderFiles();
    openContextMenu(treeRow('Bravo'));
    const unfavorite = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === 'Unfavorite',
    )!;
    click(unfavorite);
    expect(getFavorites()).toEqual({});
    expect(treeRow('Bravo').querySelector('[data-testid="favorite-star"]')).toBeNull();
  });

  it('does not offer Favorite on a folder', () => {
    renderFiles();
    openContextMenu(treeRow('Folder'));
    expect(menuItems()).toContain('Add Note');
    expect(menuItems()).not.toContain('Favorite');
  });
});

describe('favorites-only view', () => {
  it('shows only favorites, flattened and most recently used first', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ a: 1, c: 1 }));
    localStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify({ a: 100, c: 200, b: 300 }));
    renderFiles();

    expect(favoritesToggle().getAttribute('aria-pressed')).toBe('false');
    click(favoritesToggle());

    expect(favoritesToggle().getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[role="treeitem"]')).toBeNull();
    // Alpha lives in a folder but is listed flat; Charlie was used last.
    expect(favoriteRowTitles()).toEqual(['Charlie', 'Alpha']);

    click(favoritesToggle());
    expect(container.querySelector('[data-testid="favorite-row"]')).toBeNull();
    expect(treeRow('Bravo')).toBeTruthy();
  });

  it('opens a favorite on click and unfavorites from its star', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ a: 1, c: 1 }));
    const onSelect = vi.fn();
    renderFiles(onSelect);
    click(favoritesToggle());

    click(container.querySelector('[data-testid="favorite-row"]')!);
    expect(onSelect).toHaveBeenCalled();

    click(container.querySelector('button[aria-label="Unfavorite Alpha"]')!);
    expect(favoriteRowTitles()).toEqual(['Charlie']);
  });

  it('explains how to add favorites when there are none', () => {
    renderFiles();
    click(favoritesToggle());
    expect(container.textContent).toContain('No favorites yet');
  });

  it('remembers the toggle per sidebar', () => {
    renderFiles();
    click(favoritesToggle());
    act(() => root.unmount());
    root = createRoot(container);
    renderFiles();
    expect(favoritesToggle().getAttribute('aria-pressed')).toBe('true');
  });
});

describe('last-used tracking', () => {
  it('stamps the active document whenever it changes', () => {
    const props = {
      documents: DOCUMENTS,
      activeDocument: undefined,
      onSelect: () => {},
      onAdd: () => {},
      onDelete: () => {},
      onDuplicate: () => {},
      onToggleExpand: () => {},
      onMove: () => {},
      searchQuery: '',
      onSearchChange: () => {},
      onSearchClear: () => {},
      onSearchFocus: () => {},
      leftPanels: ['files' as const],
      onLeftPanelsChange: () => {},
      rightPanels: [],
      onRightPanelsChange: () => {},
    };
    act(() => root.render(<Sidebar {...props} activeId="b" />));
    expect(getLastUsed()).toHaveProperty('b');
    act(() => root.render(<Sidebar {...props} activeId="c" />));
    expect(getLastUsed().c).toBeGreaterThanOrEqual(getLastUsed().b);
  });
});

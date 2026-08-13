import { describe, it, expect } from 'vitest';
import { filterOutline, isHiddenByCollapsedAncestor, type OutlineItem } from './OutlineView';

const outline: OutlineItem[] = [
  { id: 'a', level: 1, text: 'Alpha', line: 0 },
  { id: 'b', level: 2, text: 'Alpha Child', line: 1 },
  { id: 'c', level: 1, text: 'Beta', line: 2 },
  { id: 'd', level: 2, text: 'Beta Child', line: 3 },
];

describe('filterOutline', () => {
  it('returns the full outline when the query is blank', () => {
    expect(filterOutline(outline, '')).toBe(outline);
    expect(filterOutline(outline, '   ')).toBe(outline);
  });

  it('matches heading text case-insensitively', () => {
    expect(filterOutline(outline, 'alpha')).toEqual([outline[0], outline[1]]);
    expect(filterOutline(outline, 'BETA')).toEqual([outline[2], outline[3]]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterOutline(outline, 'nonexistent')).toEqual([]);
  });
});

describe('isHiddenByCollapsedAncestor', () => {
  it('never hides the first item', () => {
    expect(isHiddenByCollapsedAncestor(outline, new Set(['a']), 0)).toBe(false);
  });

  it('hides a child whose parent heading is collapsed', () => {
    expect(isHiddenByCollapsedAncestor(outline, new Set(['a']), 1)).toBe(true);
  });

  it('does not hide a child whose parent heading is expanded', () => {
    expect(isHiddenByCollapsedAncestor(outline, new Set(), 1)).toBe(false);
  });

  it('does not leak collapse state across sibling top-level sections', () => {
    // 'a' (index 0) is collapsed, but 'c' and 'd' sit under sibling 'c', not 'a'.
    expect(isHiddenByCollapsedAncestor(outline, new Set(['a']), 2)).toBe(false);
    expect(isHiddenByCollapsedAncestor(outline, new Set(['a']), 3)).toBe(false);
  });

  it('reflects the correct visibility when given the real outline index of a filtered item', () => {
    // Regression test: OutlineView used to index into the full `outline` array
    // using the filtered list's positional index, which diverges from the
    // item's real index whenever filtering removes preceding items.
    const collapsedIds = new Set(['a']);
    const filtered = filterOutline(outline, 'beta'); // [c, d], real indices 2 and 3

    const realIndices = filtered.map((item) => outline.findIndex((o) => o.id === item.id));
    expect(realIndices).toEqual([2, 3]);

    const visibility = realIndices.map((index) => isHiddenByCollapsedAncestor(outline, collapsedIds, index));
    expect(visibility).toEqual([false, false]);

    // Using the filtered list's positional index (the pre-fix bug) instead of
    // the real index produces the wrong answer for 'd': it would incorrectly
    // check 'b' (outline[1]) and report 'd' as hidden.
    const buggyPositionalIndices = filtered.map((_item, index) => index);
    const buggyVisibility = buggyPositionalIndices.map((index) =>
      isHiddenByCollapsedAncestor(outline, collapsedIds, index)
    );
    expect(buggyVisibility).toEqual([false, true]);
  });
});

/**
 * @fileoverview Slash menu logic: trigger detection, fuzzy ranking and
 * highlighting, grouping, keyboard actions, and the command/file registries.
 */
import { describe, expect, it, vi } from 'vitest';
import { detectSlashTrigger, replaceSlashToken } from '../src/components/SlashMenu/slashTrigger';
import {
  fuzzyMatch,
  groupRanked,
  highlightSegments,
  rankSlashItems,
  windowDescription,
} from '../src/components/SlashMenu/slashMatch';
import { moveIndex, slashKeyAction } from '../src/components/SlashMenu/slashKeyboard';
import { buildSlashCommands } from '../src/components/SlashMenu/slashCommands';
import {
  buildSlashFileItems,
  libraryDocumentToFile,
  previewContent,
} from '../src/components/SlashMenu/slashFiles';

describe('detectSlashTrigger', () => {
  it('opens on a slash at the start of the input', () => {
    expect(detectSlashTrigger('/', 1)).toEqual({ start: 0, end: 1, query: '' });
    expect(detectSlashTrigger('/sum', 4)).toEqual({ start: 0, end: 4, query: 'sum' });
  });

  it('opens on a slash after whitespace, including a newline', () => {
    expect(detectSlashTrigger('hello /se', 9)).toEqual({ start: 6, end: 9, query: 'se' });
    expect(detectSlashTrigger('line one\n/new', 13)).toEqual({ start: 9, end: 13, query: 'new' });
  });

  it('does not open inside URLs, paths or fractions', () => {
    expect(detectSlashTrigger('see https://example.com', 23)).toBeNull();
    expect(detectSlashTrigger('see https://', 12)).toBeNull();
    expect(detectSlashTrigger('src/components', 14)).toBeNull();
    expect(detectSlashTrigger('1/2', 3)).toBeNull();
  });

  it('closes once whitespace follows the token or a second slash appears', () => {
    expect(detectSlashTrigger('/new chat', 9)).toBeNull();
    expect(detectSlashTrigger('/usr/local', 10)).toBeNull();
  });

  it('is driven by the caret, not the end of the text', () => {
    expect(detectSlashTrigger('/set tail', 4)).toEqual({ start: 0, end: 4, query: 'set' });
    expect(detectSlashTrigger('/set tail', 9)).toBeNull();
  });

  it('closes when the slash is backspaced away', () => {
    expect(detectSlashTrigger('', 0)).toBeNull();
    expect(detectSlashTrigger('abc', 3)).toBeNull();
  });
});

describe('replaceSlashToken', () => {
  it('swaps the token for the replacement and places the caret after it', () => {
    const t = detectSlashTrigger('/sea', 4)!;
    expect(replaceSlashToken('/sea', t, 'Search the web for ')).toEqual({
      value: 'Search the web for ',
      caret: 19,
    });
  });

  it('keeps trailing text intact', () => {
    const t = detectSlashTrigger('a /se b', 5)!;
    expect(replaceSlashToken('a /se b', t, 'X ')).toEqual({ value: 'a X  b', caret: 4 });
  });

  it('removes the token and one adjoining space when the replacement is empty', () => {
    const t = detectSlashTrigger('fix /new later', 8)!;
    expect(replaceSlashToken('fix /new later', t, '')).toEqual({ value: 'fix later', caret: 4 });
  });
});

describe('fuzzyMatch', () => {
  it('matches a case-insensitive subsequence and reports indices', () => {
    const m = fuzzyMatch('gg', 'Debugging delivery')!;
    expect(m.indices).toEqual([4, 5]);
  });

  it('returns null when letters are missing or out of order', () => {
    expect(fuzzyMatch('xyz', 'Summarize')).toBeNull();
    expect(fuzzyMatch('mus', 'Summarize')).toBeNull();
  });

  it('treats an empty query as matching everything', () => {
    expect(fuzzyMatch('', 'anything')).toEqual({ score: 0, indices: [] });
  });

  it('prefers contiguous and prefix matches', () => {
    const prefix = fuzzyMatch('set', 'Settings')!;
    const scattered = fuzzyMatch('set', 'Show extra tools')!;
    expect(prefix.score).toBeGreaterThan(scattered.score);
  });

  it('rejects matches stretched wider than maxSpan', () => {
    expect(fuzzyMatch('rpt', 'Compare options side by side', 5)).toBeNull();
    expect(fuzzyMatch('dbg', 'debugging', 5)).not.toBeNull();
  });

  it('keeps matched letters tight rather than spanning the string', () => {
    expect(fuzzyMatch('ab', 'a ... ab')!.indices).toEqual([6, 7]);
  });
});

describe('rankSlashItems', () => {
  const items = [
    { name: 'Reset chat', description: 'Clear the conversation' },
    { name: 'Settings', description: 'Models and preferences' },
    { name: 'Library', description: 'Open the settings of saved files' },
    { name: 'Upload file', keywords: 'attach' },
  ];

  it('returns everything in order for an empty query', () => {
    expect(rankSlashItems(items, '').map((r) => r.item.name)).toEqual(items.map((i) => i.name));
  });

  it('ranks name matches above description-only matches', () => {
    const names = rankSlashItems(items, 'sett').map((r) => r.item.name);
    // "Reset chat" is a (scattered) name match, so it still beats Library's description hit.
    expect(names).toEqual(['Settings', 'Reset chat', 'Library']);
  });

  it('matches descriptions and exposes their indices', () => {
    const [hit] = rankSlashItems(items, 'conv');
    expect(hit!.item.name).toBe('Reset chat');
    expect(hit!.nameIndices).toEqual([]);
    expect(hit!.descriptionIndices.length).toBe(4);
  });

  it('does not match scattered letters across a long description', () => {
    const rows = [{ name: 'Compare', description: 'Compare options side by side in a table' }];
    expect(rankSlashItems(rows, 'rpt')).toEqual([]);
  });

  it('matches hidden keywords', () => {
    expect(rankSlashItems(items, 'attach').map((r) => r.item.name)).toEqual(['Upload file']);
  });

  it('drops rows that do not match', () => {
    expect(rankSlashItems(items, 'zzzz')).toEqual([]);
  });
});

describe('highlightSegments / windowDescription', () => {
  it('splits text into plain and matched runs', () => {
    expect(highlightSegments('Settings', [0, 1])).toEqual([
      { text: 'Se', match: true },
      { text: 'ttings', match: false },
    ]);
    expect(highlightSegments('abc', [])).toEqual([{ text: 'abc', match: false }]);
  });

  it('merges adjacent matches and keeps non-adjacent ones separate', () => {
    const segs = highlightSegments('abcde', [0, 2, 3]);
    expect(segs.filter((s) => s.match).map((s) => s.text)).toEqual(['a', 'cd']);
  });

  it('windows a long description around the first match', () => {
    const text = `${'x'.repeat(60)}needle tail`;
    const w = windowDescription(text, [60, 61]);
    expect(w.text.startsWith('…')).toBe(true);
    expect(w.indices.map((i) => w.text[i])).toEqual(['n', 'e']);
  });

  it('leaves early matches untouched', () => {
    expect(windowDescription('short text', [1])).toEqual({ text: 'short text', indices: [1] });
  });
});

describe('groupRanked', () => {
  const rows = (...kinds: [string, number][]) =>
    kinds.map(([kind, score], i) => ({
      item: { name: `n${i}`, kind },
      score,
      nameIndices: [],
      descriptionIndices: [],
    }));

  it('splits by kind, commands first on ties', () => {
    const groups = groupRanked(rows(['file', 0], ['command', 0], ['file', 0]), ['command', 'file']);
    expect(groups.map((g) => [g.kind, g.rows.length])).toEqual([['command', 1], ['file', 2]]);
  });

  it('lifts the section holding the best match', () => {
    const groups = groupRanked(rows(['file', 9], ['command', 2], ['command', 1]), ['command', 'file']);
    expect(groups.map((g) => g.kind)).toEqual(['file', 'command']);
  });
});

describe('slashKeyAction', () => {
  const state = { activeIndex: 1, count: 3 };

  it('moves with the arrow keys and wraps', () => {
    expect(slashKeyAction({ key: 'ArrowDown' }, state)).toEqual({ type: 'move', index: 2 });
    expect(slashKeyAction({ key: 'ArrowUp' }, state)).toEqual({ type: 'move', index: 0 });
    expect(slashKeyAction({ key: 'ArrowDown' }, { activeIndex: 2, count: 3 })).toEqual({ type: 'move', index: 0 });
    expect(slashKeyAction({ key: 'ArrowUp' }, { activeIndex: 0, count: 3 })).toEqual({ type: 'move', index: 2 });
  });

  it('selects the active row with Enter or Tab', () => {
    expect(slashKeyAction({ key: 'Enter' }, state)).toEqual({ type: 'select', index: 1 });
    expect(slashKeyAction({ key: 'Tab' }, state)).toEqual({ type: 'select', index: 1 });
  });

  it('closes on Escape', () => {
    expect(slashKeyAction({ key: 'Escape' }, state)).toEqual({ type: 'close' });
  });

  it('ignores everything during IME composition', () => {
    for (const key of ['Enter', 'Tab', 'ArrowDown', 'Escape']) {
      expect(slashKeyAction({ key, isComposing: true }, state)).toEqual({ type: 'none' });
    }
    expect(slashKeyAction({ key: 'Process' }, state)).toEqual({ type: 'none' });
  });

  it('lets Shift+Enter and modified arrows through', () => {
    expect(slashKeyAction({ key: 'Enter', shiftKey: true }, state)).toEqual({ type: 'none' });
    expect(slashKeyAction({ key: 'ArrowDown', metaKey: true }, state)).toEqual({ type: 'none' });
  });

  it('passes Enter, Tab and arrows through when there are no rows', () => {
    const empty = { activeIndex: 0, count: 0 };
    for (const key of ['Enter', 'Tab', 'ArrowDown', 'ArrowUp']) {
      expect(slashKeyAction({ key }, empty)).toEqual({ type: 'none' });
    }
    expect(slashKeyAction({ key: 'Escape' }, empty)).toEqual({ type: 'close' });
  });

  it('wraps indices at both ends', () => {
    expect(moveIndex(0, -1, 4)).toBe(3);
    expect(moveIndex(3, 1, 4)).toBe(0);
    expect(moveIndex(0, 1, 0)).toBe(0);
  });
});

describe('buildSlashCommands', () => {
  const ctx = () => ({
    newChat: vi.fn(),
    clearComposer: vi.fn(),
    openSettings: vi.fn(),
    openFilePicker: vi.fn(),
    incognito: false,
    setIncognito: vi.fn(),
    focusMode: 'webSearch',
    setFocusMode: vi.fn(),
    summarizePrompt: 'Summarize in bullet points',
  });

  it('defines template commands that insert text and run commands that act', () => {
    const items = buildSlashCommands(ctx());
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId['cmd:search']!.insertText).toBe('Search the web for ');
    expect(byId['cmd:search']!.run).toBeUndefined();
    expect(byId['cmd:summarize']!.insertText).toBe('Summarize in bullet points: ');
    expect(byId['cmd:new']!.run).toBeTypeOf('function');
    expect(byId['cmd:new']!.insertText).toBeUndefined();
  });

  it('wires run commands to the context', () => {
    const c = ctx();
    const byId = Object.fromEntries(buildSlashCommands(c).map((i) => [i.id, i]));
    byId['cmd:new']!.run!();
    byId['cmd:clear']!.run!();
    byId['cmd:settings']!.run!();
    byId['cmd:incognito']!.run!();
    byId['cmd:upload']!.run!();
    expect(c.newChat).toHaveBeenCalled();
    expect(c.clearComposer).toHaveBeenCalled();
    expect(c.openSettings).toHaveBeenCalled();
    expect(c.setIncognito).toHaveBeenCalledWith(true);
    expect(c.openFilePicker).toHaveBeenCalled();
  });

  it('adds one row per focus mode and marks the current one', () => {
    const c = ctx();
    const focus = buildSlashCommands(c).filter((i) => i.id.startsWith('cmd:focus:'));
    expect(focus.length).toBeGreaterThan(1);
    expect(focus.find((i) => i.id === 'cmd:focus:webSearch')!.hint).toBe('current');
    focus.find((i) => i.id === 'cmd:focus:academicSearch')!.run!();
    expect(c.setFocusMode).toHaveBeenCalledWith('academicSearch');
  });

  it('only offers /voice when speech input exists', () => {
    expect(buildSlashCommands(ctx()).some((i) => i.id === 'cmd:voice')).toBe(false);
    const toggleVoice = vi.fn();
    const withVoice = buildSlashCommands({ ...ctx(), toggleVoice });
    withVoice.find((i) => i.id === 'cmd:voice')!.run!();
    expect(toggleVoice).toHaveBeenCalled();
  });

  it('has unique ids and a description on every row', () => {
    const items = buildSlashCommands({ ...ctx(), toggleVoice: vi.fn() });
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(items.every((i) => i.kind === 'command' && i.description)).toBe(true);
  });
});

describe('buildSlashFileItems', () => {
  it('mentions files already in the chat and attaches library documents', () => {
    const attachDocument = vi.fn();
    const items = buildSlashFileItems({
      attachedFiles: [{ fileId: 'f1', fileName: 'report.pdf', fileExtension: 'pdf' }],
      documents: [
        { id: 1, title: 'Notes', content: '# Heading\n\nSome **bold** text' },
        { id: 2, name: 'Folder', isFolder: true },
      ],
      attachDocument,
    });
    expect(items.map((i) => i.id)).toEqual(['file:attached:f1', 'file:doc:1']);
    expect(items[0]!.insertText).toBe('@report.pdf ');
    expect(items[0]!.hint).toBe('.pdf');
    expect(items[1]!.description).toBe('Heading Some bold text');
    items[1]!.run!();
    expect(attachDocument).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('turns a library document into an uploadable file', async () => {
    const md = libraryDocumentToFile({ id: 1, title: 'My: notes', content: '# Hi' });
    expect(md.name).toBe('My- notes.md');
    expect(await md.text()).toBe('# Hi');
    const html = libraryDocumentToFile({ id: 2, title: 'Page.html', content: '<p>x</p>' });
    expect(html.name).toBe('Page.html');
  });

  it('previews content on one plain line', () => {
    expect(previewContent('<p>Hello</p>\n\n<b>world</b>')).toBe('Hello world');
    expect(previewContent(undefined)).toBe('');
  });
});

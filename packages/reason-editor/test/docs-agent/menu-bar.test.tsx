/**
 * The Google Docs-style menu bar and the Harper spelling and grammar plugin.
 *
 * Harper itself is WebAssembly and does not load under jsdom, so the plugin
 * tests seed `issues` directly: what is under test is how issues map onto the
 * document (decorations, accept, ignore), not Harper's own judgement.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { KEYS, type Value } from 'platejs';
import { createPlateEditor, Plate, usePlateEditor } from 'platejs/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getHarperIssueRange,
  HarperPlugin,
  pathKey,
  type PlateHarperIssue,
  visibleHarperIssues,
} from '@/docs-agent/plate/kits/harper-kit';
import {
  changeCase,
  countWords,
  documentFileName,
  findMatches,
  replaceAll,
  transformCase,
} from '@/docs-agent/plate/menu-actions';
import { EMPTY_PLATE_VALUE, platePlugins } from '@/docs-agent/plate/plate-editor-config';
import { formatShortcut, MenuBar } from '@/docs-agent/plate/ui/menu-bar';

const paragraph = (...children: Record<string, unknown>[]) => ({ type: KEYS.p, children });

function makeEditor(value: Value) {
  return createPlateEditor({ plugins: platePlugins, value });
}

function seedIssue(
  editor: ReturnType<typeof makeEditor>,
  issue: Partial<PlateHarperIssue> & Pick<PlateHarperIssue, 'path' | 'start' | 'end'>,
) {
  const full: PlateHarperIssue = {
    id: `${pathKey(issue.path)}:${issue.start}:${issue.end}`,
    kind: 'Spelling',
    spelling: true,
    message: 'Did you mean “the”?',
    problemText: 'teh',
    suggestions: [{ kind: 0, replacement: 'the', label: 'the' }],
    ...issue,
  };
  const block = editor.api.node(issue.path)!;
  editor.setOption(HarperPlugin, 'blockTexts', {
    ...editor.getOption(HarperPlugin, 'blockTexts'),
    [pathKey(issue.path)]: editor.api.string(block[1]),
  });
  editor.setOption(HarperPlugin, 'issues', [...editor.getOption(HarperPlugin, 'issues'), full]);
  return full;
}

describe('menu actions', () => {
  it('counts words and characters like Docs', () => {
    expect(countWords('  Hello brave\nnew world ')).toEqual({
      words: 4,
      characters: 23,
      charactersExcludingSpaces: 18,
    });
    expect(countWords('   ').words).toBe(0);
  });

  it('title-cases from the preceding character', () => {
    expect(transformCase("it's a new day", 'title')).toBe("It's A New Day");
    expect(transformCase('llo world', 'title', 'e')).toBe('llo World');
    expect(transformCase('MiXed', 'lower')).toBe('mixed');
    expect(transformCase('MiXed', 'upper')).toBe('MIXED');
  });

  it('builds safe download names', () => {
    expect(documentFileName('My: "Draft"/v2', 'md')).toBe('My Draftv2.md');
    expect(documentFileName('', 'txt')).toBe('document.txt');
  });

  it('finds and replaces across leaves, keeping marks', () => {
    const editor = makeEditor([
      paragraph({ text: 'cat and ' }, { text: 'Cat', bold: true }),
      paragraph({ text: 'a cat' }),
    ]);

    expect(findMatches(editor, 'cat')).toHaveLength(3);
    expect(findMatches(editor, 'cat', true)).toHaveLength(2);

    expect(replaceAll(editor, 'cat', 'dog')).toBe(3);
    expect(editor.children).toEqual([
      paragraph({ text: 'dog and ' }, { text: 'dog', bold: true }),
      paragraph({ text: 'a dog' }),
    ]);
  });

  it('changes case over a selection without dropping marks', () => {
    const editor = makeEditor([paragraph({ text: 'hello ' }, { text: 'big world', italic: true })]);
    editor.tf.select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 1], offset: 3 },
    });

    changeCase(editor, 'upper');

    expect(editor.children).toEqual([
      paragraph({ text: 'HELLO ' }, { text: 'BIG world', italic: true }),
    ]);
  });
});

describe('HarperPlugin', () => {
  it('decorates a seeded issue on its block, and drops it once the text changes', () => {
    const editor = makeEditor([paragraph({ text: 'I saw teh cat' })]);
    seedIssue(editor, { path: [0], start: 6, end: 9 });

    const decorate = editor.getPlugin(HarperPlugin).decorate as any;
    const ranges = decorate({
      editor,
      entry: [editor.children[0], [0]],
      getOptions: () => editor.getOptions(HarperPlugin),
      type: HarperPlugin.key,
    });

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      anchor: { path: [0, 0], offset: 6 },
      focus: { path: [0, 0], offset: 9 },
      harper: true,
      harperSpelling: true,
    });

    editor.tf.insertText('!', { at: { path: [0, 0], offset: 13 } });
    expect(
      decorate({
        editor,
        entry: [editor.children[0], [0]],
        getOptions: () => editor.getOptions(HarperPlugin),
        type: HarperPlugin.key,
      }),
    ).toHaveLength(0);
  });

  it('maps an issue spanning two leaves', () => {
    const editor = makeEditor([paragraph({ text: 'I saw t' }, { text: 'eh cat', bold: true })]);
    const issue = seedIssue(editor, { path: [0], start: 6, end: 9 });

    expect(getHarperIssueRange(editor, issue)).toEqual({
      anchor: { path: [0, 0], offset: 6 },
      focus: { path: [0, 1], offset: 2 },
    });
  });

  it('accepts a suggestion in place', () => {
    const editor = makeEditor([paragraph({ text: 'I saw teh cat' })]);
    const issue = seedIssue(editor, { path: [0], start: 6, end: 9 });

    expect(editor.getApi(HarperPlugin).harper.accept(issue.id)).toBe(true);
    expect(editor.api.string([])).toBe('I saw the cat');
    expect(editor.getOption(HarperPlugin, 'issues')).toHaveLength(0);
  });

  it('hides ignored issues and respects the show toggles', () => {
    const editor = makeEditor([paragraph({ text: 'I saw teh cat' })]);
    const issue = seedIssue(editor, { path: [0], start: 6, end: 9 });
    const visible = () => visibleHarperIssues(editor.getOptions(HarperPlugin));

    expect(visible()).toHaveLength(1);
    editor.getApi(HarperPlugin).harper.setShow('spelling', false);
    expect(visible()).toHaveLength(0);
    editor.getApi(HarperPlugin).harper.setShow('spelling', true);
    editor.getApi(HarperPlugin).harper.ignore(issue.id);
    expect(visible()).toHaveLength(0);
  });
});

function MenuBarHarness() {
  const editor = usePlateEditor({ plugins: platePlugins, value: EMPTY_PLATE_VALUE });
  // Keep Harper idle: its WebAssembly linter cannot load under jsdom.
  editor.setOption(HarperPlugin, 'enabled', false);

  return (
    <Plate editor={editor}>
      <MenuBar documentTitle="Test" onShowToolbarChange={() => {}} showToolbar />
    </Plate>
  );
}

describe('MenuBar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(<MenuBarHarness />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the Docs menus in order', () => {
    const labels = Array.from(container.querySelectorAll('[role="menubar"] > button[aria-haspopup="menu"]')).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Help']);
  });

  it('shows the proofing status', () => {
    expect(container.textContent).toContain('Proofing off');
  });
});

describe('formatShortcut', () => {
  it('renders Mac and PC hints', () => {
    expect(formatShortcut('mod+alt+x', true)).toBe('⌘⌥X');
    expect(formatShortcut('mod+shift+c', false)).toBe('Ctrl+Shift+C');
  });
});

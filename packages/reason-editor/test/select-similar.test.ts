/**
 * The SelectSimilar extension: which runs of text it gathers, and the replay
 * that makes a single formatting command land on all of them at once.
 */

import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { FontFamily, TextStyle } from '@tiptap/extension-text-style';
import { afterEach, describe, expect, it } from 'vitest';

import { SelectSimilar, selectSimilarPluginKey } from '../src/extensions/SelectSimilar';

let editor: Editor | null = null;

/**
 * A headless editor holding three paragraphs: two set in Georgia, one left in
 * the default face, so "same font" has both a hit and a miss to distinguish.
 */
function createEditor() {
  editor = new Editor({
    extensions: [Document, Paragraph, Text, TextStyle, FontFamily, Bold, SelectSimilar],
    content: [
      '<p><span style="font-family: Georgia">alpha</span></p>',
      '<p>beta</p>',
      '<p><span style="font-family: Georgia">gamma</span></p>',
    ].join(''),
  });

  return editor;
}

/** The ranges the multi-selection is currently holding. */
function ranges(instance: Editor) {
  return selectSimilarPluginKey.getState(instance.state)?.ranges ?? [];
}

/** The text each stored range covers, for readable assertions. */
function selectedTexts(instance: Editor) {
  return ranges(instance).map((range) => instance.state.doc.textBetween(range.from, range.to));
}

/** Places the cursor inside the first paragraph's Georgia run. */
function putCursorInAlpha(instance: Editor) {
  instance.commands.setTextSelection(2);
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('selectSimilar', () => {
  it('gathers every run sharing the font of the selection', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);

    expect(instance.commands.selectSimilar('font')).toBe(true);
    expect(selectedTexts(instance)).toEqual(['alpha', 'gamma']);
  });

  it('leaves out runs in a different font', () => {
    const instance = createEditor();
    instance.commands.setTextSelection(9); // inside "beta", the unstyled run

    instance.commands.selectSimilar('font');

    expect(selectedTexts(instance)).toEqual(['beta']);
  });

  it('matches the full mark set in formatting mode', () => {
    const instance = createEditor();
    // Bold only the first Georgia run, so the two no longer match on marks.
    instance.commands.setTextSelection({ from: 1, to: 6 });
    instance.commands.toggleBold();

    putCursorInAlpha(instance);
    instance.commands.selectSimilar('formatting');

    expect(selectedTexts(instance)).toEqual(['alpha']);
  });

  it('reports no match and stores nothing when the document has none', () => {
    const instance = createEditor();
    instance.commands.setTextSelection(2);
    instance.commands.selectSimilar('font');
    instance.commands.setContent('<p>plain</p>');

    instance.commands.clearSimilarSelection();

    expect(ranges(instance)).toEqual([]);
  });
});

describe('replaying formatting across the multi-selection', () => {
  it('applies a mark added to one range to all the others', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');

    // Bold only the first run; the third is a stored range, not the selection.
    instance.commands.setTextSelection({ from: 1, to: 6 });
    instance.commands.toggleBold();

    expect(instance.state.doc.textBetween(0, instance.state.doc.content.size)).toContain('gamma');
    expect(instance.getHTML()).toContain('<strong>gamma</strong>');
    expect(instance.getHTML()).toContain('<strong>alpha</strong>');
    expect(instance.getHTML()).not.toContain('<strong>beta</strong>');
  });

  it('removes a mark from the other ranges too', () => {
    const instance = createEditor();
    instance.commands.selectAll();
    instance.commands.setBold();

    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');

    instance.commands.setTextSelection({ from: 1, to: 6 });
    instance.commands.unsetBold();

    expect(instance.getHTML()).not.toContain('<strong>gamma</strong>');
    expect(instance.getHTML()).toContain('<strong>beta</strong>');
  });

  it('does not replay typing', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');

    instance.commands.insertContentAt(6, '!');

    expect(instance.state.doc.textContent).toBe('alpha!betagamma');
  });

  it('grows with text typed inside a range', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');

    instance.commands.insertContentAt(3, 'XX');

    expect(selectedTexts(instance)).toEqual(['alXXpha', 'gamma']);
  });

  it('shifts later ranges along when earlier text grows', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');

    const before = ranges(instance).at(-1)!;
    instance.commands.insertContentAt(3, 'XX');
    const after = ranges(instance).at(-1)!;

    // "gamma" itself is untouched, but its positions moved by the two
    // characters inserted before it.
    expect(after).toEqual({ from: before.from + 2, to: before.to + 2 });
  });

  it('drops ranges whose text was deleted', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');

    const [, gamma] = ranges(instance);
    instance.commands.deleteRange({ from: gamma.from, to: gamma.to });

    expect(selectedTexts(instance)).toEqual(['alpha']);
  });
});

describe('clearSimilarSelection', () => {
  it('empties the stored ranges', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');

    expect(instance.commands.clearSimilarSelection()).toBe(true);
    expect(ranges(instance)).toEqual([]);
  });

  it('reports nothing to do when there is no multi-selection', () => {
    const instance = createEditor();

    expect(instance.commands.clearSimilarSelection()).toBe(false);
  });

  it('stops formatting from spreading once cleared', () => {
    const instance = createEditor();
    putCursorInAlpha(instance);
    instance.commands.selectSimilar('font');
    instance.commands.clearSimilarSelection();

    instance.commands.setTextSelection({ from: 1, to: 6 });
    instance.commands.toggleBold();

    expect(instance.getHTML()).not.toContain('<strong>gamma</strong>');
  });
});

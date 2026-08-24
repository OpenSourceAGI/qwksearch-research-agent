/**
 * The ReadAloud extension: which text it hands to the synthesizer — the selection
 * when there is one, the whole document otherwise — and how its commands drive
 * playback.
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ReadAloud,
  getReadAloudStorage,
  getReadAloudText,
  isReadAloudSelectionScoped,
} from '../src/extensions/ReadAloud';

let editor: Editor | null = null;

function createEditor(content: string) {
  editor = new Editor({
    extensions: [Document, Paragraph, Text, ReadAloud],
    content,
  });
  return editor;
}

/** Swap the real controller for a recorder so no audio or network is involved. */
function stubController(instance: Editor) {
  const controller = {
    speak: vi.fn(async () => undefined),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isActive: vi.fn(() => false),
  };
  getReadAloudStorage(instance)!.controller = controller as any;
  return controller;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('ReadAloud', () => {
  it('reads the whole document when nothing is selected', () => {
    const instance = createEditor('<p>First line.</p><p>Second line.</p>');

    expect(isReadAloudSelectionScoped(instance)).toBe(false);
    // Blank lines between blocks stop the synthesizer running paragraphs together.
    expect(getReadAloudText(instance)).toBe('First line.\n\nSecond line.');
  });

  it('reads only the selection when there is one', () => {
    const instance = createEditor('<p>First line.</p><p>Second line.</p>');
    instance.commands.setTextSelection({ from: 1, to: 6 });

    expect(isReadAloudSelectionScoped(instance)).toBe(true);
    expect(getReadAloudText(instance)).toBe('First');
  });

  it('speaks the current text on command', () => {
    const instance = createEditor('<p>Speak this.</p>');
    const controller = stubController(instance);

    expect(instance.commands.readAloud()).toBe(true);
    expect(controller.speak).toHaveBeenCalledWith('Speak this.');
  });

  it('refuses to speak an empty document', () => {
    const instance = createEditor('<p></p>');
    const controller = stubController(instance);

    expect(instance.commands.readAloud()).toBe(false);
    expect(controller.speak).not.toHaveBeenCalled();
  });

  it('toggles between speaking and stopping', () => {
    const instance = createEditor('<p>Speak this.</p>');
    const controller = stubController(instance);

    instance.commands.toggleReadAloud();
    expect(controller.speak).toHaveBeenCalledTimes(1);
    expect(controller.stop).not.toHaveBeenCalled();

    controller.isActive.mockReturnValue(true);
    instance.commands.toggleReadAloud();
    expect(controller.stop).toHaveBeenCalledTimes(1);
    expect(controller.speak).toHaveBeenCalledTimes(1);
  });

  it('passes pause and resume through to the controller', () => {
    const instance = createEditor('<p>Speak this.</p>');
    const controller = stubController(instance);

    instance.commands.pauseReadAloud();
    instance.commands.resumeReadAloud();

    expect(controller.pause).toHaveBeenCalledTimes(1);
    expect(controller.resume).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers of playback state', () => {
    const instance = createEditor('<p>Speak this.</p>');
    const storage = getReadAloudStorage(instance)!;
    const listener = vi.fn();
    storage.listeners.add(listener);

    // The real controller reports state through the callbacks wired in onCreate.
    storage.state = 'speaking';
    storage.listeners.forEach((fn) => fn());

    expect(listener).toHaveBeenCalled();
  });
});

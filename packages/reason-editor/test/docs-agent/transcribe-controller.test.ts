/**
 * Exercises the Plate dictation plugin's document-manipulation logic against a
 * fake recognizer, mirroring how `test/transcribe.test.ts` exercises the
 * Tiptap `Transcribe` extension. The recognizer itself (`LiveTranscriber`) is
 * mocked out — this only checks that interim/committed phrases land in the
 * right place and interact with undo history the way `Transcribe.ts` does.
 */

import { createPlateEditor } from 'platejs/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` factories are hoisted above the rest of the module, so anything
// they close over has to be declared through `vi.hoisted` rather than as a
// normal top-level `class`/`const`.
const { constructorCalls, FakeLiveTranscriber } = vi.hoisted(() => {
  class FakeLiveTranscriber {
    options: any;
    listening = false;

    constructor(options: any) {
      this.options = options;
      calls.push(this);
    }

    isListening() {
      return this.listening;
    }

    async start() {
      this.listening = true;
      this.options.onStateChange?.(true);
    }

    async stop() {
      this.listening = false;
      this.options.onStateChange?.(false);
    }
  }

  const calls: InstanceType<typeof FakeLiveTranscriber>[] = [];

  return { constructorCalls: calls, FakeLiveTranscriber };
});

vi.mock('use-voice-control/client', () => ({
  LiveTranscriber: FakeLiveTranscriber,
  isTranscriptionSupported: () => true,
}));

import { platePlugins } from '../../src/docs-agent/plate/plate-editor-config';
import { getTranscribeController } from '../../src/docs-agent/plate/transcribe-controller';

function createEditor() {
  return createPlateEditor({
    plugins: platePlugins as any,
    value: [{ children: [{ text: '' }], type: 'p' }],
  });
}

describe('plate transcribe controller', () => {
  beforeEach(() => {
    constructorCalls.length = 0;
  });

  it('starts and stops the recognizer', () => {
    const editor = createEditor();
    const controller = getTranscribeController(editor);

    expect(controller.getState().listening).toBe(false);

    controller.start();
    expect(constructorCalls).toHaveLength(1);
    expect(controller.getState().listening).toBe(true);

    controller.stop();
    expect(controller.getState().listening).toBe(false);
  });

  it('returns the same controller for the same editor', () => {
    const editor = createEditor();
    expect(getTranscribeController(editor)).toBe(getTranscribeController(editor));
  });

  it('writes an interim phrase at the cursor without recording it in history', () => {
    const editor = createEditor();
    const controller = getTranscribeController(editor);

    controller.start();
    constructorCalls[0]!.options.onPartial('hello');

    expect(editor.api.string([])).toBe('hello');
    expect(editor.history.undos.length).toBe(0);
  });

  it('rewrites the interim phrase in place on subsequent partials', () => {
    const editor = createEditor();
    const controller = getTranscribeController(editor);

    controller.start();
    constructorCalls[0]!.options.onPartial('hel');
    constructorCalls[0]!.options.onPartial('hello');

    expect(editor.api.string([])).toBe('hello');
  });

  it('commits the settled phrase as one history-tracked insertion', () => {
    const editor = createEditor();
    const controller = getTranscribeController(editor);

    controller.start();
    constructorCalls[0]!.options.onPartial('hello');
    constructorCalls[0]!.options.onCommit('hello world');

    expect(editor.api.string([])).toBe('hello world ');
    expect(editor.history.undos.length).toBeGreaterThan(0);

    editor.tf.undo();
    expect(editor.api.string([])).toBe('');
  });

  it('drops the half-heard phrase on stop', () => {
    const editor = createEditor();
    const controller = getTranscribeController(editor);

    controller.start();
    constructorCalls[0]!.options.onPartial('hel');
    controller.stop();

    expect(editor.api.string([])).toBe('');
  });

  it('inserts a leading space when a phrase starts mid-sentence', () => {
    const editor = createEditor();
    editor.tf.select(editor.api.range([0])!);
    editor.tf.insertText('Hello');
    const controller = getTranscribeController(editor);

    controller.start();
    constructorCalls[0]!.options.onCommit('world');

    expect(editor.api.string([])).toBe('Hello world ');
  });

  it('toggles between start and stop', () => {
    const editor = createEditor();
    const controller = getTranscribeController(editor);

    controller.toggle();
    expect(controller.getState().listening).toBe(true);

    controller.toggle();
    expect(controller.getState().listening).toBe(false);
  });
});

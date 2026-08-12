/**
 * The Transcribe extension: how dictated speech lands in the document — the
 * in-progress phrase rewritten in place at the cursor, the settled phrase replacing
 * it, and what happens to a half-heard phrase when the microphone is switched off.
 */

import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Transcribe, getTranscribeStorage } from '../src/extensions/Transcribe';

/** Stand-in for the Web Speech API recognizer, driven manually from each test. */
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {
    this.onstart?.();
  }

  stop() {
    /* the extension drives `onend` itself where a test needs it */
  }
}

let editor: Editor | null = null;

function createEditor(content: string) {
  editor = new Editor({
    extensions: [Document, Paragraph, Text, Transcribe],
    content,
  });
  return editor;
}

/** Speak a phrase: `final` false is the recognizer's in-progress guess. */
function say(text: string, final: boolean) {
  const recognition = FakeRecognition.instances[0];
  recognition.onresult?.({
    resultIndex: 0,
    results: [{ 0: { transcript: text }, isFinal: final }],
  });
}

beforeEach(() => {
  FakeRecognition.instances = [];
  (window as any).SpeechRecognition = FakeRecognition;
});

afterEach(() => {
  editor?.destroy();
  editor = null;
  delete (window as any).SpeechRecognition;
});

describe('Transcribe', () => {
  it('rewrites the in-progress phrase in place as it is spoken', () => {
    const instance = createEditor('<p>Hello</p>');
    instance.commands.focus('end');
    instance.commands.startTranscribe();

    say('world', false);
    expect(instance.getText()).toBe('Hello world');

    // The next update replaces the guess rather than appending to it.
    say('world peace', false);
    expect(instance.getText()).toBe('Hello world peace');

    say('world peace now', false);
    expect(instance.getText()).toBe('Hello world peace now');
  });

  it('settles a phrase and leaves the cursor ready for the next one', () => {
    const instance = createEditor('<p>Hello</p>');
    instance.commands.focus('end');
    instance.commands.startTranscribe();

    say('wor', false);
    say('world', true);

    expect(instance.getText()).toBe('Hello world ');
    expect(instance.state.selection.head).toBe(instance.state.doc.content.size - 1);

    // A second phrase continues after the first without running the words together.
    say('again', true);
    expect(instance.getText()).toBe('Hello world again ');
  });

  it('does not add a leading space at the start of an empty block', () => {
    const instance = createEditor('<p></p>');
    instance.commands.focus('end');
    instance.commands.startTranscribe();

    say('first words', true);
    expect(instance.getText()).toBe('first words ');
  });

  it('drops the unfinished phrase when dictation stops', () => {
    const instance = createEditor('<p>Hello</p>');
    instance.commands.focus('end');
    instance.commands.startTranscribe();

    say('settled', true);
    say('half heard', false);
    expect(instance.getText()).toBe('Hello settled half heard');

    instance.commands.stopTranscribe();
    expect(instance.getText()).toBe('Hello settled ');
    expect(getTranscribeStorage(instance)?.listening).toBe(false);
  });

  it('keeps interim churn out of the undo history and records settled phrases', () => {
    const instance = createEditor('<p>Hello</p>');
    instance.commands.focus('end');
    instance.commands.startTranscribe();

    const history: (boolean | undefined)[] = [];
    const dispatch = instance.view.dispatch.bind(instance.view);
    instance.view.dispatch = (tr) => {
      history.push(tr.getMeta('addToHistory'));
      dispatch(tr);
    };

    say('one', false);
    say('one two', false);
    expect(history.every((value) => value === false)).toBe(true);

    history.length = 0;
    say('one two three', true);
    // The interim is cleared silently, then the settled phrase is recorded, so a
    // single undo takes back the whole phrase.
    expect(history).toEqual([false, undefined]);
  });

  it('tracks the phrase the overlay displays', () => {
    const instance = createEditor('<p></p>');
    instance.commands.focus('end');
    instance.commands.startTranscribe();

    say('hello there', false);
    const storage = getTranscribeStorage(instance)!;
    expect(storage.lastPhrase).toBe('hello there');
    expect(storage.listening).toBe(true);

    const before = storage.phraseId;
    say('hello there friend', true);
    expect(storage.lastPhrase).toBe('hello there friend');
    expect(storage.phraseId).toBeGreaterThan(before);
    // The overlay's own phrase is cleared from the interim display on commit.
    expect(storage.partial).toBe('');
  });

  it('toggles the microphone off and on', () => {
    const instance = createEditor('<p></p>');
    instance.commands.focus('end');

    instance.commands.toggleTranscribe();
    expect(getTranscribeStorage(instance)?.listening).toBe(true);

    instance.commands.toggleTranscribe();
    expect(getTranscribeStorage(instance)?.listening).toBe(false);
  });
});

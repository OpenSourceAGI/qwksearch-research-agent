import { describe, expect, it, vi } from 'vitest';
import { fillInput, waitFor } from '../content/chat-handoff/fill';

describe('fillInput', () => {
  it('sets a textarea value and fires input so frameworks notice', () => {
    document.body.innerHTML = '<textarea></textarea>';
    const area = document.querySelector('textarea')!;
    const onInput = vi.fn();
    area.addEventListener('input', onInput);

    expect(fillInput(area, 'hello world')).toBe(true);

    expect(area.value).toBe('hello world');
    expect(onInput).toHaveBeenCalled();
  });

  it('pastes into a contenteditable editor that handles paste events', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';
    const editor = document.querySelector<HTMLElement>('[contenteditable]')!;
    editor.addEventListener('paste', (e) => {
      e.preventDefault();
      editor.textContent = (e as ClipboardEvent).clipboardData!.getData('text/plain');
    });
    class FakeDataTransfer {
      private data = new Map<string, string>();
      setData(type: string, value: string) {
        this.data.set(type, value);
      }
      getData(type: string) {
        return this.data.get(type) ?? '';
      }
    }
    class FakePasteEvent extends Event {
      clipboardData: unknown;
      constructor(type: string, init: { clipboardData: unknown } & EventInit) {
        super(type, init);
        this.clipboardData = init.clipboardData;
      }
    }
    vi.stubGlobal('DataTransfer', FakeDataTransfer);
    vi.stubGlobal('ClipboardEvent', FakePasteEvent);

    expect(fillInput(editor, 'Below is a chat')).toBe(true);
    expect(editor.textContent).toBe('Below is a chat');
  });

  it('reports failure when the editor ignores both paste and insertText', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';
    const editor = document.querySelector<HTMLElement>('[contenteditable]')!;
    document.execCommand = vi.fn(() => false);

    expect(fillInput(editor, 'text')).toBe(false);
  });
});

describe('waitFor', () => {
  it('resolves once the element appears', async () => {
    document.body.innerHTML = '';
    const pending = waitFor(() => document.querySelector('#late'), 1000);

    document.body.insertAdjacentHTML('beforeend', '<div id="late"></div>');

    expect(await pending).not.toBeNull();
  });

  it('resolves null on timeout', async () => {
    document.body.innerHTML = '';

    expect(await waitFor(() => document.querySelector('#never'), 30)).toBeNull();
  });
});

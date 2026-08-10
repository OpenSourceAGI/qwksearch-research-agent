import { describe, expect, it, vi } from 'vitest';
import { getEditorContainerDOMSize } from '../src/utils/editor-container-size';

function fakeEditor(width: number) {
  const element = document.createElement('div');
  Object.defineProperty(element, 'clientWidth', { value: width, configurable: true });
  document.body.append(element);

  const handlers: Record<string, () => void> = {};
  const editor = {
    options: { element },
    on: (event: string, handler: () => void) => {
      handlers[event] = handler;
    },
  } as any;

  return { editor, element, handlers };
}

describe('getEditorContainerDOMSize', () => {
  it('reads the container width and caches it', () => {
    const { editor } = fakeEditor(760);

    expect(getEditorContainerDOMSize(editor)).toEqual({ width: 760 });

    // A second editor with a different width still reads the cached value.
    const other = fakeEditor(200);
    expect(getEditorContainerDOMSize(other.editor)).toEqual({ width: 760 });
  });

  it('registers a destroy handler that disconnects the observer', () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      'MutationObserver',
      class {
        observe = observe;
        disconnect = disconnect;
      }
    );

    const { editor, handlers } = fakeEditor(500);
    getEditorContainerDOMSize(editor);

    expect(observe).toHaveBeenCalledTimes(1);
    expect(handlers.destroy).toBeTypeOf('function');

    handlers.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('re-reads the width when the cached value is not positive', () => {
    // Drive the observer callback directly to refresh the cache.
    let callback: () => void = () => {};
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor(cb: () => void) {
          callback = cb;
        }
        observe = () => {};
        disconnect = () => {};
      }
    );

    const { editor, element } = fakeEditor(0);
    getEditorContainerDOMSize(editor);

    Object.defineProperty(element, 'clientWidth', { value: 999, configurable: true });
    callback();

    expect(getEditorContainerDOMSize(editor)).toEqual({ width: 999 });

    vi.unstubAllGlobals();
  });
});

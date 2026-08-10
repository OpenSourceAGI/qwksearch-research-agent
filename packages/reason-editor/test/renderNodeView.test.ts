import { afterEach, describe, expect, it, vi } from 'vitest';

const updatePosition = vi.fn();
const instances: any[] = [];

vi.mock('@/utils/updatePosition', () => ({
  updatePosition: (...args: unknown[]) => updatePosition(...args),
}));

vi.mock('@tiptap/react', () => ({
  ReactRenderer: class {
    element = document.createElement('div');
    updateProps = vi.fn();
    destroy = vi.fn();
    ref: { onKeyDown: ReturnType<typeof vi.fn> } | null = { onKeyDown: vi.fn(() => true) };

    constructor(
      public node: unknown,
      public options: any
    ) {
      instances.push(this);
    }
  },
}));

const { renderNodeViewClosure } = await import('../src/utils/renderNodeView');

const Component = () => null;
const editor = {} as any;

function start(props: Record<string, unknown> = {}) {
  const renderer = renderNodeViewClosure(Component)();
  renderer.onStart({ clientRect: () => ({}), editor, ...props });
  return { renderer, instance: instances.at(-1) };
}

afterEach(() => {
  instances.length = 0;
  updatePosition.mockClear();
  document.body.innerHTML = '';
});

describe('renderNodeViewClosure', () => {
  it('mounts the renderer and positions it on start', () => {
    const { instance } = start();

    expect(instance.node).toBe(Component);
    expect(instance.element.style.position).toBe('absolute');
    expect(document.body.contains(instance.element)).toBe(true);
    expect(updatePosition).toHaveBeenCalledWith(editor, instance.element);
  });

  it('does nothing on start without a clientRect', () => {
    const renderer = renderNodeViewClosure(Component)();

    renderer.onStart({ editor });

    expect(instances).toHaveLength(0);
    expect(updatePosition).not.toHaveBeenCalled();
  });

  it('forwards props and repositions on update', () => {
    const { renderer, instance } = start();
    updatePosition.mockClear();

    const props = { clientRect: () => ({}), editor, query: 'a' };
    renderer.onUpdate(props);

    expect(instance.updateProps).toHaveBeenCalledWith(props);
    expect(updatePosition).toHaveBeenCalledWith(editor, instance.element);
  });

  it('updates props but skips repositioning without a clientRect', () => {
    const { renderer, instance } = start();
    updatePosition.mockClear();

    renderer.onUpdate({ editor, clientRect: null });

    expect(instance.updateProps).toHaveBeenCalled();
    expect(updatePosition).not.toHaveBeenCalled();
  });

  it('tears down on Escape', () => {
    const { renderer, instance } = start();

    expect(renderer.onKeyDown({ event: { key: 'Escape' } })).toBe(true);
    expect(instance.destroy).toHaveBeenCalled();
    expect(document.body.contains(instance.element)).toBe(false);
  });

  it('delegates other keys to the rendered component', () => {
    const { renderer, instance } = start();

    const props = { event: { key: 'ArrowDown' } };
    expect(renderer.onKeyDown(props)).toBe(true);
    expect(instance.ref.onKeyDown).toHaveBeenCalledWith(props);
  });

  it('returns undefined for other keys when the component exposes no ref', () => {
    const { renderer, instance } = start();
    instance.ref = null;

    expect(renderer.onKeyDown({ event: { key: 'ArrowDown' } })).toBeUndefined();
  });

  it('destroys and removes the element on exit', () => {
    const { renderer, instance } = start();

    renderer.onExit();

    expect(instance.destroy).toHaveBeenCalled();
    expect(document.body.contains(instance.element)).toBe(false);
  });
});

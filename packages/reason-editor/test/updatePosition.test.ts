import { describe, expect, it, vi } from 'vitest';

const computePosition = vi.fn();
const posToDOMRect = vi.fn(() => ({ x: 0, y: 0, width: 10, height: 10 }));

vi.mock('@floating-ui/dom', () => ({
  computePosition: (...args: unknown[]) => computePosition(...args),
  flip: () => 'flip-middleware',
  shift: () => 'shift-middleware',
}));

vi.mock('@tiptap/react', () => ({
  posToDOMRect: (...args: unknown[]) => posToDOMRect(...args),
}));

const { updatePosition } = await import('../src/utils/updatePosition');

const editor = {
  view: {},
  state: { selection: { from: 3, to: 7 } },
} as any;

describe('updatePosition', () => {
  it('writes the computed coordinates onto the element', async () => {
    computePosition.mockResolvedValue({ x: 12, y: 34, strategy: 'absolute' });
    const element = document.createElement('div');

    updatePosition(editor, element);
    await vi.waitFor(() => expect(element.style.left).toBe('12px'));

    expect(element.style.top).toBe('34px');
    expect(element.style.position).toBe('absolute');
    expect(element.style.width).toBe('max-content');
  });

  it('anchors to a virtual element derived from the current selection', async () => {
    computePosition.mockResolvedValue({ x: 0, y: 0, strategy: 'fixed' });
    const element = document.createElement('div');

    updatePosition(editor, element);

    const [virtualElement, target, options] = computePosition.mock.calls.at(-1)!;
    expect(target).toBe(element);
    expect(options).toMatchObject({ placement: 'bottom-start', strategy: 'absolute' });

    (virtualElement as any).getBoundingClientRect();
    expect(posToDOMRect).toHaveBeenCalledWith(editor.view, 3, 7);
  });

  it('uses the strategy returned by the positioner', async () => {
    computePosition.mockResolvedValue({ x: 1, y: 2, strategy: 'fixed' });
    const element = document.createElement('div');

    updatePosition(editor, element);
    await vi.waitFor(() => expect(element.style.position).toBe('fixed'));
  });
});

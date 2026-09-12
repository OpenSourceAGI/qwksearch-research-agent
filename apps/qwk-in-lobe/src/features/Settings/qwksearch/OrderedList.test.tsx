/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import OrderedList, { moveItem, ORDER_HANDLE_TEST_ID, removeItem } from './OrderedList';

describe('moveItem', () => {
  it('moves a value to the position of the one it was dropped on', () => {
    expect(moveItem(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('moves down as well as up', () => {
    expect(moveItem(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
  });

  it('leaves the list alone when the drop lands on the dragged value itself', () => {
    expect(moveItem(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'b', 'c']);
  });

  it('leaves the list alone when either end of the drag is no longer in it', () => {
    expect(moveItem(['a', 'b'], 'z', 'a')).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 'a', 'z')).toEqual(['a', 'b']);
  });

  it('does not mutate the array it was given', () => {
    const value = ['a', 'b', 'c'];
    moveItem(value, 'c', 'a');
    expect(value).toEqual(['a', 'b', 'c']);
  });
});

describe('removeItem', () => {
  it('drops the value and keeps the order of the rest', () => {
    expect(removeItem(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('is a no-op for a value that is not there', () => {
    expect(removeItem(['a', 'b'], 'z')).toEqual(['a', 'b']);
  });
});

describe('OrderedList', () => {
  const labelFor = (value: string) =>
    ({ crawler: 'Built-in reader', qwksearch: 'QwkSearch extractor', tavily: 'Tavily' })[value] ??
    value;

  it('renders nothing at all for an empty field', () => {
    const { container } = render(<OrderedList value={[]} onChange={vi.fn()} />);

    expect(container.textContent).toBe('');
  });

  it('renders one value as a row but without the ordering hint', () => {
    render(<OrderedList labelFor={labelFor} value={['qwksearch']} onChange={vi.fn()} />);

    // Still removable; just not a sequence, so claiming it can be reordered
    // would be a lie.
    expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(1);
    expect(screen.queryByText('controls.order.hint')).toBeNull();
  });

  it('numbers the values in the order stored', () => {
    render(<OrderedList labelFor={labelFor} value={['tavily', 'qwksearch']} onChange={vi.fn()} />);

    const handles = screen.getAllByTestId(ORDER_HANDLE_TEST_ID);
    expect(handles).toHaveLength(2);
    expect(screen.getByText('controls.order.hint')).toBeTruthy();

    // The row order on screen is the execution order, so read it off the DOM.
    const rows = handles.map((handle) => handle.closest('div')?.parentElement?.textContent ?? '');
    expect(rows[0]).toContain('1');
    expect(rows[0]).toContain('Tavily');
    expect(rows[1]).toContain('2');
    expect(rows[1]).toContain('QwkSearch extractor');
  });

  it('shows a value nothing has a label for rather than an empty row', () => {
    render(<OrderedList labelFor={labelFor} value={['something-new']} onChange={vi.fn()} />);

    expect(screen.getByText('something-new')).toBeTruthy();
  });

  it('removes a value from the middle without disturbing the order of the rest', async () => {
    const onChange = vi.fn();
    render(
      <OrderedList
        labelFor={labelFor}
        value={['qwksearch', 'tavily', 'crawler']}
        onChange={onChange}
      />,
    );

    const remove = screen.getAllByRole('button', { name: 'controls.order.remove' });
    expect(remove).toHaveLength(3);
    await userEvent.click(remove[1]);

    expect(onChange).toHaveBeenCalledWith(['qwksearch', 'crawler']);
  });
});

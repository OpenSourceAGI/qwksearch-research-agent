/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ORDER_HANDLE_TEST_ID } from './OrderedList';
import OrderedMultiSelect from './OrderedMultiSelect';

const options = [
  { label: 'QwkSearch extractor', value: 'qwksearch' },
  { label: 'Site rendering', value: 'scraper' },
  { label: 'Tavily', value: 'tavily' },
  { label: 'Built-in reader', value: 'crawler' },
];

describe('OrderedMultiSelect', () => {
  it('shows the placeholder and no ordered rows for an empty field', () => {
    render(<OrderedMultiSelect options={options} placeholder={'Every step'} value={[]} />);

    expect(screen.getByText('Every step')).toBeTruthy();
    expect(screen.queryAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(0);
  });

  it('mirrors the chosen values as ordered rows beneath the select', () => {
    render(<OrderedMultiSelect options={options} value={['tavily', 'qwksearch']} />);

    expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(2);
    // Once as the select's own tag, once as the ordered row.
    expect(screen.getAllByText('Tavily')).toHaveLength(2);
  });

  it('adds the option the user picked', async () => {
    const onChange = vi.fn();
    render(<OrderedMultiSelect options={options} value={['qwksearch']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Tavily' }));

    expect(onChange).toHaveBeenCalledWith(['qwksearch', 'tavily']);
  });

  it('removing the last value reports an empty list, which means inherit', async () => {
    const onChange = vi.fn();
    render(<OrderedMultiSelect options={options} value={['qwksearch']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'controls.order.remove' }));

    // Not `null` and not `undefined` — the pane's `overridesFromFormValues`
    // only omits the key for an empty array.
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('keeps every option offered, including the ones already chosen', async () => {
    render(<OrderedMultiSelect options={options} value={['qwksearch']} />);

    await userEvent.click(screen.getByRole('combobox'));

    // The select is the only way to add a value back, so narrowing it to the
    // unselected options would strand anything removed from a row.
    expect(await screen.findAllByRole('option')).toHaveLength(options.length);
  });
});

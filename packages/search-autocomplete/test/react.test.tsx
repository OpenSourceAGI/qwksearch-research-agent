import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchBox, splitQuery } from '../src/react';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('splitQuery', () => {
  it('keeps all but the last N words verbatim', () => {
    expect(splitQuery('one two three four five six', 4)).toEqual({
      prefix: 'one two ',
      query: 'three four five six',
    });
    expect(splitQuery('  ')).toEqual({ prefix: '', query: '' });
  });
});

describe('SearchBox', () => {
  it('fetches after the debounce, completes on Enter, then submits', async () => {
    vi.useFakeTimers();
    const fetchSuggestions = vi.fn(async () => ({
      suggestions: ['tesla stock', 'tesla model 3'],
      domains: [],
    }));
    const onSubmit = vi.fn();
    render(<SearchBox fetchSuggestions={fetchSuggestions} onSubmit={onSubmit} debounceMs={50} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'tes' } });
    expect(fetchSuggestions).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(fetchSuggestions).toHaveBeenCalledWith('tes', expect.objectContaining({ limit: 8 }));
    expect(screen.getByText('tesla stock')).toBeTruthy();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('tesla stock');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('tesla stock');
  });

  it('sends the chosen domain to onSelectDomain', async () => {
    vi.useFakeTimers();
    const onSelectDomain = vi.fn();
    render(
      <SearchBox
        debounceMs={0}
        onSelectDomain={onSelectDomain}
        fetchSuggestions={async () => ({
          suggestions: [],
          domains: [{ domain: 'github.com', name: 'GitHub', favicon: '', rank: 50 }],
        })}
      />,
    );
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'github' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    fireEvent.keyDown(input, { key: '1' });
    expect(onSelectDomain).toHaveBeenCalledWith(expect.objectContaining({ domain: 'github.com' }));
  });

  it('requests the default endpoint with the chosen engine', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async (_url: string) => Response.json({ suggestions: ['x'], domains: [] }));
    vi.stubGlobal('fetch', fetch);
    render(<SearchBox debounceMs={0} engine="wikipedia" />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'hello' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(String(fetch.mock.calls[0][0])).toBe('/api/agent/autocomplete?q=hello&limit=8&engine=wikipedia');
    vi.unstubAllGlobals();
  });
});

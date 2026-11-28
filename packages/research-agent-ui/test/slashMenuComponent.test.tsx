/**
 * @fileoverview The slash menu as the user meets it: a textarea wired to
 * `useSlashMenu` + `<SlashMenu>` the same way the chat input is.
 */
import { useMemo, useRef, useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SlashMenu, slashComboboxProps, useCaret, useSlashMenu } from '../src/components/SlashMenu';
import type { SlashItem } from '../src/components/SlashMenu';

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

function Harness({
  items,
  onSend,
  loadingFiles,
}: {
  items: SlashItem[];
  onSend: (v: string) => void;
  loadingFiles?: boolean;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const { caret, sync, place } = useCaret(ref);
  const stable = useMemo(() => items, [items]);
  const menu = useSlashMenu({
    value,
    caret,
    items: stable,
    onApply: (v, c) => {
      setValue(v);
      place(c);
    },
  });
  return (
    <div ref={wrapper}>
      <textarea
        ref={ref}
        aria-label="Message"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          sync();
        }}
        onSelect={sync}
        {...slashComboboxProps(menu)}
        onKeyDown={(e) => {
          if (menu.handleKeyDown(e)) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend(value);
          }
        }}
      />
      <SlashMenu menu={menu} anchorRef={wrapper} loadingFiles={loadingFiles} />
    </div>
  );
}

const run = vi.fn();
const items: SlashItem[] = [
  { id: 'cmd:search', kind: 'command', name: 'Search', description: 'Search the web', icon: null, insertText: 'Search the web for ' },
  { id: 'cmd:new', kind: 'command', name: 'New chat', description: 'Start a fresh conversation', icon: null, run },
  { id: 'file:1', kind: 'file', name: 'Quarterly report', description: 'Library document', icon: null, run },
];

function type(el: HTMLElement, value: string) {
  const ta = el as HTMLTextAreaElement;
  fireEvent.change(ta, { target: { value, selectionStart: value.length, selectionEnd: value.length } });
}

describe('slash menu component', () => {
  it('opens on "/" with labelled listbox, grouped options and combobox wiring', () => {
    render(<Harness items={items} onSend={vi.fn()} />);
    const input = screen.getByRole('combobox', { name: 'Message' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
    type(input, '/');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const listbox = screen.getByRole('listbox', { name: 'Commands and files' });
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('Commands')).toBeTruthy();
    expect(screen.getByText('Files')).toBeTruthy();
    const active = screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')!;
    expect(input.getAttribute('aria-activedescendant')).toBe(active.id);
  });

  it('does not open inside a URL', () => {
    render(<Harness items={items} onSend={vi.fn()} />);
    type(screen.getByRole('combobox'), 'see https://x');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('filters live and highlights matched letters', () => {
    render(<Harness items={items} onSend={vi.fn()} />);
    const input = screen.getByRole('combobox');
    type(input, '/qtr');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]!.textContent).toContain('Quarterly report');
    const matched = options[0]!.querySelectorAll('[data-match]');
    expect(Array.from(matched).map((n) => n.textContent).join('')).toBe('Qtr');
  });

  it('shows the empty state when nothing matches', () => {
    render(<Harness items={items} onSend={vi.fn()} />);
    type(screen.getByRole('combobox'), '/zzzz');
    expect(screen.getByText('No matching commands or files')).toBeTruthy();
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('moves with arrows, picks with Enter, and does not submit the message', () => {
    const onSend = vi.fn();
    render(<Harness items={items} onSend={onSend} />);
    const input = screen.getByRole('combobox') as HTMLTextAreaElement;
    type(input, '/');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect(input.value).toBe('Search the web for ');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Tab inserts, and run commands remove the token and fire', () => {
    run.mockClear();
    render(<Harness items={items} onSend={vi.fn()} />);
    const input = screen.getByRole('combobox') as HTMLTextAreaElement;
    type(input, '/new');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
  });

  it('closes on Escape and stays closed while typing the same token', () => {
    render(<Harness items={items} onSend={vi.fn()} />);
    const input = screen.getByRole('combobox');
    type(input, '/s');
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    type(input, '/se');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes when the slash is backspaced away', () => {
    render(<Harness items={items} onSend={vi.fn()} />);
    const input = screen.getByRole('combobox');
    type(input, '/');
    expect(screen.getByRole('listbox')).toBeTruthy();
    type(input, '');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lets Enter submit normally when the menu is closed or has no matches', () => {
    const onSend = vi.fn();
    render(<Harness items={items} onSend={onSend} />);
    const input = screen.getByRole('combobox');
    type(input, 'hello');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
    type(input, '/zzzz');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('/zzzz');
  });

  it('does not hijack keys during IME composition', () => {
    const onSend = vi.fn();
    render(<Harness items={items} onSend={onSend} />);
    const input = screen.getByRole('combobox') as HTMLTextAreaElement;
    type(input, '/');
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(input.value).toBe('/');
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('selects on hover and picks on click', () => {
    run.mockClear();
    render(<Harness items={items} onSend={vi.fn()} />);
    const input = screen.getByRole('combobox') as HTMLTextAreaElement;
    type(input, '/');
    const options = screen.getAllByRole('option');
    fireEvent.mouseMove(options[1]!);
    expect(screen.getAllByRole('option')[1]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getAllByRole('option')[1]!);
    expect(run).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
  });

  it('shows a loading note instead of the empty state while files load', () => {
    render(<Harness items={[]} onSend={vi.fn()} loadingFiles />);
    type(screen.getByRole('combobox'), '/');
    expect(screen.getByText('Loading files…')).toBeTruthy();
  });
});

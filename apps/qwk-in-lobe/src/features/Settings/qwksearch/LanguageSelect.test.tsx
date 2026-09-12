/**
 * @vitest-environment happy-dom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LanguageListSelect, LanguageSelect } from './LanguageSelect';
import { ORDER_HANDLE_TEST_ID } from './OrderedList';

const box = () => screen.getByRole('combobox') as HTMLInputElement;

/**
 * Type into the box and dismiss the suggestion popup.
 *
 * base-ui marks everything outside an open popup `inert`, which hides the Add
 * button from the accessibility tree — and from Testing Library with it. A real
 * user's click on Add closes the popup on the way; Escape is how a test says
 * the same thing.
 */
const typeTag = async (text: string) => {
  await userEvent.type(box(), text);
  await userEvent.keyboard('{Escape}');
};

/** The pane drives these through antd `Form.Item`, so drive them the same way. */
const ControlledList = ({ initial = [], ...rest }: { initial?: string[]; limit?: number }) => {
  const [value, setValue] = useState(initial);
  return <LanguageListSelect {...rest} value={value} onChange={setValue} />;
};

describe('LanguageSelect', () => {
  it('shows the tag in force as the placeholder when nothing is chosen', () => {
    render(<LanguageSelect placeholder={'en-US'} value={''} />);

    expect(screen.getByPlaceholderText('en-US')).toBeTruthy();
  });

  it('shows the stored tag, so a reverted or re-fetched value reaches the box', () => {
    render(<LanguageSelect value={'pt-BR'} />);

    expect(box().value).toBe('pt-BR');
  });

  it('stores the canonical spelling, not the one that was typed', async () => {
    const onChange = vi.fn();
    render(<LanguageSelect value={''} onChange={onChange} />);

    await userEvent.type(box(), 'PT-br');

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('pt-BR'));
  });

  it('rewrites the box to the canonical spelling once the field is left', async () => {
    render(<LanguageSelect value={''} />);

    await userEvent.type(box(), 'PT-br');
    await userEvent.tab();

    await waitFor(() => expect(box().value).toBe('pt-BR'));
  });

  it('accepts a well-formed tag that is not in the suggestions', async () => {
    const onChange = vi.fn();
    render(<LanguageSelect value={''} onChange={onChange} />);

    // Swahili. The server takes any BCP-47 shape, so the field has to as well —
    // and a tags `Select` would have quietly turned this into Swedish.
    await userEvent.type(box(), 'sw');

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('sw'));
  });

  it('picking a suggestion stores its tag, not its label', async () => {
    const onChange = vi.fn();
    render(<LanguageSelect value={''} onChange={onChange} />);

    await userEvent.click(box());
    await userEvent.click(await screen.findByText('Brazilian Portuguese (pt-BR)'));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('pt-BR'));
  });

  it('commits nothing for a tag the server would drop', async () => {
    const onChange = vi.fn();
    render(<LanguageSelect value={''} onChange={onChange} />);

    await userEvent.type(box(), 'english');

    // Empty means "inherit", which is exactly what the server would store for
    // this input — so the form and the server agree even before Save.
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(''));
  });

  it('says why it refused, but not until the field is left', async () => {
    render(<LanguageSelect value={''} />);

    await userEvent.type(box(), 'english');
    // A tag is malformed for most of the time it is being typed; complaining on
    // every keystroke teaches the user to ignore the complaint.
    expect(screen.queryByText('controls.language.invalid')).toBeNull();

    await userEvent.tab();

    await waitFor(() => expect(screen.getByText('controls.language.invalid')).toBeTruthy());
    // And the text stays on screen next to the reason.
    expect(box().value).toBe('english');
  });

  it('stops complaining once the tag is fixed', async () => {
    render(<LanguageSelect value={''} />);

    await userEvent.type(box(), 'english');
    await userEvent.tab();
    await waitFor(() => expect(screen.getByText('controls.language.invalid')).toBeTruthy());

    await userEvent.clear(box());
    await userEvent.type(box(), 'en');

    await waitFor(() => expect(screen.queryByText('controls.language.invalid')).toBeNull());
  });
});

describe('LanguageListSelect', () => {
  it('lists the stored tags in preference order, named', () => {
    render(<ControlledList initial={['fr', 'en']} />);

    const rows = screen
      .getAllByTestId(ORDER_HANDLE_TEST_ID)
      .map((handle) => handle.closest('div')?.parentElement?.textContent ?? '');
    expect(rows[0]).toContain('French (fr)');
    expect(rows[1]).toContain('English (en)');
  });

  it('adds a typed tag, lowercased — that is how the route deduplicates', async () => {
    render(<ControlledList />);

    await typeTag('PT-BR');
    await userEvent.click(screen.getByRole('button', { name: 'controls.language.add' }));

    await waitFor(() => expect(screen.getByText(/\(pt-br\)|pt-br/)).toBeTruthy());
    // And the box is emptied, ready for the next one.
    expect(box().value).toBe('');
  });

  it('adds a whole comma-separated list at once', async () => {
    render(<ControlledList />);

    // What the placeholder has always promised, and what `tokenSeparators`
    // never actually delivered.
    await typeTag('en, fr, pt-br');
    await userEvent.click(screen.getByRole('button', { name: 'controls.language.add' }));

    await waitFor(() => expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(3));
  });

  it('will not add a tag the server would drop, and says so once the field is left', async () => {
    render(<ControlledList initial={['en']} />);

    await typeTag('klingon');
    expect(screen.getByRole('button', { name: 'controls.language.add' })).toHaveProperty(
      'disabled',
      true,
    );

    await userEvent.tab();
    await waitFor(() => expect(screen.getByText('controls.language.invalid')).toBeTruthy());
    expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(1);
  });

  it('keeps the good half of a mixed list and names the rest', async () => {
    render(<ControlledList />);

    await typeTag('en, klingon, fr');
    await userEvent.click(screen.getByRole('button', { name: 'controls.language.add' }));

    await waitFor(() => expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(2));
  });

  it('says a tag is already in the list rather than letting Add do nothing', async () => {
    render(<ControlledList initial={['en']} />);

    await typeTag('EN');

    await waitFor(() => expect(screen.getByText('controls.language.duplicate')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'controls.language.add' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('says when the list is full instead of dropping the sixth in silence', async () => {
    render(<ControlledList initial={['en', 'fr', 'de', 'it', 'es']} />);

    await waitFor(() => expect(screen.getByText('controls.language.limit')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'controls.language.add' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(box()).toHaveProperty('disabled', true);
  });

  it('honours a limit other than the route default', async () => {
    render(<ControlledList initial={['en']} limit={1} />);

    await waitFor(() => expect(screen.getByText('controls.language.limit')).toBeTruthy());
  });

  it('warns before Add when the typed list would overflow the cap', async () => {
    render(<ControlledList initial={['en', 'fr', 'de', 'it']} />);

    await typeTag('es, pt, nl');

    await waitFor(() => expect(screen.getByText('controls.language.limit')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'controls.language.add' }));

    // The fifth lands; the sixth and seventh were never going to.
    await waitFor(() => expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(5));
  });

  it('says nothing at all while every entry is well formed and new', async () => {
    render(<ControlledList initial={['en']} />);

    await typeTag('fr');

    expect(screen.queryByText('controls.language.invalid')).toBeNull();
    expect(screen.queryByText('controls.language.duplicate')).toBeNull();
    expect(screen.queryByText('controls.language.limit')).toBeNull();
  });

  it('removes a language from the list', async () => {
    render(<ControlledList initial={['en', 'fr']} />);

    await userEvent.click(screen.getAllByRole('button', { name: 'controls.order.remove' })[0]);

    await waitFor(() => expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(1));
    expect(screen.getByText(/French/)).toBeTruthy();
  });

  it('offers a suggestion the list does not already have, and not one it does', async () => {
    render(<ControlledList initial={['en']} />);

    await userEvent.click(box());

    const offered = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(offered).toContain('French (fr)');
    // `en` is already chosen, so offering it again would be an option that does
    // nothing when clicked. It still shows in the row below, which is why this
    // reads the options rather than the page.
    expect(offered).not.toContain('English (en)');
  });
});

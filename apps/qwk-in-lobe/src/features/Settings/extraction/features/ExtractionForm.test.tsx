/**
 * @vitest-environment happy-dom
 */
import type * as BaseUi from '@lobehub/ui/base-ui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ORDER_HANDLE_TEST_ID } from '@/features/Settings/qwksearch';

import type * as ExtractionApi from '../api';
import { ExtractionSettingsApiError, type ExtractionSettingsResponse } from '../api';
import ExtractionForm from './ExtractionForm';

const fetchSettingsMock = vi.hoisted(() => vi.fn());
const saveSettingsMock = vi.hoisted(() => vi.fn());
const resetSettingsMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof ExtractionApi>()),
  fetchExtractionSettings: fetchSettingsMock,
  resetExtractionSettings: resetSettingsMock,
  saveExtractionSettings: saveSettingsMock,
}));

vi.mock('@lobehub/ui/base-ui', async (importOriginal) => ({
  ...(await importOriginal<typeof BaseUi>()),
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const response = (
  overrides: ExtractionSettingsResponse['overrides'] = {},
  effective: Partial<ExtractionSettingsResponse['effective']> = {},
): ExtractionSettingsResponse => ({
  effective: {
    citationStyle: 'apa',
    configured: {
      pdfProcessorUrl: false,
      proxy: false,
      scraperApiKey: true,
      scraperUrl: true,
      tavilyApiKey: false,
    },
    languages: ['en'],
    pdfProcessor: 'frontend',
    tiers: ['qwksearch', 'scraper', 'tavily', 'crawler'],
    timeoutSeconds: 10,
    useThirdPartyBackup: false,
    ...effective,
  },
  options: {
    citationStyles: ['apa', 'chicago', 'mla'],
    maxTimeoutSeconds: 60,
    minTimeoutSeconds: 1,
    pdfProcessors: ['docling', 'frontend', 'hybrid'],
    tiers: ['qwksearch', 'scraper', 'tavily', 'crawler'],
  },
  overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchSettingsMock.mockResolvedValue(response());
});

const renderForm = async () => {
  const result = render(<ExtractionForm />);
  await waitFor(() => expect(fetchSettingsMock).toHaveBeenCalled());
  return result;
};

describe('ExtractionForm', () => {
  it('loads the settings once on mount', async () => {
    await renderForm();

    await waitFor(() => expect(screen.getByText('extraction.group.preferences')).toBeTruthy());
    expect(fetchSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('renders the three groups and the operator status rows', async () => {
    await renderForm();

    await waitFor(() => expect(screen.getByText('extraction.group.operator')).toBeTruthy());
    expect(screen.getByText('extraction.group.chain')).toBeTruthy();
    // Two of the five server-side facilities are configured in the fixture.
    expect(screen.getAllByText('extraction.configured.yes')).toHaveLength(2);
    expect(screen.getAllByText('extraction.configured.no')).toHaveLength(3);
  });

  it('says so when the settings cannot be loaded, and does not render the form', async () => {
    fetchSettingsMock.mockRejectedValue(new Error('Unauthorized'));

    await renderForm();

    await waitFor(() => expect(screen.getByText('extraction.error.load')).toBeTruthy());
    expect(screen.getByText('Unauthorized')).toBeTruthy();
    expect(screen.queryByText('extraction.group.preferences')).toBeNull();
  });

  it('asks a signed-out visitor to sign in rather than showing the raw 401', async () => {
    fetchSettingsMock.mockRejectedValue(new ExtractionSettingsApiError('Unauthorized', 401));

    await renderForm();

    await waitFor(() => expect(screen.getByText('extraction.error.loginRequired')).toBeTruthy());
    // The status text is the API's, not something to put in front of a user.
    expect(screen.queryByText('Unauthorized')).toBeNull();
    expect(screen.queryByText('extraction.error.load')).toBeNull();
  });

  it('starts with Save disabled — an untouched form has nothing to write', async () => {
    await renderForm();

    await waitFor(() => expect(screen.getByText('extraction.actions.save')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'extraction.actions.save' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('disables Clear when the user has no stored overrides, and enables it when they do', async () => {
    const { unmount } = await renderForm();
    await waitFor(() => expect(screen.getByText('extraction.actions.reset')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'extraction.actions.reset' })).toHaveProperty(
      'disabled',
      true,
    );

    unmount();
    fetchSettingsMock.mockResolvedValue(response({ citationStyle: 'mla' }));
    await renderForm();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'extraction.actions.reset' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
  });

  it('sends only the field the user touched, leaving the rest inheriting', async () => {
    saveSettingsMock.mockResolvedValue(response({ timeoutSeconds: 25 }));
    await renderForm();

    const timeout = await waitFor(() => screen.getByPlaceholderText('10'));
    await userEvent.type(timeout, '25');

    const save = screen.getByRole('button', { name: 'extraction.actions.save' });
    await waitFor(() => expect(save).toHaveProperty('disabled', false));
    await userEvent.click(save);

    // Every other field is absent, not null — an omitted key is the only way to
    // say "fall back to the operator's configuration".
    await waitFor(() => expect(saveSettingsMock).toHaveBeenCalledWith({ timeoutSeconds: 25 }));
    expect(toastSuccessMock).toHaveBeenCalledWith('extraction.saved');
  });

  it('re-renders from the PUT response, not from what it sent', async () => {
    // The server clamps 99s to its 60s ceiling; the input must follow it down.
    saveSettingsMock.mockResolvedValue(response({ timeoutSeconds: 60 }));
    await renderForm();

    const timeout = await waitFor(() => screen.getByPlaceholderText('10'));
    await userEvent.type(timeout, '99');

    const save = screen.getByRole('button', { name: 'extraction.actions.save' });
    await waitFor(() => expect(save).toHaveProperty('disabled', false));
    await userEvent.click(save);

    await waitFor(() => expect(saveSettingsMock).toHaveBeenCalled());
    await waitFor(() => expect((timeout as HTMLInputElement).value).toBe('60'));
    // And the form is clean again, because it matches what the server stored.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'extraction.actions.save' })).toHaveProperty(
        'disabled',
        true,
      ),
    );
  });

  it('discards unsaved edits back to the stored overrides', async () => {
    await renderForm();

    const timeout = await waitFor(() => screen.getByPlaceholderText('10'));
    await userEvent.type(timeout, '25');

    const revert = screen.getByRole('button', { name: 'extraction.actions.revert' });
    await waitFor(() => expect(revert).toHaveProperty('disabled', false));
    await userEvent.click(revert);

    await waitFor(() => expect((timeout as HTMLInputElement).value).toBe(''));
    expect(saveSettingsMock).not.toHaveBeenCalled();
  });

  it('clears the overrides through DELETE and re-renders from the response', async () => {
    fetchSettingsMock.mockResolvedValue(response({ citationStyle: 'mla' }));
    resetSettingsMock.mockResolvedValue(response({}));
    await renderForm();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'extraction.actions.reset' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'extraction.actions.reset' }));

    await waitFor(() => expect(resetSettingsMock).toHaveBeenCalledTimes(1));
    expect(toastSuccessMock).toHaveBeenCalledWith('extraction.reset');
    // The response said "no overrides", so Clear goes back to disabled.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'extraction.actions.reset' })).toHaveProperty(
        'disabled',
        true,
      ),
    );
  });

  it('reports a failed write without losing what the user typed', async () => {
    fetchSettingsMock.mockResolvedValue(response({ citationStyle: 'mla' }));
    resetSettingsMock.mockRejectedValue(new Error('D1 is down'));
    await renderForm();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'extraction.actions.reset' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'extraction.actions.reset' }));

    // `t` returns the bare key under test, so the interpolated error text is
    // not observable here — that the failure surfaced as an error toast is.
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('extraction.saveFailed'));
    expect(toastSuccessMock).not.toHaveBeenCalled();
    // Still on the form, still showing the stored override.
    expect(screen.getByText('extraction.group.preferences')).toBeTruthy();
  });

  it('shows what is in force even where the user has set nothing', async () => {
    fetchSettingsMock.mockResolvedValue(
      response({}, { citationStyle: 'chicago', timeoutSeconds: 42 }),
    );
    await renderForm();

    // The timeout input is empty — the user set nothing — but its placeholder
    // is the operator's 42s, so the inherited value is visible in the field.
    const timeout = await waitFor(() => screen.getByPlaceholderText('42'));
    expect((timeout as HTMLInputElement).value).toBe('');

    // The two enum fields carry the same "currently X" hint under their label.
    expect(screen.getAllByText('extraction.inForce')).toHaveLength(2);
  });

  it('can set a transcript language at all, which the tags select could not', async () => {
    // The pane shipped with a `mode="tags"` Select and no options. base-ui's
    // Select never creates a value that is not already in `options`, so the
    // field could be looked at and not filled in. This is the regression test
    // for that: type a tag, add it, save it.
    saveSettingsMock.mockResolvedValue(response({ languages: ['fr'] }));
    await renderForm();

    const box = await waitFor(() =>
      screen.getByPlaceholderText('extraction.languages.placeholder'),
    );
    await userEvent.type(box, 'FR');
    // base-ui marks the page outside an open popup inert, which hides Add.
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'controls.language.add' }));

    const save = screen.getByRole('button', { name: 'extraction.actions.save' });
    await waitFor(() => expect(save).toHaveProperty('disabled', false));
    await userEvent.click(save);

    // Lowercased, because that is what `normalizeLanguages` would store.
    await waitFor(() => expect(saveSettingsMock).toHaveBeenCalledWith({ languages: ['fr'] }));
  });

  it('shows the chain in the order it runs, not as an unordered set', async () => {
    fetchSettingsMock.mockResolvedValue(response({ tiers: ['tavily', 'qwksearch'] }));
    await renderForm();

    // Two rows, numbered — the field's order is its execution order, and the
    // ordered list is what says so.
    await waitFor(() => expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(2));
    expect(screen.getByText('controls.order.hint')).toBeTruthy();
  });
});

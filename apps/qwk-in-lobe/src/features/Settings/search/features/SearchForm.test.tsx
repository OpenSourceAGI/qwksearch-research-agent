/**
 * @vitest-environment happy-dom
 */
import type * as BaseUi from '@lobehub/ui/base-ui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ORDER_HANDLE_TEST_ID } from '@/features/Settings/qwksearch';

import type * as SearchApi from '../api';
import { SearchSettingsApiError, type SearchSettingsResponse } from '../api';
import SearchForm from './SearchForm';

const fetchSettingsMock = vi.hoisted(() => vi.fn());
const saveSettingsMock = vi.hoisted(() => vi.fn());
const resetSettingsMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof SearchApi>()),
  fetchSearchSettings: fetchSettingsMock,
  resetSearchSettings: resetSettingsMock,
  saveSearchSettings: saveSettingsMock,
}));

vi.mock('@lobehub/ui/base-ui', async (importOriginal) => ({
  ...(await importOriginal<typeof BaseUi>()),
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const response = (
  overrides: SearchSettingsResponse['overrides'] = {},
  effective: Partial<SearchSettingsResponse['effective']> = {},
): SearchSettingsResponse => ({
  effective: {
    categories: ['general'],
    configured: { apiKey: false, endpoint: true },
    language: 'en-US',
    maxCategories: 3,
    publicInstances: false,
    resultLimit: null,
    safeSearch: false,
    timeRange: null,
    ...effective,
  },
  options: {
    categories: ['files', 'general', 'images', 'news', 'science', 'videos'],
    maxMaxCategories: 10,
    maxResultLimit: 200,
    minMaxCategories: 1,
    minResultLimit: 1,
    timeRanges: ['day', 'month', 'week', 'year'],
  },
  overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchSettingsMock.mockResolvedValue(response());
});

const renderForm = async () => {
  const result = render(<SearchForm />);
  await waitFor(() => expect(fetchSettingsMock).toHaveBeenCalled());
  return result;
};

describe('SearchForm', () => {
  it('loads the settings once on mount', async () => {
    await renderForm();

    await waitFor(() => expect(screen.getByText('search.group.sources')).toBeTruthy());
    expect(fetchSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('renders the three groups and the operator status rows', async () => {
    await renderForm();

    await waitFor(() => expect(screen.getByText('search.group.operator')).toBeTruthy());
    expect(screen.getByText('search.group.results')).toBeTruthy();
    // The fixture has an endpoint but no bearer token.
    expect(screen.getAllByText('search.configured.yes')).toHaveLength(1);
    expect(screen.getAllByText('search.configured.no')).toHaveLength(1);
  });

  it('says so when the settings cannot be loaded, and does not render the form', async () => {
    fetchSettingsMock.mockRejectedValue(new Error('Boom'));

    await renderForm();

    await waitFor(() => expect(screen.getByText('search.error.load')).toBeTruthy());
    expect(screen.getByText('Boom')).toBeTruthy();
    expect(screen.queryByText('search.group.sources')).toBeNull();
  });

  it('asks a signed-out visitor to sign in rather than showing the raw 401', async () => {
    fetchSettingsMock.mockRejectedValue(new SearchSettingsApiError('Unauthorized', 401));

    await renderForm();

    await waitFor(() => expect(screen.getByText('search.error.loginRequired')).toBeTruthy());
    // The status text is the API's, not something to put in front of a user.
    expect(screen.queryByText('Unauthorized')).toBeNull();
    expect(screen.queryByText('search.error.load')).toBeNull();
  });

  it('starts with Save disabled — an untouched form has nothing to write', async () => {
    await renderForm();

    await waitFor(() => expect(screen.getByText('search.actions.save')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'search.actions.save' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('disables Clear when the user has no stored overrides, and enables it when they do', async () => {
    const { unmount } = await renderForm();
    await waitFor(() => expect(screen.getByText('search.actions.reset')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'search.actions.reset' })).toHaveProperty(
      'disabled',
      true,
    );

    unmount();
    fetchSettingsMock.mockResolvedValue(response({ safeSearch: true }));
    await renderForm();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'search.actions.reset' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
  });

  it('sends only the field the user touched, leaving the rest inheriting', async () => {
    saveSettingsMock.mockResolvedValue(response({ maxCategories: 5 }));
    await renderForm();

    const maxCategories = await waitFor(() => screen.getByPlaceholderText('3'));
    await userEvent.type(maxCategories, '5');

    const save = screen.getByRole('button', { name: 'search.actions.save' });
    await waitFor(() => expect(save).toHaveProperty('disabled', false));
    await userEvent.click(save);

    // Every other field is absent, not null — an omitted key is the only way to
    // say "fall back to the operator's configuration".
    await waitFor(() => expect(saveSettingsMock).toHaveBeenCalledWith({ maxCategories: 5 }));
    expect(toastSuccessMock).toHaveBeenCalledWith('search.saved');
  });

  it('re-renders from the PUT response, not from what it sent', async () => {
    // The server clamps a budget of 99 to the ten categories that exist; the
    // input must follow it down.
    saveSettingsMock.mockResolvedValue(response({ maxCategories: 10 }));
    await renderForm();

    const maxCategories = await waitFor(() => screen.getByPlaceholderText('3'));
    await userEvent.type(maxCategories, '99');

    const save = screen.getByRole('button', { name: 'search.actions.save' });
    await waitFor(() => expect(save).toHaveProperty('disabled', false));
    await userEvent.click(save);

    await waitFor(() => expect(saveSettingsMock).toHaveBeenCalled());
    await waitFor(() => expect((maxCategories as HTMLInputElement).value).toBe('10'));
    // And the form is clean again, because it matches what the server stored.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'search.actions.save' })).toHaveProperty(
        'disabled',
        true,
      ),
    );
  });

  it('discards unsaved edits back to the stored overrides', async () => {
    await renderForm();

    const maxCategories = await waitFor(() => screen.getByPlaceholderText('3'));
    await userEvent.type(maxCategories, '5');

    const revert = screen.getByRole('button', { name: 'search.actions.revert' });
    await waitFor(() => expect(revert).toHaveProperty('disabled', false));
    await userEvent.click(revert);

    await waitFor(() => expect((maxCategories as HTMLInputElement).value).toBe(''));
    expect(saveSettingsMock).not.toHaveBeenCalled();
  });

  it('clears the overrides through DELETE and re-renders from the response', async () => {
    fetchSettingsMock.mockResolvedValue(response({ safeSearch: true }));
    resetSettingsMock.mockResolvedValue(response({}));
    await renderForm();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'search.actions.reset' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'search.actions.reset' }));

    await waitFor(() => expect(resetSettingsMock).toHaveBeenCalledTimes(1));
    expect(toastSuccessMock).toHaveBeenCalledWith('search.reset');
    // The response said "no overrides", so Clear goes back to disabled.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'search.actions.reset' })).toHaveProperty(
        'disabled',
        true,
      ),
    );
  });

  it('reports a failed save without losing what the user typed', async () => {
    saveSettingsMock.mockRejectedValue(new Error('D1 is down'));
    await renderForm();

    const maxCategories = await waitFor(() => screen.getByPlaceholderText('3'));
    await userEvent.type(maxCategories, '5');
    await userEvent.click(screen.getByRole('button', { name: 'search.actions.save' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('search.saveFailed'));
    expect((maxCategories as HTMLInputElement).value).toBe('5');
  });

  it('names the sign-in problem on a 401 save rather than showing the raw error', async () => {
    saveSettingsMock.mockRejectedValue(new SearchSettingsApiError('Unauthorized', 401));
    await renderForm();

    const maxCategories = await waitFor(() => screen.getByPlaceholderText('3'));
    await userEvent.type(maxCategories, '5');
    await userEvent.click(screen.getByRole('button', { name: 'search.actions.save' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('search.error.loginRequired'));
  });

  it('shows the unlimited placeholder when no result cap is in force', async () => {
    await renderForm();

    await waitFor(() =>
      expect(screen.getByPlaceholderText('search.resultLimit.unlimited')).toBeTruthy(),
    );
  });

  it('stores the canonical spelling of a typed language tag', async () => {
    // The field was a bare `Input`: `PT-br` went to the server as typed, and
    // came back canonicalized or dropped with nothing said either way.
    saveSettingsMock.mockResolvedValue(response({ language: 'pt-BR' }));
    await renderForm();

    const language = await waitFor(() => screen.getByPlaceholderText('en-US'));
    await userEvent.type(language, 'PT-br');
    await userEvent.tab();

    const save = screen.getByRole('button', { name: 'search.actions.save' });
    await waitFor(() => expect(save).toHaveProperty('disabled', false));
    await userEvent.click(save);

    await waitFor(() => expect(saveSettingsMock).toHaveBeenCalledWith({ language: 'pt-BR' }));
  });

  it('refuses a malformed language tag instead of sending it to be dropped', async () => {
    await renderForm();

    const language = await waitFor(() => screen.getByPlaceholderText('en-US'));
    await userEvent.type(language, 'english');
    await userEvent.tab();

    await waitFor(() => expect(screen.getByText('controls.language.invalid')).toBeTruthy());
    // Nothing to save: the form is still clean, because the server would have
    // stored nothing for this input either.
    expect(screen.getByRole('button', { name: 'search.actions.save' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('shows the categories in the order the fan-out tries them', async () => {
    fetchSettingsMock.mockResolvedValue(response({ categories: ['news', 'general'] }));
    await renderForm();

    // The cap keeps the first N, so the order is the setting — and the ordered
    // list is what makes it visible and changeable.
    await waitFor(() => expect(screen.getAllByTestId(ORDER_HANDLE_TEST_ID)).toHaveLength(2));
    expect(screen.getByText('controls.order.hint')).toBeTruthy();
  });
});

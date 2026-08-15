import { describe, expect, it, vi } from 'vitest';
import { goBackActiveTab, refreshActiveTab } from '../lib/tab-navigation';

describe('goBackActiveTab', () => {
  it('calls chrome.tabs.goBack with the active tab id', () => {
    const goBack = vi.fn();
    const query = vi.fn((_queryInfo, callback) => callback([{ id: 42 }]));
    vi.stubGlobal('chrome', { tabs: { query, goBack } });

    goBackActiveTab();

    expect(query).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function)
    );
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(goBack).toHaveBeenCalledWith(42);
  });

  it('does not call chrome.tabs.goBack when there is no active tab', () => {
    const goBack = vi.fn();
    const query = vi.fn((_queryInfo, callback) => callback([]));
    vi.stubGlobal('chrome', { tabs: { query, goBack } });

    goBackActiveTab();

    expect(goBack).not.toHaveBeenCalled();
  });

  it('does not call chrome.tabs.goBack when the active tab has no id', () => {
    const goBack = vi.fn();
    const query = vi.fn((_queryInfo, callback) => callback([{}]));
    vi.stubGlobal('chrome', { tabs: { query, goBack } });

    goBackActiveTab();

    expect(goBack).not.toHaveBeenCalled();
  });
});

describe('refreshActiveTab', () => {
  it('calls chrome.tabs.reload with the active tab id', () => {
    const reload = vi.fn();
    const query = vi.fn((_queryInfo, callback) => callback([{ id: 7 }]));
    vi.stubGlobal('chrome', { tabs: { query, reload } });

    refreshActiveTab();

    expect(query).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function)
    );
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledWith(7);
  });

  it('does not call chrome.tabs.reload when there is no active tab', () => {
    const reload = vi.fn();
    const query = vi.fn((_queryInfo, callback) => callback([]));
    vi.stubGlobal('chrome', { tabs: { query, reload } });

    refreshActiveTab();

    expect(reload).not.toHaveBeenCalled();
  });
});

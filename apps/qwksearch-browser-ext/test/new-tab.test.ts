import { describe, expect, it, vi } from 'vitest';
import openNewTab from '../lib/new-tab';

describe('openNewTab', () => {
  it('calls chrome.tabs.create with no options', () => {
    const create = vi.fn();
    vi.stubGlobal('chrome', { tabs: { create } });

    openNewTab();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({});
  });
});

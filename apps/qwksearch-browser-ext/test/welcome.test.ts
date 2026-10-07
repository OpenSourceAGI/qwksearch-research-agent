import { describe, expect, it, vi } from 'vitest';
import { FEATURE_GROUPS, handleInstalled, WELCOME_PAGE } from '../lib/welcome';

function browser() {
  return {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
    tabs: { create: vi.fn(async () => ({})) },
  };
}

describe('handleInstalled', () => {
  it('opens the welcome page on a fresh install', async () => {
    const b = browser();
    await handleInstalled(b, { reason: 'install' });
    expect(b.tabs.create).toHaveBeenCalledExactlyOnceWith({ url: `chrome-extension://test/${WELCOME_PAGE}` });
  });

  it('never opens a tab on update, reload or browser update', async () => {
    for (const reason of ['update', 'chrome_update', 'shared_module_update']) {
      const b = browser();
      await handleInstalled(b, { reason });
      expect(b.tabs.create).not.toHaveBeenCalled();
    }
  });
});

describe('FEATURE_GROUPS', () => {
  const features = FEATURE_GROUPS.flatMap((g) => g.features);

  it('says how to reach every feature', () => {
    for (const f of features) {
      expect(f.title).toBeTruthy();
      expect(f.description).toBeTruthy();
      expect(f.access).toBeTruthy();
    }
  });

  it('covers the organizer, the LLM button, login and the full-tab option', () => {
    const titles = features.map((f) => f.title);
    expect(titles).toEqual(
      expect.arrayContaining(['Tab organizer', 'Ask AI (LLM button)', 'Log in to QwkSearch', 'Open as a full tab'])
    );
  });
});

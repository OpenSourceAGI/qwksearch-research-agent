import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * isMac() / isTouchDevice() memoize their result for the session, so each test
 * re-imports the module with a fresh registry to control what they observe.
 */
async function loadWith(navigatorProps: Record<string, unknown>, windowProps: Record<string, unknown> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(navigatorProps)) {
    Object.defineProperty(window.navigator, key, { value, configurable: true });
  }
  for (const [key, value] of Object.entries(windowProps)) {
    Object.defineProperty(window, key, { value, configurable: true });
  }
  return import('../src/utils/plateform');
}

describe('isMac', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('is true on a Mac platform string', async () => {
    const { isMac } = await loadWith({ platform: 'MacIntel' });

    expect(isMac()).toBe(true);
  });

  it('is false on Windows', async () => {
    const { isMac } = await loadWith({ platform: 'Win32' });

    expect(isMac()).toBe(false);
  });

  it('caches its answer across calls', async () => {
    const { isMac } = await loadWith({ platform: 'MacIntel' });
    expect(isMac()).toBe(true);

    Object.defineProperty(window.navigator, 'platform', { value: 'Win32', configurable: true });

    expect(isMac()).toBe(true);
  });
});

describe('getShortcutKey', () => {
  it('renders Mac modifier symbols', async () => {
    const { getShortcutKey } = await loadWith({ platform: 'MacIntel' });

    expect(getShortcutKey('mod')).toBe('⌘');
    expect(getShortcutKey('alt')).toBe('⌥');
    expect(getShortcutKey('shift')).toBe('⇧');
  });

  it('renders spelled-out modifiers elsewhere', async () => {
    const { getShortcutKey } = await loadWith({ platform: 'Win32' });

    expect(getShortcutKey('mod')).toBe('Ctrl');
    expect(getShortcutKey('alt')).toBe('Alt');
    expect(getShortcutKey('shift')).toBe('Shift');
  });

  it('is case insensitive about modifier names', async () => {
    const { getShortcutKey } = await loadWith({ platform: 'Win32' });

    expect(getShortcutKey('MOD')).toBe('Ctrl');
    expect(getShortcutKey('Shift')).toBe('Shift');
  });

  it('passes non-modifier keys through unchanged', async () => {
    const { getShortcutKey } = await loadWith({ platform: 'Win32' });

    expect(getShortcutKey('B')).toBe('B');
    expect(getShortcutKey('Enter')).toBe('Enter');
  });
});

describe('getShortcutKeys', () => {
  it('joins the rendered keys with spaces', async () => {
    const { getShortcutKeys } = await loadWith({ platform: 'Win32' });

    expect(getShortcutKeys(['mod', 'shift', 'B'])).toBe('Ctrl Shift B');
  });

  it('returns an empty string for no keys', async () => {
    const { getShortcutKeys } = await loadWith({ platform: 'Win32' });

    expect(getShortcutKeys([])).toBe('');
  });
});

describe('isTouchDevice', () => {
  it('is true when the window exposes ontouchstart', async () => {
    const { isTouchDevice } = await loadWith({ maxTouchPoints: 0 }, { ontouchstart: null });

    expect(isTouchDevice()).toBe(true);
  });

  it('is true when the navigator reports touch points', async () => {
    vi.resetModules();
    // @ts-expect-error deleting an own property added by a previous test
    delete window.ontouchstart;
    const { isTouchDevice } = await loadWith({ maxTouchPoints: 5 });

    expect(isTouchDevice()).toBe(true);
  });

  it('caches its answer across calls', async () => {
    vi.resetModules();
    // @ts-expect-error deleting an own property added by a previous test
    delete window.ontouchstart;
    const { isTouchDevice } = await loadWith({ maxTouchPoints: 5 });
    expect(isTouchDevice()).toBe(true);

    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 0, configurable: true });

    expect(isTouchDevice()).toBe(true);
  });
});

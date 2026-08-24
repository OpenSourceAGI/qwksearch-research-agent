import { describe, expect, it } from 'vitest';
import findMostRecentClosedTabSessionId from '../lib/undo-close-tab';

describe('findMostRecentClosedTabSessionId', () => {
  it('returns the sessionId of the first closed-tab entry', () => {
    const sessions = [
      { tab: { sessionId: 'tab-1' } },
      { tab: { sessionId: 'tab-2' } },
    ];

    expect(findMostRecentClosedTabSessionId(sessions)).toBe('tab-1');
  });

  it('returns undefined when the list is empty', () => {
    expect(findMostRecentClosedTabSessionId([])).toBeUndefined();
  });

  it('returns undefined when only closed windows are present', () => {
    const sessions = [{ window: { sessionId: 'window-1' } } as any];

    expect(findMostRecentClosedTabSessionId(sessions)).toBeUndefined();
  });

  it('skips a more recent closed-window entry in favor of the next closed tab', () => {
    const sessions = [
      { window: { sessionId: 'window-1' } } as any,
      { tab: { sessionId: 'tab-1' } },
    ];

    expect(findMostRecentClosedTabSessionId(sessions)).toBe('tab-1');
  });

  it('returns undefined when a tab entry has no sessionId', () => {
    const sessions = [{ tab: {} }];

    expect(findMostRecentClosedTabSessionId(sessions)).toBeUndefined();
  });
});

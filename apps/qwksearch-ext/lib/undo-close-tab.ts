/**
 * Finds the `sessionId` of the most recently closed tab in a
 * `chrome.sessions.getRecentlyClosed()` result, skipping closed-window
 * entries even if one is more recent.
 */
export interface ClosedSessionLike {
  tab?: { sessionId?: string }
}

export default function findMostRecentClosedTabSessionId(
  sessions: ClosedSessionLike[]
): string | undefined {
  return sessions.find((session) => session.tab?.sessionId)?.tab?.sessionId
}

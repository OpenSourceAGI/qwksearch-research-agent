
export const countLabel = (count, noun, plural = noun + 's') => `${count} ${count === 1 ? noun : plural}`;

// Journal labels name actions. Toasts report their outcome without changing
// persisted labels that recovery and older versions still understand.
const outcomes = {
  'Edit library': 'Changes saved',
  'Move space': 'Space moved',
  'Remove workspace': 'Space removed',
  'Move collection': 'Collection moved',
  'Delete collection': 'Collection deleted',
  'Pin collection': 'Collection pinned',
  'Unpin collection': 'Collection unpinned',
  'Save note': 'Note saved',
  'Delete note': 'Note deleted',
  'Group saved links': 'Links grouped',
  'Ungroup saved links': 'Links ungrouped',
  'Move saved links': 'Links moved',
  'Remove saved links': 'Links removed',
  'Remove saved link': 'Link removed',
  'Remove saved group': 'Group removed',
  'Apply organisation plan': 'Organisation applied',
  'Export browser bookmarks': 'Bookmarks exported',
};
const skipReasons = {
  navigated: count => `${countLabel(count, 'tab')} changed pages`,
  moved: count => `${countLabel(count, 'tab')} moved to another window`,
  regrouped: count => `${countLabel(count, 'tab')} changed groups`,
  pinned: count => `${countLabel(count, 'tab')} ${count === 1 ? 'was' : 'were'} pinned`,
  private: count => `${countLabel(count, 'tab')} ${count === 1 ? 'was' : 'were'} in private browsing`,
  changed: count => `${countLabel(count, 'tab')} changed before closing`,
  unavailable: count => `Couldn't access ${countLabel(count, 'tab')}`,
  'ungroup-failed': count => `Couldn't ungroup ${countLabel(count, 'tab')}`,
  'close-failed': count => `Closing wasn't confirmed for ${countLabel(count, 'tab')}`,
  cancelled: count => `Closing was cancelled for ${countLabel(count, 'tab')}`,
  unknown: count => `No reason recorded for ${countLabel(count, 'tab')}`,
};
function skippedDetails(op, skipped) {
  const reasons = new Map((op.skipReasons || []).map(entry => [entry.tabId, entry.reason]));
  const counts = new Map();
  for (const id of skipped) {
    const reason = Object.hasOwn(skipReasons, reasons.get(id)) ? reasons.get(id) : 'unknown';
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return [...counts].map(([reason, count]) => skipReasons[reason](count));
}
export function operationFeedback(op, action) {
  if (!op?.label || op.unchanged || action === 'settings' || action === 'undo-action') return null;
  let message = outcomes[op.label] || op.label;
  const incomplete = op.status === 'partial' || !!op.skipped?.length;
  const closing = ['Close tabs', 'Close utility tabs', 'Stash tabs'].includes(op.label);
  const skipped = closing ? [...new Set(op.skipped || [])] : [];
  if (op.label === 'Save tabs') message = `Saved ${countLabel(op.snapshot?.links.length || 0, 'tab')}`;
  if (op.label === 'Stash tabs')
    message = `Saved ${countLabel(op.snapshot?.links.length || 0, 'tab')} · ${op.closed?.length || 0} closed`;
  if (['Close tabs', 'Close utility tabs'].includes(op.label))
    message = op.closed?.length ? `Closed ${countLabel(op.closed.length, 'tab')}` : 'No tabs closed';
  if (skipped.length) message += ` · ${skipped.length} skipped`;
  if (op.cancelled) message += ' · Cancelled';
  else if (incomplete && !skipped.length) message += ' · Incomplete';
  return { message, error: incomplete && !op.cancelled,
    ...(skipped.length ? { details: skippedDetails(op, skipped) } : {}) };
}

export function operationStatus(status) {
  return {
    ready:'Ready', sending:'Exporting', waiting:'Waiting to retry',
    uncertain:'Not confirmed', partial:'Incomplete', failed:'Failed',
    complete:'Complete', committed:'Complete', saved:'Saved',
    closing:'Closing tabs', opening:'Opening tabs', applying:'Applying changes',
    undone:'Undone', cancelled:'Cancelled',
  }[status] || 'Status unavailable';
}

export function serviceError(service, status) {
  const notion = service === 'Notion';
  if (status === 401) return notion
    ? 'Notion rejected the token. Check it in Settings.'
    : 'AI provider rejected the API key. Check it in Settings.';
  if (status === 403) return notion
    ? 'Notion denied the export. Check page access and workspace limits.'
    : 'AI provider denied access. Check your account permissions.';
  if (status === 404) return notion
    ? "Can't access the Notion page. Check the page ID and integration access."
    : 'AI endpoint or model not found. Check Settings.';
  if (status === 429) return `${service} limit reached. Try again later.`;
  if (status === 408 || status === 504) return `${service} timed out. Try again.`;
  if (status >= 500) return `${service} is unavailable. Try again later.`;
  return `${service} rejected the request (${status})`;
}

// Translate known browser failures only. Keep specific application messages
// intact, and never turn an unknown failure into a claim about its cause.
export function errorText(error) {
  const message = typeof error === 'string' ? error : error?.message || '';
  if (/Extension context invalidated|Receiving end does not exist|Could not establish connection/i.test(message))
    return 'LeoTabs needs to reload. Reload the extension, then refresh this page.';
  if (/No tab with id|Invalid tab ID|No window with id/i.test(message)) return 'This tab or window is no longer available';
  if (/Tabs cannot be edited right now/i.test(message)) return 'Finish dragging, then try again';
  if (error?.name === 'QuotaExceededError') return 'Browser storage is full. Free up space, then try again.';
  if (error?.name === 'TimeoutError') return 'The request timed out. Try again.';
  if (error?.name === 'AbortError') return 'Request cancelled';
  if (/Failed to fetch|NetworkError|Load failed/.test(message)) return "Can't connect. Check your connection and try again.";
  return message || "Couldn't complete this action. Try again.";
}

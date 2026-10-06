
import { el, button, task, rpc, domain, favicon } from './shared.js';
import { score } from '../lib/model.js';

// Closed items and historical snapshots share clickable page rows.
export function sessionList({ data, query = '', windowId, history = false, refresh = () => {} }) {
  const root = el('div', { class: 'session-results' });
  const rows = (history ? data.timeline || [] : data.recentSessions || [])
    .filter((r) =>
      score(query, r.name, ...(r.tabs || r.snapshot?.links || []).flatMap((t) => [t.title, t.url])),
    )
    .sort((a, b) => b.at - a.at);
  let limit = 30;
  const restore = async (row, link) => {
    const result = history
      ? await rpc('timeline-restore', {
          id: row.id,
          linkIds: link ? [link.id] : undefined,
          windowId,
        })
      : link
        ? await rpc('restore-recent-tab', { sessionId: row.id, url: link.url, windowId })
        : await rpc('restore-session', { sessionId: row.id });
    if (result?.failed?.length || result?.groupFailures?.length)
      throw Error('Some tabs could not be restored. The snapshot is still available.');
    const focusId=link&&(result?.created?.[0]||result?.reused?.[0]);
    if(focusId)await rpc('activate',{tabId:focusId});
    await refresh();
  };
  const pageButton = (r, t) => {
    const b = button(
      'Reopen tab: ' + (t.title || t.url),
      task(() => restore(r, t)),
      { className: 'tab-choice session-page' },
    );
    b.replaceChildren(
      favicon(t),
      el('span', { class: 'row-title' }, t.title || domain(t.url), el('small', {}, domain(t.url))),
    );
    return b;
  };
  function render() {
    root.replaceChildren(
      ...rows.slice(0, limit).map((r) => {
        const tabs = r.tabs || r.snapshot.links;
        const time = new Date(r.at).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        if (!history && tabs.length === 1 && r.name !== 'Closed window') {
          const b = pageButton(r, tabs[0]);
          return el(
            'div',
            { class: 'session-entry' },
            el('small', { class: 'session-time' }, time),
            b,
          );
        }
        const details = el(
          'details',
          { class: 'session-entry' },
          el(
            'summary',
            {},
            (r.name === 'Browsing session' ? 'Snapshot' : r.name) + ' · ' + tabs.length + ' tabs',
            el('small', { class: 'session-time' }, time),
          ),
        );
        for (const t of tabs.filter((t) => !query || score(query, t.title, t.url, r.name)))
          details.append(pageButton(r, t));
        details.append(
          button(
            history
              ? 'Restore ' + tabs.length + (tabs.length === 1 ? ' tab' : ' tabs')
              : 'Restore window',
            task(() => restore(r)),
            { className: 'session-restore' },
          ),
        );
        return details;
      }),
    );
    if (!rows.length)
      root.append(
        el(
          'p',
          { class: 'empty' },
          query
            ? 'No matching snapshots or tabs.'
            : history
              ? 'Snapshots appear here as you browse.'
              : 'No recently closed tabs or windows.',
        ),
      );
    if (rows.length > limit)
      root.append(
        button('Show more', () => {
          limit += 30;
          render();
        }),
      );
  }
  render();
  return root;
}

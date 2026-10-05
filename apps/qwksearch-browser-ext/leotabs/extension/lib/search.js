
import { score } from './model.js';

export const COMMANDS = [
  {
    id: 'save',
    title: 'Save tabs',
    detail: 'Save to a new collection, with an optional close step',
    context: false,
  },
  {
    id: 'save-close',
    title: 'Stash tabs',
    detail: 'Save with an optional close step',
    context: false,
  },
  {
    id: 'open',
    title: 'Open collection',
    detail: 'Add saved tabs to the current window',
    context: true,
  },
  {
    id: 'switch',
    title: 'Switch collection',
    detail: 'Choose a collection and whether to retain current tabs',
    context: true,
  },
  {
    id: 'note',
    title: 'Edit continuation note',
    detail: 'Remember where to pick up',
    context: true,
  },
  {
    id: 'export',
    title: 'Export collection',
    detail: 'Files, Notion or browser bookmarks',
    context: true,
  },
  {
    id: 'organize',
    title: 'Organise with AI',
    detail: 'Review a plan before changing anything',
    context: true,
  },
  {
    id: 'history',
    title: 'Search closed pages',
    detail: 'Recent browser sessions and retained LeoTabs actions',
    context: false,
  },
  {
    id: 'recovery',
    title: 'Recovery',
    detail: 'Recover saved pages or earlier library versions',
    context: false,
  },
  {
    id: 'settings',
    title: 'Settings',
    detail: 'Appearance, shortcuts and connections',
    context: false,
  },
  {
    id: 'import',
    title: 'Import collections',
    detail: 'Review a portable export before adding it',
    context: false,
  },
];

function contextExpression(value, collections) {
  if (!value.startsWith('@')) return null;
  const quoted = value.match(/^@("(?:\\.|[^"\\])*")(?:\s+(.*))?$/s);
  if (quoted) {
    let name;
    try {
      name = JSON.parse(quoted[1]);
    } catch {
      return { partial: value.slice(1) };
    }
    const matches = collections.filter(
      (c) => c.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    return matches.length === 1
      ? { collection: matches[0], query: quoted[2] || '' }
      : { partial: name, matches };
  }
  const text = value.slice(1);
  const candidates = collections.filter(
    (c) =>
      text.toLocaleLowerCase() === c.name.toLocaleLowerCase() ||
      text.toLocaleLowerCase().startsWith(c.name.toLocaleLowerCase() + ' '),
  );
  candidates.sort((a, b) => b.name.length - a.name.length);
  if (
    candidates.length &&
    candidates.filter((c) => c.name.length === candidates[0].name.length).length === 1
  ) {
    return { collection: candidates[0], query: text.slice(candidates[0].name.length).trimStart() };
  }
  return { partial: text };
}

export function parseQuery(value, collections, chipId = null) {
  const input = String(value).trimStart();
  const chip = collections.find((c) => c.id === chipId) || null;
  // Only intentional prefixes are grammar; URLs, email addresses and paths remain text.
  const command = input.match(/^\/([a-z-]*)(?:\s+(.*))?$/s);
  if (command) {
    const argument = (command[2] || '').trim();
    const context = contextExpression(argument, collections);
    return {
      mode: 'commands',
      command: command[1],
      argument,
      context: context?.collection || chip,
      contextPartial: context?.partial,
      query: context?.query || '',
    };
  }
  const context = contextExpression(input, collections);
  if (context)
    return {
      mode: context.collection && context.query ? 'search' : 'contexts',
      context: context.collection || null,
      query: context.query || '',
      contextPartial: context.partial ?? context.collection?.name ?? '',
    };
  return { mode: 'search', query: input.trim(), context: chip };
}

export function searchResources(
  { state, tabs, recent = [], closed = [] },
  query,
  contextId = null,
  windowId = null,
  limit = 40,
) {
  const context = state.collections.find((c) => c.id === contextId);
  const collections = context ? [context] : state.collections;
  const associated = context ? new Set(context.links.map((l) => l.url)) : null;
  const eligible = tabs.filter(
    (t) =>
      (!state.settings.currentWindowOnly || t.windowId === windowId) &&
      (!associated || associated.has(t.resourceUrl || t.url)),
  );
  const rows = [];
  for (const tab of (context ? [] : [...eligible]).sort(
    (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0),
  )) {
    const rank = score(query, tab.title, tab.resourceUrl || tab.url);
    if (rank)
      rows.push({
        key: `tab:${tab.id}`,
        type: 'tab',
        id: tab.id,
        title: tab.title,
        subtitle: tab.resourceUrl || tab.url,
        verb: 'Switch',
        rank: rank + 5,
      });
  }
  if (query || context)
    for (const c of collections) {
      if (!context && query && score(query, c.name, c.note))
        rows.push({
          key: `collection:${c.id}`,
          type: 'collection',
          id: c.id,
          title: c.name,
          subtitle: c.note || `${c.links.length} saved links`,
          verb: 'Search in',
          rank: score(query, c.name, c.note),
        });
      for (const link of c.links) {
        const rank = score(query, link.title, link.url, link.note, c.name);
        if (rank)
          rows.push({
            key: `link:${c.id}:${link.id}`,
            type: 'link',
            id: link.id,
            collectionId: c.id,
            title: link.title,
            subtitle: link.note || c.name,
            verb: 'Open new tab',
            rank,
          });
      }
    }
  if (query && !context) {
    for (const tab of recent)
      if (!associated || associated.has(tab.url)) {
        const rank = score(query, tab.title, tab.url);
        if (rank)
          rows.push({
            key: `session:${tab.sessionId}`,
            type: 'session',
            id: tab.sessionId,
            title: tab.title || tab.url,
            subtitle: 'Recently closed',
            verb: 'Restore',
            rank,
          });
      }
    for (const record of closed)
      if (!context || record.collectionId === context.id || associated.has(record.url)) {
        const rank = score(query, record.title, record.url, record.note);
        if (rank)
          rows.push({
            key: `closed:${record.id}`,
            type: 'closed',
            id: record.id,
            title: record.title,
            subtitle: 'Retained closed page',
            verb: 'Restore',
            rank,
          });
      }
  }
  return rows.sort((a, b) => b.rank - a.rank).slice(0, limit);
}

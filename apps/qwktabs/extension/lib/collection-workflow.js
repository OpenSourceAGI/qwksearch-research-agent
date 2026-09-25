
import { safeURL } from './model.js';
import { syncCollectionOrder } from './collection-order.js';
export function orderedCollections(collections) {
  return [...collections].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
}
export function collectionAge(collection, now = Date.now()) {
  const updated = collection.updatedAt > collection.createdAt;
  const at = updated ? collection.updatedAt : collection.createdAt;
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  const value =
    seconds < 60
      ? 'just now'
      : seconds < 3600
        ? Math.floor(seconds / 60) + 'm ago'
        : seconds < 86400
          ? Math.floor(seconds / 3600) + 'h ago'
          : Math.floor(seconds / 86400) + 'd ago';
  return (updated ? 'Updated ' : 'Created ') + value;
}
export function updateSignature(tabs, groups) {
  return JSON.stringify([
    tabs.map((t) => [t.id, t.resourceUrl || t.pendingUrl || t.url, t.title, t.groupId, t.index]),
    groups.map((g) => [g.id, g.title, g.color, g.collapsed]),
  ]);
}
// Additive updates preserve curated names, notes, IDs, groups and intentionally duplicated saved links.
export function planCollectionUpdate(collection, snapshot, selectedUrls) {
  const existing = new Map(collection.links.map((link) => [link.url, link]));
  const seen = new Set(existing.keys());
  const allowed = selectedUrls ? new Set(selectedUrls) : null;
  const additions = snapshot.links.filter((link) => {
    if (!safeURL(link.url) || seen.has(link.url)) return false;
    seen.add(link.url);
    return !allowed || allowed.has(link.url);
  });
  const groups = [],
    mapping = new Map();
  for (const group of snapshot.groups) {
    if (!additions.some((l) => l.groupId === group.id)) continue;
    const matches = new Set(
      snapshot.links
        .filter((l) => l.groupId === group.id)
        .map((l) => existing.get(l.url)?.groupId)
        .filter((id) => id && collection.groups.some((g) => g.id === id)),
    );
    if (matches.size === 1) mapping.set(group.id, [...matches][0]);
    else {
      groups.push({ ...group });
      mapping.set(group.id, group.id);
    }
  }
  return {
    additions: additions.map((l) => ({ ...l, groupId: mapping.get(l.groupId) || null })),
    groups,
    alreadySaved: new Set(snapshot.links.filter((l) => existing.has(l.url)).map((l) => l.url)).size,
    kept: collection.links.length,
  };
}

// Match duplicate URLs one-for-one; preserve saved annotations and stable identities.
export function mirrorCollection(collection, snapshot) {
  const available = [...collection.links];
  const pairs = snapshot.links.map((link) => {
    const index = available.findIndex((old) => old.url === link.url);
    return { live: link, old: index < 0 ? null : available.splice(index, 1)[0] };
  });
  const used = new Set(),
    mapped = new Map();
  const groups = snapshot.groups.map((group) => {
    const scores = new Map();
    for (const pair of pairs.filter((p) => p.live.groupId === group.id)) {
      if (pair.old?.groupId) scores.set(pair.old.groupId, (scores.get(pair.old.groupId) || 0) + 1);
    }
    const previous = [...scores]
      .sort((a, b) => b[1] - a[1])
      .find(([id]) => !used.has(id) && collection.groups.some((g) => g.id === id));
    const id = previous?.[0] || group.id;
    used.add(id);
    mapped.set(group.id, id);
    const old=collection.groups.find(g=>g.id===id);
    return { ...group, id, ...(old?.manualName?{manualName:true}:{}) };
  });
  const links = pairs.map(({ live, old }) => ({
    ...live,
    ...(old || {}),
    title:
      old && (old.sourceTitle === undefined || old.title !== old.sourceTitle)
        ? old.title
        : live.title,
    sourceTitle: live.title,
    groupId: mapped.get(live.groupId) || null,
  }));
  const next = { ...collection, links, groups };
  if (Array.isArray(collection.itemOrder)) {
    // A resumed manual layout follows the browser's actual mixed order, using
    // the stable saved IDs established above rather than snapshot-only IDs.
    next.itemOrder = [...new Set(links.map(link => link.groupId ? `group:${link.groupId}` : `link:${link.id}`))];
    syncCollectionOrder(next);
  }
  return next;
}
export function collectionContentKey(c) {
  return JSON.stringify([c.links.map((l) => [l.id, l.url, l.title, l.note, l.groupId]), c.groups, c.itemOrder]);
}
export function tabSetKey(c) {
  return JSON.stringify(
    c.links.map((l) => [
      l.url,
      l.groupId ? c.groups.find((g) => g.id === l.groupId)?.name : null,
      l.groupId ? c.groups.find((g) => g.id === l.groupId)?.color : null,
    ]),
  );
}

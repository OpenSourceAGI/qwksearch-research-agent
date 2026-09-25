
import { groupingTarget } from './tab-arrangement.js';
import { DEFAULT_RULES } from './arrange.js';
import { randomCollectionColor } from './colors.js';

export function groupAndSortCollection(c, { regroupExisting = true } = {}) {
  const eligible = new Set(c.links.filter(l => regroupExisting || !l.groupId).map(l => l.id));
  const buckets = new Map();
  for (const link of c.links) {
    if (!eligible.has(link.id)) continue;
    const target = groupingTarget(link, DEFAULT_RULES);
    link.groupId = null;
    if (!target) continue;
    if (!buckets.has(target.key)) buckets.set(target.key, { ...target, links: [] });
    buckets.get(target.key).links.push(link);
  }
  const used = new Set();
  for (const bucket of buckets.values()) {
    if (bucket.links.length < 2) continue;
    let group = c.groups.find(g => !used.has(g.id) && g.name === bucket.name &&
      !c.links.some(l => l.groupId === g.id && !eligible.has(l.id)));
    if (!group) {
      group = { id: crypto.randomUUID(), name: bucket.name,
        color: randomCollectionColor(c.groups.at(-1)?.color), collapsed: false };
      c.groups.push(group);
    }
    used.add(group.id);
    for (const link of bucket.links) link.groupId = group.id;
  }
  c.groups = c.groups.filter(g => c.links.some(l => l.groupId === g.id));
  return sortCollection(c);
}

export function sortCollection(c) {
  delete c.itemOrder;
  c.groups.sort((a, b) => a.name.localeCompare(b.name));
  const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '');
  c.links = [
    ...c.links.filter(l => !l.groupId).sort(byTitle),
    ...c.groups.flatMap(g => c.links.filter(l => l.groupId === g.id).sort(byTitle)),
  ];
  c.manualOrder = true;
  c.updatedAt = Date.now();
  return c;
}

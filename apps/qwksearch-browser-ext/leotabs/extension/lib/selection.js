
import { uid, stamp } from './model.js';
import { placeCollectionItems, syncCollectionOrder } from './collection-order.js';

// Atomic saved-link batch edits preserve link identity and prune emptied groups.
export function editSavedSelection(collections, collectionId, data) {
  const c = collections.find((c) => c.id === collectionId);
  if (!c) throw new Error('Collection not found.');
  const ids = new Set(data.linkIds || []);
  const links = c.links.filter((l) => ids.has(l.id));
  if (!links.length) throw new Error('Select a saved link');
  const populated = new Set(c.links.map((l) => l.groupId).filter(Boolean));
  if (data.kind === 'group-links') {
    const groupId = data.groupId || uid();
    if (c.groups.some((g) => g.id === groupId)) throw new Error('Group already exists.');
    c.groups.push({ id: groupId, name: 'Group', color: 'blue', collapsed: false });
    links.forEach((l) => {
      l.groupId = groupId;
    });
  } else if (data.kind === 'ungroup-links') {
    links.forEach((l) => {
      l.groupId = null;
    });
  } else if (data.kind === 'delete-links') {
    c.links = c.links.filter((l) => !ids.has(l.id));
  } else if (data.kind === 'move-links') {
    const dest = collections.find((x) => x.id === data.destinationId);
    if (!dest) throw new Error('Choose a destination collection.');
    const groups = new Map();
    const explicitGroup = data.groupId !== undefined;
    const targetGroup = dest.groups.some((g) => g.id === data.groupId) ? data.groupId : null;
    for (const l of links) {
      if (!explicitGroup && dest !== c && l.groupId && !groups.has(l.groupId)) {
        const source = c.groups.find((g) => g.id === l.groupId);
        const id = uid();
        if (source) dest.groups.push({ ...source, id });
        groups.set(l.groupId, source ? id : null);
      }
    }
    if (!data.copy) c.links = c.links.filter((l) => !ids.has(l.id));
    const added = links.map((l) => ({
      ...l,
      id: data.copy ? uid() : l.id,
      groupId: explicitGroup ? targetGroup : dest === c ? l.groupId : groups.get(l.groupId) || null,
    }));
    const index = dest.links.findIndex((l) => l.id === data.beforeId);
    dest.links.splice(index < 0 ? dest.links.length : index, 0, ...added);
    if (explicitGroup && !targetGroup)
      placeCollectionItems(dest,added.map(link=>`link:${link.id}`),data.beforeId);
    else syncCollectionOrder(dest);
    dest.updatedAt = stamp();
  } else throw new Error('Unknown saved-link action.');
  c.groups = c.groups.filter(
    (g) => !populated.has(g.id) || c.links.some((l) => l.groupId === g.id),
  );
  c.updatedAt = stamp();
}

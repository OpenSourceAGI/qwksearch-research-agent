
const collectionItemKey = item => `${item.type}:${item.id}`;

// Older collections retain their loose-tabs-first layout. Manual placement is
// an optional ordering of top-level links and groups, never of group members.
export function orderCollectionItems(items, order) {
  if (!Array.isArray(order)) return items;
  const remaining = new Map(items.map(item => [collectionItemKey(item), item]));
  const result = [];
  for (const key of order) {
    const item = remaining.get(key);
    if (item) { result.push(item); remaining.delete(key); }
  }
  return [...result, ...remaining.values()];
}

export function collectionItems(c) {
  return orderCollectionItems([
    ...c.links.filter(link => !link.groupId).map(link => ({type:'link',id:link.id,value:link})),
    ...c.groups.map(group => ({type:'group',id:group.id,value:group})),
  ], c.itemOrder);
}

export function syncCollectionOrder(c) {
  if (!Array.isArray(c.itemOrder)) return;
  const items = collectionItems(c), members = new Map(c.groups.map(g => [g.id, []]));
  for (const link of c.links) if (link.groupId) members.get(link.groupId)?.push(link);
  c.itemOrder = items.map(collectionItemKey);
  // Opening, backups and other consumers of links use the same visible order.
  const links = items.flatMap(item => item.type === 'link' ? [item.value] : members.get(item.id));
  const included = new Set(links.map(link=>link.id));
  c.links = [...links,...c.links.filter(link=>!included.has(link.id))];
  c.groups = items.filter(item => item.type === 'group').map(item => item.value);
}

export function placeCollectionItems(c, keys, beforeId) {
  const moving = new Set(keys), items = collectionItems(c);
  const remaining = items.filter(item => !moving.has(collectionItemKey(item)));
  const inserted = items.filter(item => moving.has(collectionItemKey(item)));
  const index = remaining.findIndex(item => item.id === beforeId);
  remaining.splice(index < 0 ? remaining.length : index, 0, ...inserted);
  c.itemOrder = remaining.map(collectionItemKey);
  c.manualOrder = true;
  syncCollectionOrder(c);
}

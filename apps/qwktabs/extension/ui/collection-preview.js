
import { orderCollectionItems } from '../lib/collection-order.js';
// A collection has one visual row budget. Group headings consume a row too,
// including empty/folded groups, so adding groups cannot bypass the preview.
export function collectionPreview(ungrouped, groups, limit, order) {
  let remaining = limit;
  const links = [], visibleGroups = [], visibleItems = [];
  let hiddenTabs = 0, hiddenGroups = 0;
  const items = orderCollectionItems([
    ...ungrouped.map(link => ({type:'link',id:link.id,value:link})),
    ...groups.map(section => ({type:'group',id:section.group.id,value:section})),
  ], order);
  for (const item of items) {
    if (item.type === 'link') {
      if (remaining > 0) { remaining--; links.push(item.value); visibleItems.push(item); }
      else hiddenTabs++;
      continue;
    }
    const section = item.value;
    const open = !section.collapsed;
    // Never leave an expanded nonempty group heading stranded at the cutoff.
    const minimum = open && section.links.length ? 2 : 1;
    if (remaining < minimum) {
      hiddenTabs += section.links.length;
      hiddenGroups++;
      remaining = 0;
      continue;
    }
    remaining--;
    const members = open ? section.links.slice(0, remaining) : [];
    remaining -= members.length;
    if (open) hiddenTabs += section.links.length - members.length;
    const visible = { ...section, links: members };
    visibleGroups.push(visible);
    visibleItems.push({...item,value:visible});
  }
  return { links, groups: visibleGroups, items:visibleItems, hiddenTabs, hiddenGroups,
    hasMore: hiddenTabs > 0 || hiddenGroups > 0 };
}

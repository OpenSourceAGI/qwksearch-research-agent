
// Literal, case-insensitive terms keep filtering and visible highlights consistent.
export function matchesPage(page, query) {
  const text = [page.title, page.resourceUrl, page.url, page.note]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/u)
    .every((term) => text.includes(term));
}

export function matchesCollection(collection, query) {
  return !query.trim() || countCollectionMatches(collection, query) > 0;
}

export function countCollectionMatches(collection, query) {
  if (!query.trim()) return 0;
  return Number(matchesPage({ title: collection.name, note: collection.note }, query)) +
    collection.groups.filter(group => matchesPage({ title: group.name }, query)).length +
    collection.links.filter(link => matchesPage(link, query)).length;
}
export function highlightMatches(root, query) {
  const terms = [...new Set(query.trim().split(/\s+/u).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (!terms.length) return;
  const expression = new RegExp(
    terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'giu',
  );
  for (const node of root.querySelectorAll(
    '.row-title, .collection-name:not(input), .recent-page-copy small, .search-match-url',
  )) {
    const content = node.textContent;
    const fragment = document.createDocumentFragment();
    let start = 0;
    for (const match of content.matchAll(expression)) {
      fragment.append(document.createTextNode(content.slice(start, match.index)));
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      fragment.append(mark);
      start = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(content.slice(start)));
    node.replaceChildren(fragment);
  }
}

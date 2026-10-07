
export const SCHEMA = 1;
import { validColor } from './colors.js';
import { syncCollectionOrder } from './collection-order.js';
import { duplicateKey } from './tab-policy.js';
import { DEFAULT_RULES } from './arrange.js';
import {PROVIDERS, MODEL_DEFAULTS_VERSION, migrateModelDefaults} from './providers.js';
export const PALETTE = ['mint', 'blue', 'lavender', 'peach', 'rose', 'teal', 'yellow', 'grey'];
export const uid = () => crypto.randomUUID();
export const stamp = () => Date.now();
export const clone = (value) => structuredClone(value);
export function text(value, max = 500) {
  return String(value ?? '').slice(0, max);
}
export function safeURL(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:', 'file:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function initialState() {
  return {
    schema: SCHEMA,
    revision: 0,
    spaces: [{ id: 'main', name: 'My space' }],
    collections: [],
    settings: {
      theme: 'system',
      tabSort: 'position',
      view: 'board',
      previewCapture: false,
      previewLimitMB: 50,
      currentWindowOnly: true,
      closeAfterStash: true,
      autoUpdateDefault: false,
      provider: 'gemini',
      model: PROVIDERS.gemini.model,
      modelDefaultsVersion: MODEL_DEFAULTS_VERSION,
      aiEndpoint: '',
      notionParent: '',
      rules: structuredClone(DEFAULT_RULES),
      autoGroup: true,
      regroupExisting: true,
      websiteGrouping: true,
    },
  };
}
export function migrate(state) {
  if (!state) return initialState();
  if (state.schema !== SCHEMA)
    throw new Error(
      'Library version not supported. Stored data is unchanged.',
    );
  const spaces = validateSpaces(state.spaces);
  const {organisation, aiNaming, ...settings} = state.settings || {};
  return {
    ...initialState(),
    ...state,
    spaces,
    collections: state.collections.map(({organisation, ...c}) => ({
      ...c,
      spaceId: spaces.some((s) => s.id === c.spaceId) ? c.spaceId : spaces[0].id,
    })),
    settings: { ...initialState().settings, ...migrateModelDefaults(settings), rules: structuredClone(DEFAULT_RULES), websiteGrouping: true },
  };
}
export function validateSpaces(spaces) {
  if (!spaces) return [{ id: 'main', name: 'My space' }];
  if (!Array.isArray(spaces) || !spaces.length || spaces.length > 100)
    throw new Error('The library needs 1–100 spaces');
  const ids = new Set();
  return spaces.map((s) => {
    if (!s || typeof s.id !== 'string' || !s.id || ids.has(s.id)) throw new Error('A space has a missing or duplicate ID');
    ids.add(s.id);
    return { id: text(s.id, 100), name: text(s.name).trim() || 'New space' };
  });
}
export function moveSpace(spaces, spaceId, beforeId) {
  const from = spaces.findIndex((space) => space.id === spaceId);
  if (from < 0) throw new Error('Space not found');
  if (beforeId != null && !spaces.some((space) => space.id === beforeId))
    throw new Error('Destination space not found');
  if (spaceId === beforeId) return;
  const [space] = spaces.splice(from, 1);
  const to = spaces.findIndex((item) => item.id === beforeId);
  spaces.splice(to < 0 ? spaces.length : to, 0, space);
}
export function newCollection(name = 'Untitled', color = 'blue') {
  const now = stamp();
  return {
    id: uid(),
    spaceId: 'main',
    pinned: false,
    autoUpdate: false,
    name: text(name).trim() || 'Untitled',
    color: validColor(color) ? color : 'blue',
    note: '',
    collapsed: false,
    groups: [],
    links: [],
    createdAt: now,
    updatedAt: now,
  };
}
export function tabLink(tab, groupId = null) {
  const url = safeURL(tab.resourceUrl || tab.pendingUrl || tab.url);
  if (!url) return null;
  return {
    id: uid(),
    title: text(tab.title || url),
    sourceTitle: text(tab.title || url),
    url,
    groupId,
    note: '',
    createdAt: stamp(),
  };
}
export function snapshotTabs(tabs, groups = []) {
  const collection = newCollection(
    `Saved ${new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
  );
  const mapped = new Map();
  for (const tab of [...tabs].sort((a, b) => a.windowId - b.windowId || a.index - b.index)) {
    if (tab.groupId >= 0 && !mapped.has(tab.groupId)) {
      const source = groups.find((g) => g.id === tab.groupId);
      const group = {
        id: uid(),
        name: text(source?.title || 'Group'),
        color: source?.color || 'blue',
        collapsed: !!source?.collapsed,
      };
      mapped.set(tab.groupId, group.id);
      collection.groups.push(group);
    }
    const link = tabLink(tab, mapped.get(tab.groupId) || null);
    if (link) collection.links.push(link);
  }
  return collection;
}
export function validateCollections(input, { freshIds = false } = {}) {
  if (!Array.isArray(input) || input.length > 2000)
    throw new Error('Import exceeds the 2,000-collection limit');
  let count = 0;
  return input.map((raw) => {
    if (!raw || !Array.isArray(raw.links) || !Array.isArray(raw.groups || []))
      throw new Error('A collection is missing its tab or group list');
    const c = newCollection(raw.name, raw.color);
    c.spaceId = text(raw.spaceId || 'main', 100);
    const map = new Map();
    if (!freshIds && typeof raw.id === 'string') c.id = text(raw.id, 100);
    c.note = text(raw.note, 10000);
    c.collapsed = !!raw.collapsed;
    c.pinned = !!raw.pinned;
    c.autoUpdate = raw.autoUpdate !== false;
    if(raw.manualName)c.manualName=true;
    if(raw.manualOrder)c.manualOrder=true;
    if(raw.manualPlacement)c.manualPlacement=true;
    if (Number.isFinite(raw.createdAt) && raw.createdAt > 0) c.createdAt = raw.createdAt;
    if (Number.isFinite(raw.updatedAt) && raw.updatedAt > 0) c.updatedAt = raw.updatedAt;
    c.groups = (raw.groups || []).map((g) => {
      if (!g || typeof g.id !== 'string' || map.has(g.id))
        throw new Error('A group has a missing or duplicate ID');
      const id = freshIds ? uid() : text(g.id, 100);
      map.set(g.id, id);
      return {
        id,
        name: text(g.name) || 'Group',
        color: text(g.color, 20),
        collapsed: !!g.collapsed,
        ...(g.manualName?{manualName:true}:{}),
      };
    });
    const ids = new Set(), linkMap = new Map();
    c.links = raw.links.map((l) => {
      if (++count > 50000) throw new Error('Import exceeds the 50,000-link limit');
      const url = safeURL(l?.url);
      if (!url) throw new Error('An imported URL is not supported');
      const id = freshIds ? uid() : text(l.id || uid(), 100);
      if (ids.has(id)) throw new Error('The import contains duplicate link IDs');
      ids.add(id);
      if (typeof l.id === 'string') linkMap.set(l.id, id);
      return {
        id,
        title: text(l.title || url),
        url,
        note: text(l.note, 10000),
        groupId: map.get(l.groupId) || null,
        createdAt: Number(l.createdAt) || stamp(),
        ...(l.manualGroup?{manualGroup:true}:{}),
      };
    });
    if (Array.isArray(raw.itemOrder)) {
      c.itemOrder = raw.itemOrder.slice(0, raw.links.length + c.groups.length).flatMap(key => {
        if (typeof key !== 'string') return [];
        const split = key.indexOf(':'), type = key.slice(0, split), oldId = key.slice(split + 1);
        const id = type === 'link' ? linkMap.get(oldId) : type === 'group' ? map.get(oldId) : null;
        return id ? [`${type}:${id}`] : [];
      });
      syncCollectionOrder(c);
    }
    return c;
  });
}
export function duplicateCandidates(tabs) {
  const seen = new Set(),
    duplicates = [];
  for (const t of [...tabs].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      Number(b.active) - Number(a.active) ||
      (b.lastAccessed || 0) - (a.lastAccessed || 0),
  )) {
    const url = duplicateKey(t);
    if (!url) continue;
    if (seen.has(url) && !t.pinned) duplicates.push(t.id);
    else seen.add(url);
  }
  return duplicates;
}
export function sameCapturedTab(current, captured) {
  return (
    current.id === captured.id &&
    !current.pinned &&
    !current.incognito &&
    current.windowId === captured.windowId &&
    current.url === captured.url &&
    (current.pendingUrl || '') === (captured.pendingUrl || '')
  );
}
export function score(query, ...values) {
  const q = query.toLocaleLowerCase().trim();
  if (!q) return 1;
  const hay = values.join(' ').toLocaleLowerCase();
  const words = q.split(/\s+/);
  if (!words.every((w) => hay.includes(w))) return 0;
  const title = String(values[0] || '').toLocaleLowerCase();
  return title === q ? 100 : title.startsWith(q) ? 70 : title.includes(q) ? 50 : 20;
}
export function validatePlan(raw, collection) {
  if (!raw || !Array.isArray(raw.groups) || raw.groups.length > 30)
    throw new Error('AI returned an unusable grouping plan');
  const allIDs = new Set(collection.links.map((l) => l.id));
  const scope = raw.scopeLinkIds || [...allIDs];
  if (!Array.isArray(scope) || scope.length > 300 || scope.some((id) => !allIDs.has(id)))
    throw new Error('Select up to 300 current links for AI');
  const known = new Set(scope),
    assigned = new Set();
  const orderedLinkIds=raw.orderedLinkIds||[];
  if(!Array.isArray(orderedLinkIds)||new Set(orderedLinkIds).size!==orderedLinkIds.length||orderedLinkIds.some(id=>!known.has(id)))
    throw Error('AI returned an unusable reading order');
  const groups = raw.groups.map((g) => {
    if (!Array.isArray(g.linkIds) || !g.name)
      throw new Error('AI returned a group without a name or links');
    for (const id of g.linkIds) {
      if (!known.has(id) || assigned.has(id))
        throw new Error('AI referenced missing or repeated links');
      assigned.add(id);
    }
    return {
      id: uid(),
      name: text(g.name, 100),
      linkIds: g.linkIds,
      accepted: g.accepted !== false,
    };
  });
  return {
    collectionId: collection.id,
    scopeLinkIds: scope,
    fingerprint: JSON.stringify([
      collection.name,
      collection.note,
      collection.groups,
      collection.links.map((l) => [l.id, l.url, l.title, l.note, l.groupId]),
    ]),
    groups,
    orderedLinkIds,
    collectionName: text(raw.collectionName, 100),
    note: text(raw.note, 3000),
  };
}

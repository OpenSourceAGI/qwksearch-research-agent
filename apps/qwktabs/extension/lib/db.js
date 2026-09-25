
import { migrate, clone, stamp, uid, safeURL } from './model.js';
let connection;
export function journalSummary({ before, beforeCollection,afterCollection, tabs, snapshot, sourceGroups, blocks, after, pages, ...operation }) {
  return { ...operation, ...(pages ? { pages: pages.map(journalSummary) } : {}), recoverable: !!snapshot, undoable: operation.undoable || !!before };
}
function closedRows(operation) {
  const closed = new Set(operation.closed || []);
  return (operation.tabs || [])
    .filter((tab) => closed.has(tab.id))
    .flatMap((tab) => {
      const url = safeURL(tab.resourceUrl || tab.pendingUrl || tab.url);
      return url
        ? [
            {
              id: `${operation.id}:${tab.id}`,
              title: tab.title || url,
              url,
              at: operation.at,
              collectionId: operation.collectionId || null,
              operationId: operation.id,
            },
          ]
        : [];
    });
}
export function openDB() {
  return (connection ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('neo-library', 4);
    request.onupgradeneeded = () => {
      for (const name of [
        'state',
        'journal',
        'previews',
        'parked',
        'journalMeta',
        'closed',
        'timeline',
        'favicons',
      ]) {
        if (!request.result.objectStoreNames.contains(name))
          request.result.createObjectStore(name, { keyPath: 'id' });
      }
      const cursor = request.transaction.objectStore('journal').openCursor();
      cursor.onsuccess = () => {
        const item = cursor.result;
        if (!item) return;
        request.transaction.objectStore('journalMeta').put(journalSummary(item.value));
        for (const row of closedRows(item.value))
          request.transaction.objectStore('closed').put(row);
        item.continue();
      };
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        connection = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      connection = null;
      reject(request.error);
    };
  }));
}
export async function read(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function all(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function write(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      store === 'journal' ? ['journal', 'journalMeta', 'closed', 'timeline'] : store,
      'readwrite',
      { durability: 'strict' },
    );
    if (store === 'journal') {
      const previous = tx.objectStore('journal').get(value.id);
      previous.onsuccess = () => {
        const existing = new Set(previous.result?.closed || []);
        for (const row of closedRows({
          ...value,
          closed: (value.closed || []).filter((id) => !existing.has(id)),
        }))
          tx.objectStore('closed').put(row);
      };
      tx.objectStore('journalMeta').put(journalSummary(value));
    }
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Save interrupted. Try again.'));
  });
}
export async function remove(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      store === 'journal' ? ['journal', 'journalMeta'] : store,
      'readwrite',
    );
    tx.objectStore(store).delete(id);
    if (store === 'journal') tx.objectStore('journalMeta').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
// Check a capture's generation inside the transaction, after earlier queued
// writes finish. A stale capture leaves the existing cached image untouched.
export async function writeIf(store, value, allowed) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    let written = false;
    const request = tx.objectStore(store).get(value.id);
    request.onsuccess = () => {
      if (allowed()) {
        tx.objectStore(store).put(value);
        written = true;
      }
    };
    tx.oncomplete = () => resolve(written);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error('Save interrupted. Try again.'));
  });
}
export async function getState() {
  return migrate((await read('state', 'library'))?.value);
}
// One read-write transaction atomically commits the library and its recovery record.
export async function mutate(label, transform) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'journal', 'journalMeta', 'timeline'], 'readwrite', {
      durability: 'strict',
    });
    let result;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Save interrupted. Try again.'));
    tx.oncomplete = () => resolve(result);
    const request = tx.objectStore('state').get('library');
    request.onsuccess = () => {
      try {
        const before = migrate(request.result?.value),
          next = clone(before);
        const detail = transform(next);
        if (detail?.then) throw new Error('Library transforms must be synchronous.');
        if (
          next.collections.length > 2000 ||
          next.collections.reduce((sum, c) => sum + c.links.length, 0) > 50000
        )
          throw new Error(
            'Library limit reached: 2,000 collections or 50,000 links. Remove collections to add more.',
          );
        if (detail?.unchanged) {
          result = { state: before, operation: null };
          return;
        }
        const versions = before.collections.filter((c) => {
          const after = next.collections.find((x) => x.id === c.id);
          return (
            after &&
            JSON.stringify([c.links, c.groups, c.note]) !==
              JSON.stringify([after.links, after.groups, after.note])
          );
        });
        for (const c of versions) {
          tx.objectStore('timeline').put({
            id: uid(),
            at: stamp(),
            windowId: detail?.versionWindowId,
            collectionId: c.id,
            name: c.name,
            reason: label,
            snapshot: clone(c),
            version: true,
          });
        }
        if (versions.length) {
          const history = tx.objectStore('timeline');
          const request = history.getAll();
          request.onsuccess = () => {
            const rows = request.result.sort((a, b) => b.at - a.at);
            for (const [index, row] of rows.entries())
              if (index >= 200 || row.at < stamp() - 30 * 86400000) history.delete(row.id);
          };
        }
        next.revision = before.revision + 1;
        const operation = {
          id: uid(),
          label,
          at: stamp(),
          status: 'committed',
          before,
          revision: next.revision,
          ...detail,
        };
        tx.objectStore('state').put({ id: 'library', value: next });
        tx.objectStore('journal').put(operation);
        tx.objectStore('journalMeta').put(journalSummary(operation));
        result = { state: next, operation };
      } catch (e) {
        reject(e);
        tx.abort();
      }
    };
  });
}
export async function undoLibrary(id) {
  const op = await read('journal', id);
  if (!op?.before) throw new Error('Can\'t undo this library change');
  return mutate(`Undo ${op.label}`, (state) => {
    if (state.revision !== op.revision)
      throw new Error(
        'Can\'t undo after newer edits. Restore a copy from Recovery.',
      );
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, clone(op.before));
    return { undoes: id };
  });
}
export async function trimJournal() {
  const entries = (await all('journalMeta')).sort((a, b) => b.at - a.at);
  // Never prune incomplete operations. Keep at most 20 completed library snapshots.
  for (const e of entries
    .filter((e) => ['committed', 'complete', 'undone'].includes(e.status))
    .slice(20))
    await remove('journal', e.id);
  const closed = (await all('closed')).sort((a, b) => b.at - a.at);
  for (let i = 0; i < closed.length; i++)
    if (i >= 1000 || closed[i].at < Date.now() - 30 * 86400000)
      await remove('closed', closed[i].id);
}

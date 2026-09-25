
import { parkedTitle, settleParked } from './parked.js';
import { snapshotTabs, safeURL, sameCapturedTab, stamp, uid } from './model.js';
import { manageableURL } from './tab-policy.js';
import { randomCollectionColor } from './colors.js';
import {policyFor,applySavedPolicy} from './organisation.js';
import { collectionItems, placeCollectionItems, syncCollectionOrder } from './collection-order.js';

function changedTabReason(current, captured) {
  if (current.pinned) return 'pinned';
  if (current.incognito) return 'private';
  if (current.windowId !== captured.windowId) return 'moved';
  if (current.url !== captured.url || (current.pendingUrl || '') !== (captured.pendingUrl || '')) return 'navigated';
  if (current.groupId !== captured.groupId) return 'regrouped';
  return 'changed';
}

// Dependencies are explicit so failure tests use the exact production operation path.
export function operations({ browser, db, beforeStashClose = async () => {}, afterStashClose = async () => {} }) {
  const ownURL = browser.runtime.getURL('');
  const available = (t) => !t.incognito && manageableURL(t.resourceUrl || t.pendingUrl || t.url)
    && !(String(t.url || '').startsWith(ownURL) && !t.parked);
  async function live(ids) {
    const tabs = await Promise.all(
      (await browser.tabs.query({})).map(async (t) => {
        if (String(t.url || '').startsWith(ownURL + 'parked.html?')) {
          const saved = await db.read('parked', new URL(t.url).searchParams.get('id'));
          if (saved) return { ...t, resourceUrl: saved.url, title: saved.title, parked: true };
        }
        return t;
      }),
    );
    return tabs.filter((t) => available(t) && (!ids || ids.includes(t.id)));
  }
  async function closeCaptured(operation, tabs, excludeIds = [], signal) {
    operation.status = 'closing';
    operation.attempted ||= [];
    operation.closed ||= [];
    operation.skipped ||= [];
    operation.skipReasons ||= [];
    const skip = (tabId, reason) => {
      operation.skipped.push(tabId);
      operation.skipReasons.push({ tabId, reason });
    };
    const restoredGroups = new Map();
    async function restoreGrouping(tab, group) {
      // A failed/cancelled close must not leave a surviving tab detached. Do not
      // override a concurrent move, pin, or a group chosen by the user.
      try {
        const survivor = await browser.tabs.get(tab.id);
        if (survivor.windowId !== tab.windowId || survivor.pinned || survivor.groupId !== -1)
          return;
        const groups = await browser.tabGroups.query({ windowId: tab.windowId });
        const existingId = restoredGroups.get(tab.groupId) ?? tab.groupId;
        const existing = groups.find((g) => g.id === existingId);
        const groupId = await browser.tabs.group({
          tabIds: [tab.id],
          ...(existing
            ? { groupId: existing.id }
            : { createProperties: { windowId: tab.windowId } }),
        });
        restoredGroups.set(tab.groupId, groupId);
        if (!existing && group)
          await browser.tabGroups.update(groupId, {
            title: group.title,
            color: group.color,
            collapsed: group.collapsed ?? false,
          });
      } catch {
        // The durable snapshot still contains the original group if Chrome
        // also refuses the repair (for example while the user drags a tab).
        (operation.groupRepairFailed ||= []).push(tab.id);
      }
    }
    await db.write('journal', operation);
    for (const captured of tabs) {
      if (signal?.aborted) {
        operation.cancelled = true;
        break;
      }
      if (excludeIds.includes(captured.id)) continue;
      let current;
      try {
        current = await browser.tabs.get(captured.id);
      } catch {
        skip(captured.id, 'unavailable');
        continue;
      }
      if (signal?.aborted) {
        operation.cancelled = true;
        break;
      }
      if (!sameCapturedTab(current, captured) || current.groupId !== captured.groupId) {
        skip(captured.id, changedTabReason(current, captured));
        continue;
      }
      operation.attempted.push(captured.id);
      await db.write('journal', operation);
      if (signal?.aborted) {
        operation.cancelled = true;
        break;
      }
      let detached = false;
      let failureReason = 'close-failed';
      const group = operation.sourceGroups?.find((g) => g.id === current.groupId);
      try {
        // Closing grouped tabs can leave a saved Chrome group behind. Ungroup
        // only the captured outgoing tabs first; empty groups are then deleted.
        // Snapshot/journal writes above must succeed before either mutation.
        if (current.groupId >= 0 && typeof browser.tabs.ungroup === 'function') {
          failureReason = 'ungroup-failed';
          await browser.tabs.ungroup(current.id);
          detached = true;
          failureReason = 'unavailable';
          const latest = await browser.tabs.get(current.id);
          if (signal?.aborted || !sameCapturedTab(latest, captured) || latest.groupId !== -1) {
            if (signal?.aborted) operation.cancelled = true;
            failureReason = signal?.aborted ? 'cancelled' : changedTabReason(latest, { ...captured, groupId: -1 });
            throw new Error('Tab changed during group cleanup');
          }
        }
        failureReason = 'close-failed';
        await browser.tabs.remove(captured.id);
        operation.closed.push(captured.id);
      } catch {
        if (detached) await restoreGrouping(current, group);
        skip(captured.id, failureReason);
      }
      await db.write('journal', operation);
    }
    operation.status = operation.cancelled ? 'partial' : 'complete';
    await db.write('journal', operation);
    return operation;
  }
  async function save({
    tabIds,
    name,
    destinationId,
    spaceId,
    close = false,
    excludePinned = true,
    automaticName = false,
    preserveLayout = false,
    drop,
  }) {
    const tabs = (await live(tabIds)).filter((t) => !excludePinned || !t.pinned);
    if (!tabs.length) throw new Error('No tabs to save');
    const groups = (await browser.tabGroups.query({})).filter((group) =>
      tabs.some((tab) => tab.groupId === group.id),
    );
    const captured = snapshotTabs(tabs, groups);
    if (!captured.links.length) {
      if (close) {
        const operation={ id:uid(), label:'Close utility tabs', at:stamp(), snapshot:captured, sourceGroups:groups, tabs };
        await db.write('journal',operation);
        await beforeStashClose(tabs);
        const result=await closeCaptured(operation,tabs);await afterStashClose(result);return result;
      }
      throw new Error('Can\'t save utility tabs');
    }
    if (automaticName) captured.name = 'Saved on '+new Date(captured.createdAt).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    if (name?.trim()) captured.name = name.trim().slice(0, 500);
    const { operation } = await db.mutate(close ? 'Stash tabs' : 'Save tabs', (state) => {
      const target=destinationId?state.collections.find(c=>c.id===destinationId):null;
      const policy=policyFor(state,target,spaceId||target?.spaceId||state.spaces?.[0]?.id);
      if(name?.trim())captured.manualName=true;
      if(policy.automatic&&!preserveLayout&&!drop)applySavedPolicy(captured,policy,state.settings.rules,{space:state.spaces?.find(s=>s.id===(spaceId||target?.spaceId))?.name||''});
      // Drag intent is explicit: individual/selected tabs never import their
      // browser groups. Only dragging the group header preserves that unit.
      if (drop && !drop.group) {
        if (drop.groupId && !target?.groups.some(g => g.id === drop.groupId))
          throw new Error('The destination group changed. Drag again.');
        captured.groups = [];
        captured.links.forEach(link => { link.groupId = drop.groupId || null; link.manualGroup = true; });
      }
      if (destinationId) {
        const dest = state.collections.find((c) => c.id === destinationId);
        if (!dest) throw new Error('This collection is no longer available');
        const topDrop = drop && (drop.group || !drop.groupId);
        const items = topDrop ? collectionItems(dest) : dest.links;
        const index = items.findIndex(item => item.id === drop?.beforeId);
        if (drop?.beforeId && index < 0) throw new Error('The drop target changed. Drag again.');
        if (drop?.group) {
          dest.groups.push(...captured.groups);
          dest.links.push(...captured.links);
        } else {
          dest.groups.push(...captured.groups);
          dest.links.splice(index < 0 ? dest.links.length : index, 0, ...captured.links);
        }
        if (drop) {
          if (topDrop) placeCollectionItems(dest,
            drop.group ? captured.groups.map(g=>`group:${g.id}`) : captured.links.map(l=>`link:${l.id}`),drop.beforeId);
          else syncCollectionOrder(dest);
          dest.manualOrder = true;
          dest.collapsed = false;
          const group = dest.groups.find(g => g.id === drop.groupId);
          if (group) group.collapsed = false;
          if (drop.pauseAutoUpdate && dest.autoUpdate !== false) {
            dest.autoUpdate = false;
            dest.autoUpdatePausedReason = 'Saved list edited';
          }
        }
        dest.updatedAt = stamp();
        } else {
          captured.color = randomCollectionColor(state.collections.at(-1)?.color);
          captured.autoUpdate = !!state.settings.autoUpdateDefault;
          captured.spaceId =
          state.spaces?.find((s) => s.id === spaceId)?.id || state.spaces?.[0]?.id || 'main';
        state.collections.push(captured);
      }
      return {
        snapshot: captured,
        sourceGroups: groups,
        tabs: tabs.map((t) => ({ ...t, favIconUrl: undefined })),
        collectionId: destinationId || captured.id,
        status: close ? 'saved' : 'complete',
      };
    });
    if (close) {
      // Save durably first, then stop mirroring before removal events can turn
      // the active collection into the remaining (possibly empty) tab set.
      await beforeStashClose(tabs);
      await closeCaptured(operation, tabs);
      await afterStashClose(operation);
    }
    return operation;
  }
  async function close(tabIds) {
    const tabs = (await live(tabIds)).filter((t) => !t.pinned);
    if (!tabs.length) throw new Error('No unpinned tabs to close');
    const sourceGroups = (await browser.tabGroups.query({})).filter((group) =>
      tabs.some((tab) => tab.groupId === group.id),
    );
    const operation = {
      id: uid(),
      label: 'Close tabs',
      at: stamp(),
      status: 'saved',
      snapshot: snapshotTabs(tabs, sourceGroups),
      sourceGroups,
      tabs,
    };
    await db.write('journal', operation);
    return closeCaptured(operation, tabs);
  }
  async function openLinks({
    collection,
    linkIds,
    windowId,
    deferred = true,
    reuse = true,
    signal,
    onProgress = async () => {},
  }) {
    const links = collection.links.filter((l) => !linkIds || linkIds.includes(l.id));
    const existing = await live();
    const used = new Set(),
      result = { created: [], reused: [], failed: [], groupFailures: [] };
    const assignments = new Map();
    const pending = new Set();
    let completed = 0;
    async function settle(tab, target, resultIndex, groupIds, groupIndex) {
      try {
        const record = await db.read('parked', new URL(target).searchParams.get('id'));
        if (record) tab = await settleParked(browser, tab, target, parkedTitle(record));
      } catch {
        /* A local parked page stays inert until selected. */
      }
      result.created[resultIndex] = tab.id;
      if (groupIds) groupIds[groupIndex] = tab.id;
    }
    for (const link of links) {
      if (signal?.aborted) {
        result.cancelled = true;
        break;
      }
      try {
        const url = safeURL(link.url);
        if (!url) throw new Error('This URL isn\'t supported');
        const matches = reuse
          ? existing.filter(
              (t) =>
                t.windowId === windowId &&
                (t.resourceUrl || t.url) === url &&
                !t.pendingUrl &&
                !used.has(t.id),
            )
          : [];
        // Ambiguous live duplicates stay distinct. Never pick an arbitrary instance.
        let tab = matches.length === 1 ? matches[0] : null;
        if (tab) {
          used.add(tab.id);
          result.reused.push(tab.id);
        } else {
          let target = url;
          if (deferred) {
            const token = uid();
            await db.write('parked', { id: token, url, title: link.title, at: stamp() });
            target = browser.runtime.getURL(`parked.html?id=${encodeURIComponent(token)}`);
          }
          tab = await browser.tabs.create({ url: target, windowId, active: false });
          const resultIndex = result.created.push(tab.id) - 1;
          let groupIds, groupIndex;
          if (link.groupId) {
            groupIds = assignments.get(link.groupId) || [];
            groupIndex = groupIds.push(tab.id) - 1;
            assignments.set(link.groupId, groupIds);
          }
          if (deferred) {
            // Creates stay ordered. At most four local navigations settle
            // concurrently, avoiding one full navigation wait per saved link.
            const work = settle(tab, target, resultIndex, groupIds, groupIndex);
            pending.add(work);
            work.finally(() => pending.delete(work));
            if (pending.size >= 4) await Promise.race(pending);
          }
        }
      } catch (e) {
        result.failed.push({ id: link.id, message: String(e.message) });
      }
      await onProgress({ completed: ++completed, total: links.length });
    }
    await Promise.all(pending);
    for (const [id, tabIds] of assignments) {
      try {
        const group = collection.groups.find((g) => g.id === id);
        const groupId = await browser.tabs.group({ tabIds, createProperties: { windowId } });
        await browser.tabGroups.update(groupId, {
          title: group?.name || 'Group',
          color: [
            'grey',
            'blue',
            'red',
            'yellow',
            'green',
            'pink',
            'purple',
            'cyan',
            'orange',
          ].includes(group?.color)
            ? group.color
            : 'blue',
          collapsed: !!group?.collapsed,
        });
      } catch {
        result.groupFailures.push(id);
      }
    }
    return result;
  }
  async function switchCollection({
    tabIds,
    destinationId,
    saveToId,
    saveCurrent = true,
    spaceId,
    name,
    windowId,
    signal,
  }) {
    const state = await db.getState();
    const destination = state.collections.find((c) => c.id === destinationId);
    if (!destination) throw new Error('Destination not found.');
    if (!destination.links.length) throw new Error('This collection has no saved tabs');
    if (saveCurrent && saveToId === destinationId)
      throw new Error('Choose a different collection for the current tabs');
    const tabs = (await live(tabIds)).filter((t) => !t.pinned);
    if (!tabs.length)
      return {
        label: 'Opened ' + destination.name,
        ...(await openLinks({ collection: destination, windowId, deferred: true, signal })),
      };
    let saved;
    if (saveCurrent) {
      saved = await save({ tabIds, name, destinationId: saveToId, spaceId, close: false });
    } else {
      const sourceGroups = (await browser.tabGroups.query({})).filter((group) =>
        tabs.some((tab) => tab.groupId === group.id),
      );
      // A close recovery snapshot enables Undo without adding a library collection.
      saved = {
        id: uid(),
        at: stamp(),
        snapshot: snapshotTabs(tabs, sourceGroups),
        sourceGroups,
        tabs,
      };
    }
    saved.label = 'Switch collection';
    saved.status = 'opening';
    await db.write('journal', saved);
    const opened = await openLinks({ collection: destination, windowId, deferred: true, signal });
    saved.opened = opened;
    // Preserve source if even part of the destination failed.
    if (
      opened.cancelled ||
      signal?.aborted ||
      opened.failed.length ||
      opened.groupFailures.length
    ) {
      saved.status = 'partial';
      saved.cancelled = !!opened.cancelled || !!signal?.aborted;
      await db.write('journal', saved);
      return saved;
    }
    return closeCaptured(saved, saved.tabs, opened.reused, signal);
  }
  async function recover(id, windowId) {
    const op = await db.read('journal', id);
    if (!op?.snapshot) throw new Error('No saved snapshot for this action');
    return openLinks({ collection: op.snapshot, windowId, deferred: true });
  }
  async function undo(id, windowId) {
    const op = await db.read('journal', id);
    if (!op) throw new Error('This action is no longer available');
    if (op.status === 'undone') throw new Error('This action has already been undone');
    if (!['complete', 'committed'].includes(op.status))
      throw new Error('Can\'t undo an incomplete action. Open Recovery.');
    if (op.before && (await db.getState()).revision !== op.revision)
      throw new Error(
        'Can\'t undo after newer edits. Restore a copy from Recovery.',
      );
    let restored;
    if (op.closed?.length) {
      const closed = new Set(op.closed);
      const snapshot = snapshotTabs(
        (op.tabs || []).filter((tab) => closed.has(tab.id)),
        op.sourceGroups || [],
      );
      restored = await openLinks({ collection: snapshot, windowId, deferred: true });
      if (restored.failed.length || restored.groupFailures.length)
        throw new Error(
          'Some tabs could not be restored. Open Recovery.',
        );
    }
    const result = op.before ? await db.undoLibrary(id) : null;
    op.status = 'undone';
    await db.write('journal', op);
    return { id: result?.operation.id || op.id, label: `Undid ${op.label}`, restored };
  }
  return { live, save, close, openLinks, switchCollection, recover, undo };
}

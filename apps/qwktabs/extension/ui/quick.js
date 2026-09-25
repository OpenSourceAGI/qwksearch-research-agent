import {colorHex} from '../lib/colors.js';
import { operationFeedback } from '../lib/messages.js';

import {
  $,
  el,
  icon,
  button,
  theme,
  rpc,
  loadSnapshot,
  currentWindow,
  domain,
  favicon,
  task,
  toast,
  surface,
  revealResult,
  collectionChoice,
} from './shared.js';
import { orderedCollections } from '../lib/collection-workflow.js';
import { score, PALETTE } from '../lib/model.js';
import { createSearchController } from './search-controller.js';
import { createActionDialogs } from './action-dialogs.js';
import { sessionList } from './session-list.js';
import { createTabTools, orderedTabs } from './tab-tools.js';
import { rasterCanvas } from './raster.js';
import { installAltKeyGuard } from './alt-key.js';

export async function startQuick() {
  const continuationToken = globalThis.__neoOverlayContext ? null : new URLSearchParams(location.search).get('continuation');
  const continuation = continuationToken ? await rpc('switcher-continuation', {token:continuationToken}) : null;
  const searchOnly =
    (globalThis.__neoOverlayContext?.mode || new URLSearchParams(location.search).get('mode')) ===
    'search';
  let data = await loadSnapshot({includeTimeline:false}),
    win = await currentWindow(),
    groupId = continuation?.groupId ?? null;
  let browseMode = continuation?.browseMode === 'all' ? 'all' : 'window',
    audioOnly = continuation?.audioOnly === true;
  let list = continuation?.list === true,
    selecting = false,
    controller,
    disposed = false,
    busy = false;
  const root = surface(),
    mount = globalThis.__neoSurface || document.body;
  const selected = new Set(),
    tiles = new Map(),
    previews = new Map(),
    previewLoads = new Map(),
    observers = new Set();
  theme(data.state.settings.theme);
  const close = () =>
    globalThis.__neoCloseOverlay ? globalThis.__neoCloseOverlay() : window.close();
  const search = el('input', { id: 'quick-search', type: 'search', 'aria-label': 'Search tabs', 'aria-keyshortcuts': '/', title: 'Press / to search' });
  search.value = continuation?.query || '';
  const results = el('main', { id: 'quick-results', class: 'quick-grid' });
  const scope = el('div', { class: 'search-scope', hidden: true });
  const scopeBar = el('div', {
    class: 'browse-scopes',
    role: 'group',
    'aria-label': 'Search scope',
  });
  const scopeButtons = new Map();
  for (const [id, label] of [
    ['window', 'This window'],
    ['all', 'All windows'],
    ['recent', 'Recently closed'],
  ]) {
    const b = button(label, () => setBrowseMode(id));
    b.dataset.mode = id;
    scopeButtons.set(id, b);
    scopeBar.append(b);
  }
  const audioButton = button(
    'Audio',
    () => {
      audioOnly = !audioOnly;
      controller.render();
    },
    { glyph: 'audio', className: 'audio-filter' },
  );

  const clearSearch = button(
    'Clear search',
    () => {
      search.value = '';
      controller.render();
      search.focus();
    },
    { className: 'clear-search' },
  );
  clearSearch.replaceChildren('Clear');
  const collectionsButton = button('Collections', () => setBrowseMode('collections'), {
    glyph: 'group',
  });
  const title = el('h1', {}, 'Open tabs'),
    summary = el('span', { class: 'muted' });
  const back = button(
    'All tabs',
    () => {
      groupId = null;
      controller.render();
      focusFirstTab();
    },
    { glyph: 'back' },
  );
  const previewButton = button(
    'Previews',
    () => {
      list = false;
      controller.render();
    },
    { glyph: 'grid' },
  );
  const listButton = button(
    'List',
    () => {
      list = true;
      controller.render();
    },
    { glyph: 'list' },
  );
  const selectButton = button('Select', () => setSelecting(!selecting), { glyph: 'select' });
  selectButton.id = 'select-mode';
  selectButton.className = 'selection-mode-button';
  const selectionCount = el('strong', { 'aria-live': 'polite' });
  const groupButton = button(
    'Group',
    task(() =>
      manage(async () => {
        const result = await rpc('group-tabs', { tabIds: [...selected] });
        groupId = null;
        await refresh();
        startRename(result.groupId);
      }),
    ),
    { glyph: 'group' },
  );
  const ungroupButton = button(
    'Ungroup',
    task(() =>
      manage(async () => {
        await rpc('ungroup-tabs', { tabIds: [...selected] });
        await refresh();
        toast('Tabs ungrouped');
      }),
    ),
    { glyph: 'ungroup' },
  );
  const closeButton = button(
    'Close tabs',
    task(() => closeTabs([...selected])),
    { glyph: 'close' },
  );
  const selectAll = button('Select all', () => {
    for (const tab of visibleTabs()) selected.add(tab.id);
    updateSelection();
  });
  const clear = button('Clear', () => {
    selected.clear();
    updateSelection();
  });
  const saveSelected = button('Save tabs', () => actions.save(), { glyph: 'tray' });
  const toolbar = el(
    'div',
    { class: 'selection-toolbar', hidden: true },
    selectionCount,
    selectAll,
    clear,
    saveSelected,
    groupButton,
    ungroupButton,
    closeButton,
  );
  closeButton.classList.add('close-selected');
  closeButton.setAttribute('aria-keyshortcuts', 'Alt+W');
  selectAll.classList.add('icon-button');
  selectAll.replaceChildren(icon('select'));
  clear.classList.add('icon-button');
  clear.replaceChildren(icon('clear'));
  let cancelRename = null;
  const dock = el('nav', { class: 'collection-dock', 'aria-label': 'Saved collections' });
  const libraryButton = button(
    'Library',
    task(async () => {
      await rpc('open-library');
      close();
    }),
    { glyph: 'library' },
  );
  const dismissButton = button('Close switcher', close, { glyph: 'close', quiet: true });
  scopeBar.append(
    collectionsButton,
    el('div', { class: 'overlay-navigation' }, audioButton, selectButton),
  );
  const view = el(
    'section',
    {
      class: 'task-view' + (searchOnly ? ' search-only' : ''),
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Tab switcher',
      tabindex: -1,
    },
    el(
      'div',
      { class: 'quick-head' },
      back,
      icon('search'),
      search,
      clearSearch,
      el('div', { class: 'view-choices' }, previewButton, listButton),
      libraryButton,
      dismissButton,
    ),
    scopeBar,
    scope,
    toolbar,
    results,
    dock,
  );
  const backdrop = el(
    'div',
    {
      class: 'switcher-backdrop',
      onclick: (e) => {
        if (e.target === backdrop && !selecting) close();
      },
    },
    view,
  );
  mount.append(backdrop);
  const loadError=el('div',{class:'load-error',role:'status',hidden:true},
    el('span',{},"Can't refresh tabs"),button('Retry',()=>refresh().catch(()=>{})));
  view.insertBefore(loadError,results);
  const actions = createActionDialogs({
    getData: () => data,
    windowId: win,
    getTabIds: () =>
      selecting
        ? [...selected]
        : allTabs()
            .filter((t) => !t.pinned && (groupId === null || t.groupId === groupId))
            .map((t) => t.id),
    onOpen: close,
    change: async (action, payload) => {
      const result = await rpc(action, payload);
      await refresh();
      const op = result?.operation || result;
      const feedback = operationFeedback(op, action);
      if (feedback)
        toast(feedback.message, {
          error: feedback.error,
          details: feedback.details,
          undo:
            action !== 'undo-action' && (op.undoable || op.before || op.closed?.length)
              ? async () => {
                  await rpc('undo-action', { id: op.id, windowId: win });
                  await refresh();
                }
              : undefined,
        });
      return result;
    },
  });
  const tools = createTabTools({
    getTabs: () => allTabs().filter((t) => groupId === null || t.groupId === groupId),
    getSettings: () => data.state.settings,
    change: async (action, payload) => {
      const result = await rpc(action, payload);
      await refresh();
      const op = result?.operation || result;
      const feedback = operationFeedback(op, action);
      if (feedback)
        toast(feedback.message, {
          error: feedback.error,
          details: feedback.details,
          undo: op.closed?.length
            ? async () => {
                await rpc('undo-action', { id: op.id, windowId: win });
                await refresh();
              }
            : undefined,
        });
      return result;
    },
    actions, compact: true, showCloseAll: false, showAutoGroup: false,
  });
  view.querySelector('.overlay-navigation').insertBefore(tools.node, selectButton);
  if (globalThis.__neoSurface) {
    for (const action of ['settings', 'import', 'export', 'ai'])
      actions[action] = async (c) => {
        await rpc('open-library', {
          hash: '#' + new URLSearchParams({ action, ...(c?.id ? { collection: c.id } : {}) }),
        });
        close();
      };
  }
  function setBrowseMode(mode) {
    browseMode = mode;
    groupId = null;
    selecting = false;
    selected.clear();
    search.value = search.value.replace(/^[/@]/, '');
    controller.resetContext();
    if (['window', 'all'].includes(mode)) focusFirstTab();
    else search.focus();
  }
  function updateScopes() {
    for (const [id, b] of scopeButtons) {
      b.setAttribute('aria-pressed', String(browseMode === id));
      const count =
        id === 'recent'
          ? (data.recentSessions || []).length
          : data.tabs.filter((t) => id === 'all' || t.windowId === win).length;
      b.dataset.count = String(count);
    }
    audioButton.hidden = !['window', 'all'].includes(browseMode);
    audioButton.setAttribute('aria-pressed', String(audioOnly));
    audioButton.dataset.count = String(
      data.tabs.filter(
        (t) => (browseMode !== 'window' || t.windowId === win) && (t.audible || t.mutedInfo?.muted),
      ).length,
    );
    collectionsButton.setAttribute('aria-pressed', String(browseMode === 'collections'));
    dock.hidden = true;
    view.querySelector('.view-choices').hidden = !['window', 'all'].includes(browseMode);
  }
  function focusFirstTab() {
    focusResult(results.querySelector('.preview-tile, .tab-choice') || view);
  }
  function focusResult(node) {
    if (!node) return;
    node.focus({ preventScroll: true });
    revealResult(results, node);
  }
  async function closeSingle(entry) {
    return closeTabs(entry.ids, entry);
  }
  async function closeTabs(ids, entry, focusIndex) {
    if (busy) return;
    const unpinned = allTabs().filter(t => ids.includes(t.id) && !t.pinned).map(t => t.id);
    if (!unpinned.length) return;
    const cards = [...results.querySelectorAll('.switcher-card')];
    const target = entry?.node || root.activeElement?.closest('.switcher-card') ||
      [...tiles.values()].find(tile => tile.ids.some(id => unpinned.includes(id)))?.node;
    const index = focusIndex ?? Math.max(0, cards.indexOf(target));
    await manage(async () => {
      const op = await rpc('close-switcher-tabs', { tabIds: unpinned, focusIndex:index, browseMode, list, groupId, audioOnly, query:search.value });
      if (op.continued) { close(); return; }
      selected.clear();
      if (groupId !== null && !allTabs().some(t => t.groupId === groupId && !unpinned.includes(t.id))) groupId = null;
      await refresh({settle:true});
      const feedback = operationFeedback(op, 'close');
      if (!disposed && feedback) toast(feedback.message, {
        error: feedback.error,
        details: feedback.details,
        undo: op.closed?.length ? task(async () => {
          await rpc('undo-action', { id: op.id, windowId: win });
          await refresh({settle:true});
          focusFirstTab();
        }) : undefined,
      });
    });
    if (disposed) return;
    const buttons = [...results.querySelectorAll('.preview-tile,.tab-choice')];
    focusResult(buttons[Math.min(index, buttons.length - 1)] || search);
  }
  function renderBrowse(query) {
    updateScopes();
    if (['window', 'all'].includes(browseMode)) return renderTabs(query);
    results.className = 'search-results tab-list';
    results.setAttribute('role', 'group');
    back.hidden = true;
    summary.textContent = '';
    if (browseMode === 'collections') {
      results.classList.add('collection-choices');
      title.textContent = 'Collections';
      const matches = orderedCollections(data.state.collections).filter((c) =>
        score(query, c.name, c.note),
      );
      results.replaceChildren(
        ...matches.map((c) => {
          const choice = collectionChoice(
            c,
            () => {
              search.value = '';
              controller.setContext(c.id);
              search.focus();
            },
            { className: 'tab-choice collection-result', title: 'Browse collection: ' + c.name },
          );
          return choice;
        }),
      );
      if (!matches.length) results.append(el('p', { class: 'empty' }, 'No matching collections.'));
      return;
    }
    const history = browseMode === 'history';
    title.textContent = history ? 'Timeline' : 'Recently closed';
    results.replaceChildren(
      button(
        history ? 'Back to recently closed' : 'Timeline',
        () => setBrowseMode(history ? 'recent' : 'history'),
        { className: 'history-link', glyph: 'history' },
      ),
      el(
        'p',
        { class: 'hint' },
        history
          ? 'Saved snapshots · restore adds pages to this window'
          : 'Closed tabs and windows across this browser',
      ),
      sessionList({ data, query, windowId: win, history, refresh }),
    );
  }
  function allTabs() {
    return orderedTabs(
      data.tabs.filter(
        (t) =>
          (browseMode !== 'window' || t.windowId === win) &&
          (!audioOnly || t.audible || t.mutedInfo?.muted),
      ),
      'position',
    );
  }
  function visibleTabs() {
    return allTabs().filter(
      (t) =>
        (groupId === null || t.groupId === groupId) &&
        score(search.value, t.title, t.resourceUrl || t.url),
    );
  }
  function selectedGroup() {
    const members = allTabs().filter((t) => selected.has(t.id));
    return members.length &&
      members[0].groupId >= 0 &&
      members.every((t) => t.groupId === members[0].groupId)
      ? members[0].groupId
      : null;
  }
  async function manage(action) {
    if (busy) return;
    busy = true;
    updateSelection();
    try {
      await action();
    } finally {
      busy = false;
      if (!disposed) {
        updateSelection();
        if (
          !root.activeElement ||
          root.activeElement.disabled ||
          !view.contains(root.activeElement)
        )
          selectButton.focus();
      }
    }
  }
  function setSelecting(value) {
    selecting = value;
    if (!value) {
      selected.clear();
      cancelRename?.();
    }
    if (value) {
      search.value = '';
      controller.setContext(null);
    }
    updateSelection();
  }
  function updateSelection() {
    for (const id of selected) if (!data.tabs.some((t) => t.id === id)) selected.delete(id);
    toolbar.hidden = !selecting;
    selectButton.replaceChildren(selecting ? 'Done' : 'Select');
    selectButton.setAttribute('aria-label', selecting ? 'Done selecting' : 'Select tabs');
    selectButton.removeAttribute('aria-pressed');
    selectButton.title = selecting ? 'Done selecting' : 'Select tabs';
    view.classList.toggle('selecting', selecting);
    selectionCount.textContent = selected.size
      ? selected.size + ' selected'
      : 'Select tabs or groups';
    const members = allTabs().filter((t) => selected.has(t.id)),
      unpinned = members.filter((t) => !t.pinned);
    groupButton.disabled =
      busy || !unpinned.length || new Set(unpinned.map((t) => t.windowId)).size > 1;
    ungroupButton.disabled = busy || !members.some((t) => t.groupId >= 0);
    closeButton.disabled = busy || !unpinned.length;
    closeButton.textContent = unpinned.length
      ? 'Close ' + unpinned.length + (unpinned.length === 1 ? ' tab' : ' tabs')
      : 'Close tabs';
    closeButton.setAttribute('aria-label', closeButton.textContent);
    saveSelected.disabled = busy || !unpinned.length;
    closeButton.title = members.some((t) => t.pinned)
      ? 'Close selected unpinned tabs; pinned tabs stay open'
      : 'Close selected tabs';
    selectAll.disabled = busy || !visibleTabs().length;
    clear.disabled = busy || !selected.size;
    for (const entry of tiles.values()) {
      const count = entry.ids.filter((id) => selected.has(id)).length;
      entry.node.classList.toggle('is-selected', selecting && count > 0);
      entry.mark.hidden = !selecting;
      entry.mark.textContent = count === entry.ids.length ? '✓' : count ? '−' : '';
      entry.rowActions.hidden = selecting;
      entry.closeOne.disabled = busy || !!entry.tab.pinned;
      if (selecting)
        entry.button.setAttribute(
          'aria-pressed',
          count && count < entry.ids.length ? 'mixed' : String(count === entry.ids.length),
        );
      else entry.button.removeAttribute('aria-pressed');
      entry.button.setAttribute('aria-label', (selecting ? 'Select ' : '') + entry.name);
      if (entry.groupSelect) {
        entry.groupSelect.hidden = !selecting;
        entry.groupSelect.disabled = busy;
        entry.groupSelect.setAttribute(
          'aria-pressed',
          count && count < entry.ids.length ? 'mixed' : String(count === entry.ids.length),
        );
        entry.groupSelect.setAttribute('aria-label', 'Select group ' + entry.name);
        entry.button.removeAttribute('aria-pressed');
        entry.button.setAttribute('aria-label', 'Open group ' + entry.name);
        entry.nameNode.title = 'Rename ' + entry.name;
        entry.nameNode.setAttribute('aria-label', 'Rename ' + entry.name);
      }
    }
  }
  function startRename(id) {
    if (id === null) return;
    cancelRename?.();
    const group = data.groups.find((g) => g.id === id);
    if (!group) return;
    let entry = [...tiles.values()].find(
      (x) => x.isGroup && x.tab.groupId === id && x.node.isConnected,
    );
    if (!entry) {
      groupId = null;
      search.value = '';
      audioOnly = false;
      controller.render();
      entry = [...tiles.values()].find(
        (x) => x.isGroup && x.tab.groupId === id && x.node.isConnected,
      );
    }
    if (!entry) return;
    const input = el('input', {
      value: group.title || 'Group',
      'aria-label': 'Group name',
      maxlength: 100,
    });
    let finished = false;
    const finish = (focus = false) => {
      finished = true;
      cancelRename = null;
      entry.nameSlot.replaceChildren(entry.nameNode);
      if (focus) entry.nameNode.focus();
    };
    cancelRename = () => finish();
    const save = task(async (focus = false) => {
      if (finished) return;
      const name = input.value.trim() || 'Group';
      if (name === (group.title || 'Group')) {
        finish(focus);
        return;
      }
      finished = true;
      input.disabled = true;
      try {
        await rpc('rename-tab-group', { groupId: id, name });
        finish(focus);
        await refresh();
      } catch (error) {
        finished = false;
        input.disabled = false;
        input.focus();
        throw error;
      }
    });
    input.onblur = () => save();
    input.onkeydown = (e) => {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        save(true);
      }
    };
    entry.nameSlot.replaceChildren(input);
    input.focus();
    input.select();
  }
  function preview(tab) {
    const url = tab.resourceUrl || tab.url;
    const frame = el(
      'div',
      { class: 'preview-image' },
      el(
        'span',
        { class: 'preview-missing' },
        favicon(tab),
        domain(url),
        el('small', {}, 'Preview available after visiting'),
      ),
    );
    // Keep successful previews, but retry misses/failures on later refreshes.
    let nextAttempt = 0;
    const load = async () => {
      if (disposed || Date.now() < nextAttempt) return;
      nextAttempt = Date.now() + 2500;
      if (!previews.has(url))
        previews.set(
          url,
          rpc('preview', { url }).catch(() => null),
        );
      const image = await previews.get(url);
      if (disposed) return;
      if (!image) {
        previews.delete(url);
        return;
      }
      try {
        const canvas = await rasterCanvas(image.data);
        if (!disposed) frame.replaceChildren(canvas);
        previewLoads.delete(frame);
        observer.disconnect();
        observers.delete(observer);
      } catch {
        previews.delete(url);
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          previewLoads.set(frame, load);
          load();
        } else previewLoads.delete(frame);
      },
      { root: results },
    );
    observer.observe(frame);
    observers.add(observer);
    return frame;
  }
  function groupPreview(members) {
    const shown = members.slice(0, 4);
    return el(
      'div',
      {
        class: 'preview-image group-preview',
        'aria-hidden': 'true',
        dataset: { count: shown.length },
      },
      shown.map((tab) => preview(tab)),
    );
  }
  function createTile(tab, isGroup, key, members) {
    const mark = el('span', { class: 'selection-mark', 'aria-hidden': 'true', hidden: true });
    const nameNode = isGroup
        ? button('', () => startRename(entry.tab.groupId), { className: 'group-name' })
        : el('span'),
      meta = el('small');
    const entry = { ids: [], name: '', isGroup, tab, nameNode, meta, mark };
    const primary = el(
      'button',
      {
        class: list ? 'search-result tab-choice' : 'preview-tile',
        dataset: { focusKey: key },
        onclick: task(async () => {
          if (isGroup) {
            groupId = entry.tab.groupId;
            controller.render();
            focusFirstTab();
          } else if (selecting) {
            const remove = entry.ids.every((id) => selected.has(id));
            entry.ids.forEach((id) => (remove ? selected.delete(id) : selected.add(id)));
            updateSelection();
          } else {
            await rpc('activate', { tabId: entry.tab.id });
            close();
          }
        }),
      },
      el(
        'div',
        { class: 'tile-topline' },
        isGroup ? icon('group') : favicon(tab),
        isGroup ? el('span') : nameNode,
        isGroup ? null : mark,
      ),
      list ? null : isGroup ? groupPreview(members) : preview(tab),
      el('div', { class: 'preview-info' }, meta),
    );
    const nameSlot = isGroup ? el('div', { class: 'group-name-slot' }, nameNode) : null;
    const groupSelect = isGroup
      ? button(
          '',
          () => {
            const remove = entry.ids.every((id) => selected.has(id));
            entry.ids.forEach((id) => (remove ? selected.delete(id) : selected.add(id)));
            updateSelection();
          },
          { className: 'group-select' },
        )
      : null;
    if (groupSelect) groupSelect.append(mark);
    const node = el(
      'div',
      { class: 'switcher-card' + (isGroup ? ' group-tile' : ''), dataset: { key } },
      primary,
      nameSlot,
      groupSelect,
    );
    const closeOne = button(
      'Close tab',
      task(() => closeSingle(entry)),
      { glyph: 'close', quiet: true, className: 'tile-close' },
    );
    closeOne.setAttribute('aria-keyshortcuts', 'Alt+W Delete');
    const muteOne = button(
      'Mute tab',
      task(async () => {
        await rpc('mute-tab', { tabId: entry.tab.id, muted: !entry.tab.mutedInfo?.muted });
        await refresh();
      }),
      { glyph: 'audio', quiet: true, className: 'tile-mute' },
    );
    const rowActions = el('div', { class: 'tile-actions' }, muteOne, closeOne);
    node.append(rowActions);
    primary.onauxclick = task(async (e) => {
      if (e.button === 1 && !isGroup) {
        e.preventDefault();
        await closeSingle(entry);
      }
    });
    Object.assign(entry, {
      node,
      button: primary,
      nameSlot,
      groupSelect,
      closeOne,
      muteOne,
      rowActions,
    });
    return entry;
  }
  function renderTabs(query) {
    results.className = list ? 'search-results tab-list' : 'quick-grid';
    results.setAttribute('role', 'group');
    results.setAttribute('aria-label', 'Open tabs');
    previewButton.classList.toggle('view-active', !list);
    listButton.classList.toggle('view-active', list);
    previewButton.setAttribute('aria-pressed', String(!list));
    listButton.setAttribute('aria-pressed', String(list));
    updateScopes();
    const tabs = allTabs();
    if (groupId !== null && !tabs.some((t) => t.groupId === groupId)) groupId = null;
    back.hidden = groupId === null;
    title.textContent =
      groupId === null
        ? browseMode === 'all'
          ? 'All windows'
          : 'This window'
        : data.groups.find((g) => g.id === groupId)?.title || 'Group';
    const count = tabs.filter((t) => groupId === null || t.groupId === groupId).length;
    summary.textContent = count + (count === 1 ? ' tab' : ' tabs');
    const seen = new Set(),
      nodes = [];
    for (const tab of tabs
      .filter(
        (t) =>
          (groupId === null || t.groupId === groupId) &&
          score(query, t.title, t.resourceUrl || t.url),
      )
      .slice(0, 120)) {
      const isGroup = !query && !audioOnly && groupId === null && tab.groupId >= 0;
      if (isGroup && seen.has(tab.groupId)) continue;
      if (isGroup) seen.add(tab.groupId);
      const members = isGroup ? tabs.filter((t) => t.groupId === tab.groupId) : [tab];
      const key =
        (list ? 'list:' : 'preview:') +
        (isGroup
          ? 'group:' +
            tab.groupId +
            ':' +
            members.map((t) => t.id + ':' + (t.resourceUrl || t.url)).join('|')
          : 'tab:' + tab.id) +
        ':' +
        (tab.resourceUrl || tab.url);
      let entry = tiles.get(key);
      if (!entry) {
        entry = createTile(tab, isGroup, key, members);
        tiles.set(key, entry);
      }
      entry.tab = tab;
      const nativeGroup = data.groups.find((g) => g.id === tab.groupId);
      entry.node.dataset.groupColor = nativeGroup?.color || '';
      entry.node.classList.toggle('native-group-card', !!nativeGroup);

      entry.ids = members.map((t) => t.id);
      entry.name = isGroup
        ? data.groups.find((g) => g.id === tab.groupId)?.title || 'Group'
        : tab.title || domain(tab.url);
      if (entry.nameNode.textContent !== entry.name) entry.nameNode.textContent = entry.name;
      const text = isGroup
        ? members.length + (members.length === 1 ? ' tab' : ' tabs')
        : (nativeGroup ? (nativeGroup.title || 'Group') + ' · ' : '') +
          (tab.pinned ? 'Pinned · ' : '') +
          domain(tab.resourceUrl || tab.url) +
          (browseMode === 'all'
            ? ' · ' + (tab.windowId === win ? 'This window' : 'Window ' + tab.windowId)
            : '');
      entry.rowActions.hidden = selecting;
      entry.closeOne.disabled = !!tab.pinned || busy;
      entry.closeOne.title = tab.pinned
        ? 'Unpin this tab before closing it'
        : isGroup ? 'Close group · ' + members.length + ' tabs (Alt+W)' : 'Close tab: ' + entry.name + ' (Alt+W)';
      entry.closeOne.setAttribute('aria-label', entry.closeOne.title);
      entry.muteOne.hidden = isGroup || !(tab.audible || tab.mutedInfo?.muted);
      entry.muteOne.title = tab.mutedInfo?.muted ? 'Unmute tab' : 'Mute tab';
      entry.muteOne.setAttribute('aria-label', entry.muteOne.title);
      if (entry.meta.textContent !== text) entry.meta.textContent = text;
      entry.button.title = entry.name;
      nodes.push(entry.node);
    }
    if (!nodes.length)
      nodes.push(
        el(
          'p',
          { class: 'empty' },
          audioOnly
            ? 'No tabs with audio.'
            : query
              ? 'No matching open tabs.'
              : browseMode === 'all'
                ? 'No open pages.'
                : 'No open pages in this window.',
        ),
      );
    results.style.setProperty(
      '--columns',
      Math.min(
        nodes.length,
        Math.max(1, Math.min(4, Math.floor((Math.min(1180, innerWidth - 64) - 48) / 260))),
      ),
    );
    // Reconcile instead of replacing unchanged tile/image DOM every 2.5 seconds.
    const wanted = new Set(nodes);
    for (const child of [...results.children]) if (!wanted.has(child)) child.remove();
    nodes.forEach((node, i) => {
      if (results.children[i] !== node) results.insertBefore(node, results.children[i] || null);
    });
    tools.update();
    updateSelection();
  }
  let dockKey;
  function renderDock() {
    const key = JSON.stringify(
      data.state.collections.map((c) => [c.id, c.name, c.color, c.links.length]),
    );
    if (key === dockKey) return;
    dockKey = key;
    dock.replaceChildren(
      el(
        'div',
        { class: 'dock-actions' },
        el('strong', {}, 'Collections'),
        button('Switch collection', () => actions.switch(), { glyph: 'arrow' }),
      ),
      el(
        'div',
        { class: 'dock-collections' },
        data.state.collections.map((c) => {
          const b = button(
            c.name,
            () => {
              setSelecting(false);
              groupId = null;
              controller.setContext(c.id);
              search.focus();
            },
            { className: 'dock-collection' },
          );
          b.style.setProperty('--color', colorHex(c.color));
          return b;
        }),
      ),
    );
  }
  const dismiss = () => {
    if (selecting) {
      setSelecting(false);
      return;
    }
    if (groupId !== null) {
      groupId = null;
      controller.render();
      focusFirstTab();
      return;
    }
    close();
  };
  controller = createSearchController({
    input: search,
    results,
    scope,
    getData: () => data,
    windowId: win,
    actions,
    onNavigate: close,
    onDismiss: dismiss,
    visualSearch: renderBrowse,
    escapeDismiss: true,
    onHistory: () => setBrowseMode('recent'),
    onModeChange: (parsed) => {
      if (parsed.context || parsed.mode === 'contexts') browseMode = 'collections';
      const live =
        parsed.mode === 'search' && !parsed.context && ['window', 'all'].includes(browseMode);
      updateScopes();
      clearSearch.hidden = !search.value;
      search.placeholder = parsed.context
        ? 'Search ' + parsed.context.name + '…'
        : parsed.mode === 'commands'
          ? 'Search actions…'
          : browseMode === 'recent'
            ? 'Search recently closed tabs…'
            : browseMode === 'history'
              ? 'Search timeline…'
              : browseMode === 'collections'
                ? 'Search collections…'
                : 'Search tabs…';
      selectButton.hidden = !live;
      tools.node.hidden = searchOnly || !live;
      if (!live && selecting) {
        selecting = false;
        selected.clear();
        updateSelection();
        cancelRename?.();
      }
      if (!live) {
        results.setAttribute('role', 'listbox');
        title.textContent =
          parsed.context?.name || (parsed.mode === 'commands' ? 'Actions' : 'Collections');
        summary.textContent = '';
      }
    },
  });
  renderDock();
  if (searchOnly) search.focus();
  else focusFirstTab();
  const onKey = (e) => {
    if (e.isComposing || $('#dialog')?.open || $('#action-popover')?.matches(':popover-open'))
      return;
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input,textarea,[contenteditable=true]')) {
      e.preventDefault();
      search.focus();
      return;
    }
    if (e.key === 'Tab') {
      const controls = [
        ...view.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]'),
      ].filter((n) => n.getClientRects().length);
      const index = controls.indexOf(root.activeElement);
      if (e.shiftKey && index <= 0) {
        e.preventDefault();
        controls.at(-1)?.focus();
      } else if (!e.shiftKey && index === controls.length - 1) {
        e.preventDefault();
        controls[0]?.focus();
      }
      return;
    }
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.preventDefault();
      dismiss();
      return;
    }
    const altClose = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey &&
      !e.getModifierState?.('AltGraph') && e.key.toLowerCase() === 'w' &&
      !e.target.closest('input,textarea,select,[contenteditable]');
    if (altClose) {
      e.preventDefault();
      if (e.repeat || busy) return;
      if (selecting) task(() => closeTabs([...selected]))();
      else {
        const card = e.target.closest('.switcher-card');
        const entry = [...tiles.values()].find(tile => tile.node === card);
        if (entry) task(() => closeSingle(entry))();
      }
      return;
    }
    if (e.target.closest('.group-name-slot input')) return;
    if (
      e.key === 'Delete' && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey &&
      !selecting &&
      e.target.matches('.preview-tile,.tab-choice') &&
      results.contains(e.target)
    ) {
      const entry = [...tiles.values()].find((x) => x.button === e.target);
      if (entry) {
        e.preventDefault();
        task(() => closeSingle(entry))();
      }
      return;
    }
    if (selecting && e.key === 'F2' && selectedGroup() !== null) {
      e.preventDefault();
      startRename(selectedGroup());
      return;
    }
    const buttons = [...results.querySelectorAll('.preview-tile, .tab-choice')];
    const live = ['window', 'all'].includes(browseMode) && !search.value.match(/^[@/]/) && !scope.children.length;
    if (live && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        (e.target === search || !e.target.closest('input,textarea,[contenteditable=true]'))) {
      e.preventDefault();
      const current = root.activeElement?.closest('.switcher-card')?.querySelector('.preview-tile,.tab-choice');
      const index = buttons.indexOf(current);
      const columns = list ? 1 : getComputedStyle(results).gridTemplateColumns.split(' ').length;
      const step = { ArrowDown: columns, ArrowUp: -columns, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      focusResult(buttons[index < 0 ? 0 : Math.max(0, Math.min(buttons.length - 1, index + step))]);
    } else if (live && e.target === search && e.key === 'Enter') {
      e.preventDefault();
      buttons[0]?.click();
    }
  };
  const containKeys = (e) => e.stopPropagation();
  const removeAltGuard = globalThis.__neoSurface ? () => {} : installAltKeyGuard(root);
  root.addEventListener('keydown', onKey);
  root.addEventListener('keydown', containKeys);
  root.addEventListener('keyup', containKeys);
  const onResize = () => controller.render();
  window.addEventListener('resize', onResize);
  let generation = 0,
    lastData = JSON.stringify(data), settlingRefresh = false, loadingRefresh = false, layoutBusyAt = 0;
  async function refresh({settle = false} = {}) {
    if ((settlingRefresh || loadingRefresh) && !settle) return;
    if (settle) settlingRefresh = true;
    loadingRefresh = true;
    const g = ++generation;
    try {
    for (const [frame, load] of previewLoads) {
      if (!frame.isConnected) previewLoads.delete(frame);
      else load();
    }
    let next;
    // Close/Undo must refresh the result list before restoring keyboard focus.
    // Background checkpoints can briefly report a busy layout after the mutation.
    for (let attempt = 0; attempt < 40; attempt++) {
      next = await loadSnapshot({includeTimeline:false,allowBusy:!settle});
      if (!settle || !next.layoutBusy || disposed) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (disposed || g !== generation) return;
    if (next.layoutBusy) {
      layoutBusyAt ||= Date.now();
      if (Date.now() - layoutBusyAt >= 8000) throw new Error('Tabs are still changing. Try again.');
      return;
    }
    layoutBusyAt = 0;
    const nextKey = JSON.stringify(next);
    if (lastData === nextKey) { loadError.hidden=true; return; }
    data = next;
    theme(data.state.settings.theme);
    controller.update();
    renderDock();
    tools.update();
    updateSelection();
    lastData = nextKey;
    loadError.hidden=true;
    } catch (error) {
      if (!disposed && g===generation) { loadError.hidden=false; loadError.title=error.message; }
      throw error;
    } finally {
      if (g===generation) loadingRefresh = false;
      if (settle) settlingRefresh = false;
    }
  }
  const onMessage = (m) => {
    if (m.event === 'changed') refresh().catch(() => {});
  };
  globalThis.chrome.runtime.onMessage.addListener(onMessage);
  // Content scripts don't receive runtime broadcasts. Reconcile periodically too.
  const timer = setInterval(() => refresh().catch(() => {}), 2500);
  if (continuation) await closeTabs(continuation.tabIds, null, continuation.focusIndex);
  return () => {
    disposed = true;
    removeAltGuard();
    clearInterval(timer);
    controller.destroy();
    root.removeEventListener('keydown', onKey);
    root.removeEventListener('keydown', containKeys);
    root.removeEventListener('keyup', containKeys);
    window.removeEventListener('resize', onResize);
    globalThis.chrome.runtime.onMessage.removeListener(onMessage);
    observers.forEach((o) => o.disconnect());
    tiles.clear();
    previews.clear();
    previewLoads.clear();
    backdrop.remove();
  };
}

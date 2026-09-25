
import { operationFeedback } from '../lib/messages.js';
import {
  $,
  $$,
  el,
  icon,
  button,
  theme,
  toast,
  task,
  rpc,
  loadSnapshot,
  currentWindow,
  favicon,
  domain,
  modal,
  field,
  download,
  retainFocus,
  noteButton,
  popover,
  menu,
  collectionChoice,
} from './shared.js';
import {installDragScroll,captureMoveAnimation} from './drag-scroll.js';
import {collectionSlot,collectionReorderPlan,rowSlot,nearestRow,createInsertionIndicator} from './insertion.js';
import {collectionDropPlan} from './collection-drop.js';
import { colorHex, colorInk } from '../lib/colors.js';
import { updatePageIdentity } from '../lib/identity.js';
import { PALETTE, duplicateCandidates, uid, newCollection, safeURL } from '../lib/model.js';
import { parseImport, jsonExport, markdownExport, htmlExport } from '../lib/portable.js';
import { orderedCollections, collectionAge } from '../lib/collection-workflow.js';
import { highlightMatches, matchesPage, matchesCollection, countCollectionMatches } from './library-search.js';
import { collectionPreview } from './collection-preview.js';
import { createActionDialogs } from './action-dialogs.js';
import { createSearchController } from './search-controller.js';
import { createTabTools, orderedTabs } from './tab-tools.js';
import { createOnboarding } from './onboarding.js';
let libraryScope = 'window';
const onboarding = createOnboarding({
  onImport: () => actions.import(),
  getTheme: () => data.state.settings.theme,
  onTheme: value => change('settings', {settings:{theme:value}}),
});
let tabTools,
  selectingTabs = false;
const savedSelections = new Map();
const foldedNativeGroups = new Map();
try {
  for (const [key, value] of JSON.parse(sessionStorage.getItem('neo-folded-tab-groups') || '[]'))
    foldedNativeGroups.set(key, !!value);
} catch {
  /* Ignore stale view preferences. */
}
function clearNativeGroupDrag() {
  document
    .querySelectorAll('.open-tab-group.dragging')
    .forEach((n) => n.classList.remove('dragging'));
}

const noteDrafts = new Map();
let actions,
  data,
  win,
  activeCollection = null,
  activeSpace = localStorage.getItem('neo-space') || 'main',
  editingName = null,
  selected = new Set(),
  anchor = null,
  tabLimit = 120,
  collectionLimit = 60,
  refreshTimer,
  searchController;
const linkLimits = new Map();
let searchReturnView = null, revealedCollection = null;
let dragActive = false;
let nativeDragIds = [];
let draggingPayload = null;
let itemDragImage;
function showItemDragImage(event, items, label) {
  itemDragImage?.remove();
  itemDragImage = el('div', {class:'item-drag-image', 'aria-hidden':'true'},
    label ? el('strong', {}, label) : null,
    ...items.slice(0,3).map(item => el('div', {class:'native-drag-row'}, favicon(item), el('span', {}, item.title || domain(item.url)))),
    items.length > 3 ? el('small', {}, '+' + (items.length - 3) + ' more') : null);
  document.body.append(itemDragImage);
  event.dataTransfer.setDragImage(itemDragImage, 18, 18);
  const ghost = itemDragImage;
  requestAnimationFrame(() => ghost.remove());
}
const insertionIndicator = createInsertionIndicator();
const nativeTargets = new WeakMap();
let refreshAfterDrag = false;
document.addEventListener('dragstart', (event) => {
  if (!event.target.closest('[draggable="true"]')) return;
  dragActive = true;
  rpc('interaction-drag',{active:true}).catch(()=>{});
  // Capture also sees saved rows that stop event propagation.
  queueMicrotask(() => { if (event.defaultPrevented) finishDrag(); });
}, true);
function finishDrag() {
  if (!dragActive) return;
  dragActive = false;
  clearSpaceDrag();
  nativeDragIds = [];
  draggingPayload = null;
  itemDragImage?.remove();
  itemDragImage = null;
  clearNativeGroupDrag();
  insertionIndicator.clear();
  document.body.classList.remove('dragging-open-tabs');
  rpc('interaction-drag',{active:false}).catch(()=>{});
  clearDropFeedback();
  if (refreshAfterDrag) {
    refreshAfterDrag = false;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refresh().catch(() => {}), 100);
  }
}
document.addEventListener('dragend', finishDrag, true);
// Native events can run microtasks between capture and target listeners.
// Keep the drag payload alive until every drop handler has read it.
document.addEventListener('drop', () => setTimeout(finishDrag, 0), true);
installDragScroll({containers:()=>[$('#sidebar'),$('#main'),document.scrollingElement],onScroll:updateInsertion});
function retainScroll() {
  const positions = [...new Set([document.scrollingElement, $('#main'), $('#sidebar')])]
    .filter(Boolean).map(node => [node, node.scrollLeft, node.scrollTop]);
  return () => positions.forEach(([node, left, top]) => { node.scrollLeft = left; node.scrollTop = top; });
}
let refreshGeneration = 0;
let started = false, starting = false, recoveryTimer, recoveryAttempts = 0, renderInvalid = false, layoutBusyAt = 0;
const loadError = el('div', {class:'load-error', role:'status', hidden:true},
  el('span'), button('Retry', () => { recoveryAttempts = 0; recover(); }));
$('#main').prepend(loadError);
function loadFailed(error) {
  loadError.hidden = false;
  loadError.lastChild.disabled = false;
  loadError.firstChild.textContent = data ? "Can't refresh library" : "Can't load library";
  loadError.title = error.message;
  if (!recoveryTimer && recoveryAttempts < 3)
    recoveryTimer = setTimeout(recover, 800 * 2 ** recoveryAttempts++);
}
function loadRecovered() {
  clearTimeout(recoveryTimer);
  recoveryTimer = null;
  recoveryAttempts = 0;
  loadError.hidden = true;
  loadError.lastChild.disabled = false;
}
function recover() {
  clearTimeout(recoveryTimer);
  recoveryTimer = null;
  loadError.lastChild.disabled = true;
  if (started) refresh().catch(() => {});
  else start();
}
let rendering = 0;
let draggingCollection = null;
let draggingSpace = null;
function clearSpaceDrag() {
  draggingSpace = null;
  insertionIndicator.clear();
  document.querySelectorAll('.space-tab.dragging').forEach(node => node.classList.remove('dragging'));
}
function markSpaceAtPoint(point) {
  const nav = $('#spaces'), bounds = nav.getBoundingClientRect();
  if (point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom) {
    insertionIndicator.clear();
    return null;
  }
  const items = [...nav.querySelectorAll('.space-tab')]
    .filter(node => node.dataset.spaceId !== draggingSpace)
    .map(node => ({ id: node.dataset.spaceId, rect: node.getBoundingClientRect() }));
  const nearest = items.reduce((best, item) => {
    const r = item.rect, dx = Math.max(r.left-point.x, 0, point.x-r.right), dy = Math.max(r.top-point.y, 0, point.y-r.bottom);
    const distance = dx*dx + dy*dy;
    return !best || distance < best.distance ? { item, distance } : best;
  }, null)?.item;
  const slot = collectionSlot(items, nearest?.id, point, { gapX: 6, gapY: 6 });
  insertionIndicator.show(slot, $('#main'), 'space');
  return slot;
}
async function reorderSpace(id, beforeId) {
  const spaces = data.state.spaces, index = spaces.findIndex(space => space.id === id);
  if (index < 0 || beforeId === id || beforeId === spaces[index + 1]?.id) return;
  await change('edit', { kind: 'move-space', spaceId: id, beforeId, label: 'Move space' });
}
function clearCollectionDrag() {
  draggingCollection = null;
  insertionIndicator.clear();
  document.querySelectorAll('.collection.dragging').forEach(n=>n.classList.remove('dragging'));
}
function markCollectionAtPoint(point) {
  const board=$('#board'),bounds=board.getBoundingClientRect();
  if(point.x<bounds.left||point.x>bounds.right||point.y<bounds.top||point.y>bounds.bottom){insertionIndicator.clear();return null;}
  const items=[...board.querySelectorAll(':scope>.collection')].map(n=>({id:n.dataset.collectionId,rect:n.getBoundingClientRect()}));
  const style=getComputedStyle(board);
  const singleColumn=style.gridTemplateColumns.split(' ').length===1;
  const order=orderedCollections(data.state.collections.filter(c=>c.spaceId===activeSpace)).map(c=>c.id);
  const slot=collectionReorderPlan(items,point,{sourceId:draggingCollection,order,list:singleColumn,gapX:parseFloat(style.columnGap)||28,gapY:parseFloat(style.rowGap)||30});
  insertionIndicator.show(slot,$('#main'),'collection');
  return slot;
}
function updateInsertion(point) {
  if(draggingSpace)return markSpaceAtPoint(point);
  if(draggingCollection)return markCollectionAtPoint(point);
  if(nativeDragIds.length){
    const node=document.elementFromPoint(point.x,point.y)?.closest('.tab-row,.open-tab-group,.native-ungroup-drop,#tabs');
    if(node&&nativeTargets.has(node))return nativeDropPlan(node,point);
  }
  markSavedDrop(point);
}
const act = (fn) => task(fn);
async function refresh() {
  let generation;
  try {
  clearTimeout(refreshTimer);
  refreshTimer = null;
  if (dragActive) { refreshAfterDrag = true; return; }
  generation = ++refreshGeneration;
  let next;
  while (true) {
    next = await loadSnapshot({includeTimeline:recentMode==='sessions',allowBusy:true});
    if (generation !== refreshGeneration) return;
    if (!next.layoutBusy) break;
    layoutBusyAt ||= Date.now();
    if (Date.now() - layoutBusyAt >= 8000) throw new Error('Tabs are still changing. Try again.');
    if (data) { refreshTimer=setTimeout(()=>refresh().catch(()=>{}),80); return; }
    await new Promise(resolve=>setTimeout(resolve,80));
  }
  layoutBusyAt = 0;
  if (dragActive) { refreshAfterDrag = true; return; }
  const restoreScroll = retainScroll();
  const boardChanged = renderInvalid || !data || JSON.stringify([data.state.collections,data.state.spaces,data.state.settings,data.sessionState?.active]) !==
    JSON.stringify([next.state.collections,next.state.spaces,next.state.settings,next.sessionState?.active]);
  const tabsChanged=renderInvalid||!data||JSON.stringify([data.tabs,data.groups,data.state.settings])!==JSON.stringify([next.tabs,next.groups,next.state.settings]);
  const recentChanged=renderInvalid||!data||JSON.stringify([data.recent,data.recentSessions,data.timeline])!==JSON.stringify([next.recent,next.recentSessions,next.timeline]);
  data = next;
  theme(data.state.settings.theme);
  onboarding.syncTheme();
  if(tabsChanged) renderTabs();
  if (boardChanged) renderBoard();
  if(recentChanged) renderRecent();
  if (boardChanged) renderCurrentCollection();
  const closeAll=$('#current-collection .close-all-tabs');
  if(closeAll)closeAll.disabled=!data.tabs.some(t=>t.windowId===win&&!t.pinned);
  searchController?.update();
  restoreScroll();
  renderInvalid = false;
  if (started) loadRecovered();
  } catch (error) {
    if (generation !== refreshGeneration) return;
    renderInvalid = true;
    if (started) loadFailed(error);
    throw error;
  }
}
async function change(action, payload) {
  if (action === 'save' || action === 'switch') payload.spaceId ||= activeSpace;
  const moving=action==='move-open-tabs'||action==='edit'&&['move-collection','move-link','move-links','move-group'].includes(payload.kind);
  const animateBoard=moving?captureMoveAnimation($('#board'),'.collection','collectionId'):()=>{};
  const animateTabs=moving?captureMoveAnimation($('#tabs'),'.tab-row','tabId'):()=>{};
  const animateSpaces=action==='edit'&&payload.kind==='move-space'?captureMoveAnimation($('#spaces'),'.space-tab','spaceId'):()=>{};
  const result = await rpc(action, payload);
  await refresh();
  animateBoard();animateTabs();animateSpaces();
  const op = result?.operation || result;
    const feedback = operationFeedback(op, action);
    if (feedback)
      toast(
        feedback.message,
        {
          error: feedback.error,
          details: feedback.details,
        undo:
          action !== 'undo-action' && (op.undoable || op.before || op.closed?.length)
            ? () => change('undo-action', { id: op.id, windowId: win })
            : undefined,
      },
    );
  return result;
}
function findCollection(id = activeCollection) {
  return data.state.collections.find((c) => c.id === id);
}
function eligibleTabs() {
  return data.tabs.filter(
    (t) =>
      (libraryScope ? libraryScope === 'all' : !data.state.settings.currentWindowOnly) ||
      t.windowId === win,
  );
}
function selectedIds() {
  return selectingTabs || selected.size
    ? [...selected]
    : eligibleTabs()
        .filter((t) => !t.pinned)
        .map((t) => t.id);
}
function visibleTabs() {
  const query = $('#tab-search').value;
  const tabs = eligibleTabs().filter((t) => matchesPage(t, query));
  return orderedTabs(tabs, 'position');
}
function chooseTab(event, tab) {
  const visible = [...$('#tabs').querySelectorAll('.tab-row')]
    .map((row) => data.tabs.find((t) => t.id === Number(row.dataset.tabId)))
    .filter(Boolean);
  if (event.shiftKey && anchor !== null) {
    const a = visible.findIndex((t) => t.id === anchor),
      b = visible.findIndex((t) => t.id === tab.id);
    if (a >= 0 && b >= 0) {
      if (!event.ctrlKey && !event.metaKey) selected.clear();
      for (const t of visible.slice(Math.min(a, b), Math.max(a, b) + 1)) selected.add(t.id);
    }
  } else if (selectingTabs || event.ctrlKey || event.metaKey) {
    selected.has(tab.id) ? selected.delete(tab.id) : selected.add(tab.id);
    anchor = tab.id;
  } else {
    selected.clear();
    anchor = tab.id;
    rpc('activate', { tabId: tab.id }).catch((e) => toast(e.message, { error: true }));
  }
  renderTabs();
}
function renderTabs() {
  if (dragActive) { refreshAfterDrag = true; return; }
  const restoreScroll = retainScroll();
  rendering++;
  try {
    renderTabsContent();
    highlightMatches($('#tabs'), $('#tab-search').value);
  } finally {
    rendering--;
    restoreScroll();
  }
}
function nativeDropPlan(node,point,show=true) {
  if (node.id === 'tabs') {
    const blocks = [...node.children].filter(n => n.matches('.tab-row,.open-tab-group'));
    const nearest = nearestRow(blocks, point.y);
    if (!nearest) { if (show) insertionIndicator.clear(); return null; }
    if (nearest.classList.contains('open-tab-group')) {
      const rect = nearest.getBoundingClientRect();
      if (point.y < rect.top || point.y > rect.bottom) {
        // Outside a group is an ungrouped boundary. The same gap has the same
        // geometry from either side, regardless of which block is nearer.
        const slot = rowSlot(blocks, nearest, point.y);
        const { windowId, groupId } = nativeTargets.get(nearest);
        const members = data.tabs.filter(t => t.windowId === windowId && t.groupId === groupId)
          .sort((a,b) => a.index-b.index);
        const anchor = slot.after ? members.at(-1) : members[0];
        if (!anchor) { if (show) insertionIndicator.clear(); return null; }
        if (show) insertionIndicator.show(slot, $('#sidebar'), 'tab');
        return { windowId, groupId:-1, [slot.after ? 'afterTabId' : 'beforeTabId']:anchor.id };
      }
    }
    return nativeDropPlan(nearest, point, show);
  }
  // Group padding is still part of its row list, not an append-only target.
  if (node.classList.contains('open-tab-group')) {
    const rows = [...node.querySelectorAll('.tab-row')].filter(row => row.getClientRects().length);
    const nearest = nearestRow(rows, point.y);
    if (nearest) return nativeDropPlan(nearest, point, show);
  }
  const target={...nativeTargets.get(node)};
  if(node.classList.contains('tab-row')){
    // Geometry follows every visible sibling, including group cards and the
    // source row (which stays in the layout during a native drag). Skipping
    // either places a midpoint through that block instead of in the real gap.
    const nodes=[...node.parentElement.children].filter(n=>n.matches('.tab-row,.open-tab-group'));
    const slot=rowSlot(nodes,node,point.y);
    target.beforeTabId=Number(node.dataset.tabId);
    if(slot.after){target.afterTabId=target.beforeTabId;delete target.beforeTabId;}
    if(show)insertionIndicator.show(slot,$('#sidebar'),'tab');
  }else{
    const r=node.getBoundingClientRect();
    if(show)insertionIndicator.show({left:r.left+6,top:r.bottom-1,width:r.width-12,height:2},$('#sidebar'),'tab');
  }
  return target;
}
function nativeDropTarget(node, target) {
  nativeTargets.set(node,target);
  node.ondragover=e=>{if(!nativeDragIds.length)return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';};
  node.ondrop=act(async e=>{
    e.preventDefault();e.stopPropagation();
    let payload;try{payload=JSON.parse(e.dataTransfer.getData('application/x-neo'));}catch{return;}
    if(payload.type!=='tabs')return;
    const ids=payload.ids.filter(id=>data.tabs.some(t=>t.id===id&&!t.pinned));
    if(!ids.length)return;
    const plan=nativeDropPlan(node,{x:e.clientX,y:e.clientY},false);
    if (!plan) return;
    const windowId=plan.windowId||data.tabs.find(t=>t.id===ids[0]).windowId;
    finishDrag();
    await change('move-open-tabs',{tabIds:ids,windowId,groupId:-1,...plan});
  });
}
function renderTabsContent() {
  const currentScope = libraryScope || (data.state.settings.currentWindowOnly ? 'window' : 'all');
  const scopes = $('#sidebar-scopes');
  const restoreScopeFocus = retainFocus(scopes);
  scopes.replaceChildren(
    ...[
      ['window', 'This window'],
      ['all', 'All windows'],
    ].map(([id, label]) => {
      const b = button(label, () => {
        libraryScope = id;
        selected.clear();
        selectingTabs = false;
        renderTabs();
      });
      b.dataset.focusKey = 'sidebar-scope:' + id;
      b.setAttribute('aria-pressed', String(id === currentScope));
      return b;
    }),
  );
  restoreScopeFocus();
  $('#tab-search').placeholder = 'Search tabs, history & collections…';
  const restoreFocus = retainFocus($('#tabs'));
  const all = visibleTabs(),
    tabs = all.slice(0, tabLimit);
  selected = new Set([...selected].filter((id) => data.tabs.some((t) => t.id === id)));
  $('#tab-count').textContent = libraryQuery()
    ? `${all.length} of ${eligibleTabs().length}`
    : eligibleTabs().length;
  tabTools?.update();
  if(tabTools)tabTools.save.hidden=selectingTabs||selected.size>0;
  $('#tabs').classList.toggle('selecting', selectingTabs);
  const selectMode = $('#library-select-mode');
  if (selectMode) {
    selectMode.removeAttribute('aria-pressed');
    selectMode.replaceChildren(icon(selectingTabs ? 'check' : 'select'));
    selectMode.title = selectingTabs ? 'Done selecting' : 'Select tabs';
    selectMode.setAttribute('aria-label', selectMode.title);
  }
  const ungroup=el('div',{class:'native-ungroup-drop'},'Drop here to ungroup');
  nativeDropTarget(ungroup,{});
  const nodes = [ungroup];
  const groupContainers = new Map();
  for (const t of tabs) {
    let groupContainer;
    if (t.groupId >= 0) {
      const key = t.windowId + ':' + t.groupId;
      groupContainer = groupContainers.get(key);
      if (!groupContainer) {
        const g = data.groups.find((g) => g.id === t.groupId);
        const name = g?.title || 'Group';
        const members = eligibleTabs().filter(
          (tab) => tab.windowId === t.windowId && tab.groupId === t.groupId,
        );
        const folded = foldedNativeGroups.has(key) ? foldedNativeGroups.get(key) : !!g?.collapsed;
        const expanded = !!libraryQuery() || !folded;
        const color =
          {
            blue: 'blue',
            red: 'rose',
            green: 'mint',
            yellow: 'yellow',
            pink: 'rose',
            purple: 'lavender',
            cyan: 'teal',
            orange: 'peach',
            grey: 'grey',
          }[g?.color] || 'grey';
        const body = el('div', {
          class: 'open-group-tabs',
          id: 'open-group-' + t.groupId,
          hidden: !expanded,
        });
        const fold = button(
          (expanded ? 'Fold ' : 'Unfold ') + name,
          () => {
            foldedNativeGroups.set(key, expanded);
            sessionStorage.setItem(
              'neo-folded-tab-groups',
              JSON.stringify([...foldedNativeGroups]),
            );
            renderTabs();
          },
          { glyph: expanded ? 'down' : 'chevron', quiet: true, className: 'open-group-fold' },
        );
        fold.disabled = !!libraryQuery();
        if (fold.disabled) fold.title = 'Groups expand to show search matches';
        fold.setAttribute('aria-expanded', String(expanded));
        fold.setAttribute('aria-controls', body.id);
        fold.dataset.focusKey = 'fold:' + key;
        const groupCheck = selectingTabs
          ? el('input', {
              type: 'checkbox',
              'aria-label': 'Select group ' + name,
              dataset: { focusKey: 'select-group:' + key },
              checked: members.every((tab) => selected.has(tab.id)),
              onchange: (e) => {
                members.forEach((tab) =>
                  e.target.checked ? selected.add(tab.id) : selected.delete(tab.id),
                );
                renderTabs();
              },
            })
          : null;
        if (groupCheck)
          groupCheck.indeterminate =
            members.some((tab) => selected.has(tab.id)) &&
            !members.every((tab) => selected.has(tab.id));
        const header = el(
          'div',
          {
            class: 'group-label open-group-header',
            draggable: editingName !== 'native:' + t.groupId,
            dataset: { groupId: t.groupId },
            title: 'Drag ' + name + ' (' + members.length + ' tabs) to a collection',
          },
          fold,
          editableName(name, 'native:' + t.groupId, (name) =>
            change('rename-tab-group', { groupId: t.groupId, name }),
          ),
          el('small', { class: 'open-group-count' }, members.length),
          groupCheck,
        );
        const container = el(
          'section',
          {
            class: 'open-tab-group',
            role: 'group',
            'aria-label': name + ' (' + members.length + ' tabs)',
            dataset: { groupId: t.groupId },
            style: '--native-color:var(--' + color + ')',
          },
          header,
          body,
        );
        nativeDropTarget(container,{windowId:t.windowId,groupId:t.groupId});
        header.ondragstart = (e) => {
          if (!header.draggable || e.target.tagName === 'INPUT' || e.target.closest('.open-group-fold')) {
            e.preventDefault();
            return;
          }
          clearNativeGroupDrag();
          nativeDragIds = members.map(tab=>tab.id);
          draggingPayload = { type: 'tabs', ids: nativeDragIds, wholeGroup: true };
          e.dataTransfer.setData(
            'application/x-neo',
            JSON.stringify(draggingPayload),
          );
          e.dataTransfer.effectAllowed = 'copyMove';
          document.body.classList.add('dragging-open-tabs');
          showItemDragImage(e, members, name + ' · ' + members.length + ' tabs');
          container.classList.add('dragging');
        };
        header.ondragend = clearNativeGroupDrag;
        groupContainer = { body, container, expanded };
        groupContainers.set(key, groupContainer);
        nodes.push(container);
      }
    }
    const check = el('input', {
      type: 'checkbox',
      class: 'tab-select',
      checked: selected.has(t.id),
      'aria-label': `Select ${t.title}`,
      onchange: () => {
        check.checked ? selected.add(t.id) : selected.delete(t.id);
        anchor = t.id;
        renderTabs();
      },
    });
    const row = el(
      'div',
      {
        class: 'tab-row' + (selected.has(t.id) ? ' selected' : ''),
        draggable: true,
        dataset: { tabId: t.id },
        ondragstart: (e) => {
          nativeDragIds = selected.has(t.id)?[...selected]:[t.id];
          draggingPayload = { type: 'tabs', ids: nativeDragIds, wholeGroup: false };
          e.dataTransfer.setData(
            'application/x-neo',
            JSON.stringify(draggingPayload),
          );
          e.dataTransfer.effectAllowed = 'copyMove';
          const bounds=$('#sidebar').getBoundingClientRect(),drop=$('.native-ungroup-drop');
          Object.assign(drop.style,{left:(bounds.left+12)+'px',width:(bounds.width-24)+'px'});
          document.body.classList.add('dragging-open-tabs');
          showItemDragImage(e, data.tabs.filter(tab=>nativeDragIds.includes(tab.id)), nativeDragIds.length > 1 ? nativeDragIds.length + ' tabs' : null);
        },
      },
      check,
      favicon(t),
      el(
        'button',
        { class: 'tab-open', title: t.title, draggable: !t.pinned, onclick: (e) => chooseTab(e, t) },
        el('span', { class: 'row-title' }, t.title || domain(t.url)),
      ),
      t.pinned
        ? icon('pin')
        : button(
            `Close ${t.title}`,
            act(() => change('close', { tabIds: [t.id] })),
            { glyph: 'close', quiet: true, className: 'row-close' },
          ),
    );
    if(!t.pinned)nativeDropTarget(row,{windowId:t.windowId,groupId:t.groupId,beforeTabId:t.id});
    if(t.groupId>=0)row.oncontextmenu=e=>{e.preventDefault();menu('Tab actions', [['Move out of group',()=>change('move-open-tabs',{tabIds:[t.id],windowId:t.windowId,groupId:-1}),'ungroup']],{anchor:row});};
    if (t.parked) row.title = 'Parked · loads when opened';
    if (groupContainer) {
      if (groupContainer.expanded) groupContainer.body.append(row);
    } else nodes.push(row);
  }
  if (!tabs.length)
    nodes.push(
      el(
        'p',
        { class: 'empty' },
        libraryQuery() ? 'No matching open tabs.' : 'No open pages in this window.',
      ),
    );
  if (all.length > tabLimit)
    nodes.push(
      button(`Show ${Math.min(120, all.length - tabLimit)} more`, () => {
        tabLimit += 120;
        renderTabs();
      }),
    );
  $('#tabs').replaceChildren(...nodes);
  nativeDropTarget($('#tabs'), {});
  for (const row of $('#tabs').querySelectorAll('[data-tab-id]'))
    for (const node of row.querySelectorAll('button,input'))
      node.dataset.focusKey =
        row.dataset.tabId + ':' + (node.getAttribute('aria-label') || node.className);
  restoreFocus();
  const selection = $('#selection');
  selection.hidden = !selectingTabs && !selected.size;
  const members = eligibleTabs().filter((t) => selected.has(t.id));
  const control = (label, fn, disabled, glyph) => {
    const b = button(label, act(fn), {
      glyph: glyph || (label === 'Clear' ? 'clear' : label === 'Move to…' ? 'arrow' : 'select'),
      quiet: label !== 'Close tabs',
      className: label === 'Close tabs' ? 'close-selected' : '',
    });
    if (label === 'Close tabs') b.replaceChildren('Close tabs');
    b.disabled = disabled;
    return b;
  };
  selection.replaceChildren(
    el('strong', {}, selected.size + ' selected'),
    button(
      'Select all',
      () => {
        visibleTabs().forEach((t) => selected.add(t.id));
        renderTabs();
      },
      { glyph: 'select', quiet: true },
    ),
    control(
      'Clear',
      () => {
        selected.clear();
        renderTabs();
      },
      !selected.size,
    ),
    control('Save tabs', () => actions.save(), !members.some((t) => !t.pinned), 'tray'),
    control(
      'Group',
      async () => {
        const result = await change('group-tabs', { tabIds: [...selected] });
        beginName('native:' + result.groupId);
      },
      !members.some((t) => !t.pinned) ||
        new Set(members.filter((t) => !t.pinned).map((t) => t.windowId)).size > 1,
      'group',
    ),
    control(
      'Ungroup',
      () => change('ungroup-tabs', { tabIds: [...selected] }),
      !members.some((t) => t.groupId >= 0),
      'ungroup',
    ),
    control(
      'Close tabs',
      async () => {
        await change('close', { tabIds: [...selected] });
        selected.clear();
        renderTabs();
      },
      !members.some((t) => !t.pinned),
      'close',
    ),
  );
  const controls = [...selection.children];
  selection.replaceChildren(
    el('div', { class: 'selection-summary' }, controls.slice(0, 3)),
    el('div', { class: 'selection-actions' }, controls.slice(3)),
  );
}
let recentMode = 'pages';
let historyPages = [],
  historyAccess = false,
  historyError = '',
  historyBusy = false;
let historyGeneration = 0,
  historyTimer,
  recentLimit = 6,
  visitLimit = 8;
const libraryQuery = () => $('#tab-search').value.trim();
async function loadHistory() {
  const generation = ++historyGeneration;
  const query = libraryQuery();
  historyBusy = true;
  historyError = '';
  try {
    const allowed = await chrome.permissions.contains({ permissions: ['history'] });
    const pages = allowed ? await rpc('history', { query }) : [];
    if (generation !== historyGeneration) return;
    historyAccess = allowed;
    historyPages = pages
      .filter((p) => safeURL(p.url))
      .sort((a, b) => b.lastVisitTime - a.lastVisitTime);
  } catch (error) {
    if (generation !== historyGeneration) return;
    historyError = error.message;
  } finally {
    if (generation === historyGeneration) {
      historyBusy = false;
      renderRecent();
    }
  }
}
function renderRecent() {
  if (dragActive) { refreshAfterDrag = true; return; }
  const root = $('#recent');
  const restoreFocus = retainFocus(root);
  root.replaceChildren(
    el(
      'div',
      { class: 'recent-heading' },
      el('h2', {}, recentMode === 'pages' ? 'Recent & history' : 'Timeline'),
      button(
        recentMode === 'pages' ? 'Timeline' : 'Recent & history',
        () => {
          recentMode = recentMode === 'pages' ? 'sessions' : 'pages';
          refresh().catch(error=>toast(error.message,{error:true}));
        },
        { glyph: recentMode === 'pages' ? 'history' : 'back', className: 'recent-mode' },
      ),
    ),
  );
  root.querySelector('.recent-mode').dataset.focusKey = 'recent-mode';
  if (recentMode === 'sessions') {
    renderSessionTimeline(root);
    root.querySelectorAll('button,select').forEach((node, index) => {
      node.dataset.focusKey ||= 'session-control:' + index;
    });
    restoreFocus();
    return;
  }
  const query = libraryQuery();
  const seen = new Set();
  const recent = (data.recentSessions || [])
    .flatMap((session) =>
      session.tabs.map((tab) => ({ ...tab, sessionId: session.id, at: session.at })),
    )
    .sort((a, b) => b.at - a.at)
    .filter((tab) => {
      if (!matchesPage(tab, query) || seen.has(tab.url)) return false;
      seen.add(tab.url);
      return true;
    });
  const pageButton = (page, closed) => {
    const live = data.tabs.find((t) => (t.resourceUrl || t.url) === page.url);
    const label = live ? 'Switch to tab' : closed ? 'Reopen tab' : 'Open tab';
    const b = button(
      page.title || domain(page.url),
      act(async () => {
        if (live) await rpc('activate', { tabId: live.id });
        else if (closed)
          await rpc('restore-recent-tab', {
            sessionId: page.sessionId,
            url: page.url,
            windowId: win,
          });
        else await rpc('open-url', { url: page.url, windowId: win });
        await refresh();
      }),
      {
        className: 'recent-page',
        title: label + ': ' + (page.title || page.url) + '\n' + page.url,
      },
    );
    b.replaceChildren(
      favicon(page),
      el(
        'span',
        { class: 'recent-page-copy' },
        el('span', { class: 'row-title' }, page.title || page.url),
        el('small', {}, domain(page.url)),
      ),
    );
    b.dataset.focusKey = 'recent-page:' + page.url;
    b.setAttribute('aria-label', label + ': ' + (page.title || page.url));
    return b;
  };
  root.append(el('h3', { class: 'recent-section-label' }, 'Recently closed'));
  const closedList = el(
    'div',
    { class: 'recent-pages' },
    recent.slice(0, recentLimit).map((p) => pageButton(p, true)),
  );
  root.append(closedList);
  if (!recent.length)
    root.append(
      el(
        'p',
        { class: 'hint' },
        query ? 'No recently closed matches.' : 'No recently closed tabs.',
      ),
    );
  if (recent.length > recentLimit)
    root.append(
      button(
        'Show more recently closed',
        () => {
          recentLimit += 12;
          renderRecent();
        },
        { className: 'recent-more' },
      ),
    );
  root.append(el('h3', { class: 'recent-section-label history-divider' }, 'History'));
  if (!historyAccess) {
    root.append(
      el('p', { class: 'hint' }, 'Find pages you visited in the last 30 days.'),
      button(
        'Enable history search',
        act(async () => {
          const granted = await chrome.permissions.request({ permissions: ['history'] });
          if (granted) await loadHistory();
        }),
        { className: 'enable-history', glyph: 'history' },
      ),
    );
  } else if (historyBusy)
    root.append(el('p', { class: 'hint', role: 'status' }, 'Searching history…'));
  else if (historyError)
    root.append(
      el('p', { class: 'hint', role: 'status' }, historyError),
      button('Retry history', loadHistory),
    );
  else {
    const pages = historyPages.filter((p) => matchesPage(p, query) && !seen.has(p.url));
    root.append(
      el(
        'div',
        { class: 'history-pages' },
        pages.slice(0, visitLimit).map((p) => pageButton(p, false)),
      ),
    );
    if (!pages.length)
      root.append(
        el(
          'p',
          { class: 'hint' },
          query ? 'No other history matches.' : 'No other recent history.',
        ),
      );
    if (pages.length > visitLimit)
      root.append(
        button(
          'Show more history',
          () => {
            visitLimit += 12;
            renderRecent();
          },
          { className: 'recent-more' },
        ),
      );
  }
  highlightMatches(root, query);
  restoreFocus();
}
let historyId = null;
function renderSessionTimeline(root) {
  const snapshots = data.timeline || [];
  const events=snapshots.filter(r=>r.event);
  const seen = new Map();
  const rows = [...snapshots].sort((a,b)=>b.at-a.at).filter(r => {
    if (!r.snapshot?.links.length&&!r.event) return false;
    if(!r.event&&events.some(e=>e.windowId===r.windowId&&Math.abs(e.at-r.at)<2000))return false;
    const key = r.collectionId || r.windowId;
    const previous = seen.get(key); seen.set(key,r);
    return r.event || !previous || previous.at-r.at > 60000 || (r.reason === 'Before switch' || r.reason === 'Closed collection');
  })
    .filter(
      (r) =>
        !libraryQuery() ||
        matchesPage({ title: r.name }, libraryQuery()) ||
        (r.native ? r.tabs : r.snapshot.links).some((p) => matchesPage(p, libraryQuery())),
    )
    .sort((a, b) => b.at - a.at);
  let index = rows.findIndex((r) => r.id === historyId);
  if (index < 0) index = 0;
  const row = rows[index];
  if (!row) {
    root.append(
      el('p', { class: 'hint' }, 'Snapshots appear here as you browse and switch collections.'),
    );
    return;
  }
  const choices=el('details',{class:'timeline-event-list'},el('summary',{},'Browse events'));
  let day;
  for(const entry of rows) {
    const date=new Date(entry.at).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
    if(date!==day){day=date;choices.append(el('strong',{},day));}
    choices.append(button(new Date(entry.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · '+entry.name+' · '+entry.snapshot.links.length+' tabs',()=>{historyId=entry.id;renderRecent();},{className:entry.id===row.id?'selected':''}));
  }
  root.append(choices);
  const navigate = (offset) => {
    historyId = rows[index + offset].id;
    renderRecent();
  };
  root.append(
    el(
      'div',
      { class: 'history-navigation' },
      button('Older snapshot', () => navigate(1), {
        glyph: 'back',
        quiet: true,
        disabled: index >= rows.length - 1,
      }),
      el(
        'time',
        { dateTime: new Date(row.at).toISOString() },
        new Date(row.at).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      ),
      button('Newer snapshot', () => navigate(-1), {
        glyph: 'chevron',
        quiet: true,
        disabled: index === 0,
      }),
    ),
  );
  const links = row.native ? row.tabs : row.snapshot.links;
  if (row.name && row.name !== 'Browsing session')
    root.append(el('strong', { class: 'history-name' }, row.name));
  if(row.event)root.append(el('small',{class:'hint'},`${row.snapshot.links.length} saved · ${row.closedCount||0} tabs closed by this action`));
  const restore = async (link) => {
    const result = row.native
      ? link
        ? await rpc('restore-recent-tab', { sessionId: row.id, url: link.url, windowId: win })
        : await rpc('restore-session', { sessionId: row.id })
      : await rpc('timeline-restore', {
          id: row.id,
          linkIds: link ? [link.id] : undefined,
          windowId: win,
        });
    if (result?.failed?.length || result?.groupFailures?.length)
      throw Error('Some tabs could not be restored. The snapshot is still available.');
    if(link&&result?.created?.[0])await rpc('activate',{tabId:result.created[0]});
    await refresh();
  };
  const list = el('div', { class: 'history-tabs' });
  let lastGroup;
  for (const link of links) {
    if (link.groupId && link.groupId !== lastGroup) {
      const group = row.snapshot?.groups.find((g) => g.id === link.groupId);
      if (group) list.append(el('small', { class: 'history-group' }, group.name));
    }
    lastGroup = link.groupId;
    const live = data.tabs.find((t) => (t.resourceUrl || t.url) === link.url);
    const verb = live ? 'Switch' : 'Reopen';
    const page = button(
      verb + ': ' + (link.title || link.url),
      act(async () => {
        if (live) await rpc('activate', { tabId: live.id });
        else await restore(link);
      }),
      { className: 'recent-page timeline-page', title: (link.title || link.url) + '\n' + link.url },
    );
    page.dataset.focusKey = 'timeline-page:' + (link.id || link.url);
    page.replaceChildren(
      favicon(link),
      el(
        'span',
        { class: 'recent-page-copy' },
        el('span', { class: 'row-title' }, link.title || link.url),
        el('small', {}, domain(link.url)),
      ),
    );
    list.append(page);
  }
  root.append(
    list,
    button(
      row.native && row.name === 'Closed window'
        ? 'Restore window'
        : 'Restore ' + links.length + (links.length === 1 ? ' tab' : ' tabs'),
      act(() => restore()),
      { className: 'history-restore', glyph: 'history' },
    ),
    el('p', { class: 'hint history-footnote' }, 'Saved on this device · 30 days'),
  );
  highlightMatches(root, libraryQuery());
}

function beginName(key) {
  $('#dialog')?.close();
  // A newly created group may sit beyond the card preview. Reveal it before
  // starting inline editing, without expanding ordinary visible renames.
  if (![...document.querySelectorAll('[data-focus-key]')].some(node => node.dataset.focusKey === key)) {
    const owner = data.state.collections.find(c => c.groups.some(g => g.id + ':name' === key));
    if (owner) {
      const detail = !libraryQuery() && activeCollection === owner.id;
      linkLimits.set(`${owner.id}:${detail ? 'detail' : 'card'}:${libraryQuery()}`, Math.max(detail ? 80 : 8, owner.links.length + owner.groups.length));
    }
  }
  editingName = key;
  renderTabs();
  renderBoard();
  const input = [...document.querySelectorAll('.inline-name')].find(
    (x) => x.dataset.focusKey === key,
  );
  input?.focus();
  input?.select();
  input?.scrollIntoView({ block: 'nearest' });
}
const nameDrafts=new Map(),nameSuggestions=new Map();
function editableName(value, key, save, className = '') {
  if (editingName !== key) {
    const node = button(value, () => beginName(key), { className: 'editable-name ' + className });
    node.title = 'Rename ' + value;
    node.dataset.focusKey = key;
    return node;
  }
  const input = el('input', {
    class: 'inline-name ' + className,
    value:nameDrafts.get(key)??value,
    maxLength: 500,
    'aria-label': 'Name',
    dataset: { focusKey: key },
  });
  input.oninput=()=>nameDrafts.set(key,input.value);
  input.onblur = act(async () => {
    if (editingName !== key || !input.isConnected || rendering) return;
    editingName = null;
    nameDrafts.delete(key);nameSuggestions.delete(key);
    await save(input.value.trim() || value);
  });
  input.onkeydown = (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      editingName = null;
      nameDrafts.delete(key);nameSuggestions.delete(key);
      renderTabs();
      renderBoard();
    }
  };
  return input;
}
async function createCollection() {
  const id = uid();
  activeCollection = null;
  const beforeId = data.state.collections.filter((c) => c.spaceId === activeSpace)[collectionLimit]
    ?.id;
  collectionLimit++;
  await change('edit', {
    kind: 'create',
    id,
    beforeId,
    name: 'New collection',
    spaceId: activeSpace,
  });
  beginName(id + ':name');
}
async function createGroup(c) {
  await change('edit', { kind: 'create-group', collectionId: c.id, name: 'Group' });
  beginName(findCollection(c.id).groups.at(-1).id + ':name');
}
function confirmRemoveWorkspace(space) {
  const collections = data.state.collections.filter((c) => c.spaceId === space.id);
  const tabs = collections.reduce((n, c) => n + c.links.length, 0);
  const revision = data.state.revision;
  const status = el('p', { role: 'alert', class: 'hint' });
  const cancel = button('Cancel', () => close());
  const remove = button(
    'Remove workspace',
    async () => {
      remove.disabled = true;
      try {
        await change('edit', {
          kind: 'delete-space',
          spaceId: space.id,
          confirmed: true,
          expectedRevision: revision,
          label: 'Remove workspace',
        });
        close();
      } catch (error) {
        status.textContent = error.message;
        remove.disabled = false;
      }
    },
    { className: 'danger' },
  );
  const { close } = modal(
    'Remove workspace?',
    el(
      'div',
      {},
      el(
        'p',
        {},
        `Remove “${space.name}” and its ${collections.length} ${collections.length === 1 ? 'collection' : 'collections'}, ${tabs} saved ${tabs === 1 ? 'tab' : 'tabs'}, and notes?`,
      ),
      el(
        'p',
        { class: 'hint' },
        data.state.spaces.length === 1
          ? 'A new empty space will replace it. Open tabs stay open.'
          : 'Open tabs stay open',
      ),
      status,
    ),
    [cancel, remove],
  );
  cancel.focus();
}

function openSpace(id) {
  // Choosing a destination leaves search; it must not restore the search's origin.
  searchReturnView = null;
  activeSpace = id;
  activeCollection = null;
  revealedCollection = null;
  collectionLimit = 60;
  localStorage.setItem('neo-space', activeSpace);
  const search = $('#tab-search');
  if (search.value) {
    search.value = '';
    search.dispatchEvent(new Event('input'));
  } else renderBoard();
  $('#main').scrollTop = 0;
}
function renderSpaces() {
  const spaces = data.state.spaces;
  const searching = !!libraryQuery();
  if (!spaces.some((s) => s.id === activeSpace)) activeSpace = spaces[0].id;
  const restore = retainFocus($('#spaces'));
  $('#spaces').replaceChildren(
    ...spaces.map((s) =>
      el(
        'div',
        { class: 'space-tab' + (!searching && s.id === activeSpace ? ' active' : ''), dataset: { spaceId: s.id } },
        !searching && s.id === activeSpace
          ? editableName(s.name, 'space:' + s.id, (name) =>
              change('edit', { kind: 'space', spaceId: s.id, name }),
            )
          : button(s.name, () => openSpace(s.id)),
        button(
          'Workspace options for ' + s.name,
          (event) =>
            menu(
              s.name,
              [
                [
                  'Rename workspace',
                  () => {
                    openSpace(s.id);
                    beginName('space:' + s.id);
                  },
                  'rename',
                ],
                [
                  'Add collection',
                  () => {
                    openSpace(s.id);
                    return createCollection();
                  },
                  'plus',
                ],
                null,
                ...(spaces.indexOf(s) > 0 ? [['Move left', () => reorderSpace(s.id, spaces[spaces.indexOf(s)-1].id)]] : []),
                ...(spaces.indexOf(s) < spaces.length-1 ? [['Move right', () => reorderSpace(s.id, spaces[spaces.indexOf(s)+2]?.id)]] : []),
                ['Remove workspace', () => confirmRemoveWorkspace(s), 'close'],
              ],
              { anchor: event.currentTarget },
            ),
          { glyph: 'more', quiet: true, className: 'space-options' },
        ),
      ),
    ),
    button(
      'Add space',
      act(async () => {
        await change('edit', { kind: 'create-space' });
        openSpace(data.state.spaces.at(-1).id);
        beginName('space:' + activeSpace);
      }),
      { glyph: 'plus', quiet: true },
    ),
  );
  const nav = $('#spaces');
  nav.ondragover = event => {
    if (!draggingSpace) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    markSpaceAtPoint({ x: event.clientX, y: event.clientY });
  };
  nav.ondrop = act(async event => {
    if (!draggingSpace) return;
    event.preventDefault();
    event.stopPropagation();
    const id = draggingSpace, slot = markSpaceAtPoint({ x: event.clientX, y: event.clientY });
    clearSpaceDrag();
    if (slot) await reorderSpace(id, slot.beforeId);
  });
  for (const tab of nav.querySelectorAll('.space-tab')) {
    const name = tab.firstElementChild;
    name.dataset.focusKey = 'space:' + tab.dataset.spaceId;
    if (name.tagName !== 'BUTTON') continue;
    if (!searching && tab.dataset.spaceId === activeSpace) name.setAttribute('aria-current', 'page');
    name.draggable = spaces.length > 1;
    name.ondragstart = event => {
      draggingSpace = tab.dataset.spaceId;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-neo', JSON.stringify({ type: 'space', id: draggingSpace }));
      const ghost = el('div', { class: 'collection-drag-ghost space-drag-ghost' }, name.textContent);
      document.body.append(ghost);
      event.dataTransfer.setDragImage(ghost, 28, 18);
      requestAnimationFrame(() => {
        ghost.remove();
        if (draggingSpace === tab.dataset.spaceId) tab.classList.add('dragging');
      });
    };
    name.ondragend = clearSpaceDrag;
  }
  restore();
}
function collectionStyle(c) {
  return `--color:var(--${PALETTE.includes(c.color) ? c.color : 'blue'})`;
}
function renderBoard() {
  if (dragActive || draggingCollection) { refreshAfterDrag = true; return; }
  const restoreScroll = retainScroll();
  rendering++;
  try {
    renderBoardContent();
    highlightMatches($('#board'), libraryQuery());
  } finally {
    rendering--;
    restoreScroll();
  }
}
function renderBoardContent() {
  renderSpaces();
  const restoreFocus = retainFocus($('#board'));
  if (activeCollection && !findCollection()) activeCollection = null;
  const board = $('#board');
  const query = libraryQuery();
  const detail = !query && activeCollection;
  board.className = detail
    ? 'detail'
    : data.state.settings.view === 'list'
      ? 'list-view'
      : '';
  $('#breadcrumbs').replaceChildren(
    ...[
      detail
        ? button(
            'All collections',
            () => {
              activeCollection = null;
              renderBoard();
            },
            { glyph: 'back' },
          )
        : el(
            'span',
            {},
            `${data.state.collections.filter((c) => c.spaceId === activeSpace).length} collections`,
          ),
      detail ? el('span', {}, findCollection().name) : null,
    ].filter(Boolean),
  );
  $('#view-tools').replaceChildren(
    ...(detail
      ? [
          button('Open all', () => actions.resume(findCollection())),
          button('Open in new window', () => actions.resume(findCollection(), { target: 'new' })),
          button(
            'Switch to collection',
            act(() => actions.swap(findCollection())),
            { disabled: data.sessionState?.active?.[win]?.collectionId === activeCollection },
          ),
        ]
      : ['board', 'list'].map((v) =>
          button(
            v === 'board' ? 'Board view' : 'List view',
            act(() => change('settings', { settings: { view: v } })),
            {
              glyph: v === 'board' ? 'grid' : 'list',
              quiet: true,
              className: data.state.settings.view === v ? 'view-active' : '',
            },
          ),
        )),
  );
  const matchingCollections = orderedCollections(data.state.collections)
    .filter(c => query ? matchesCollection(c, query) : c.spaceId === activeSpace);
  const collections = detail ? [findCollection()] : matchingCollections.slice(0, collectionLimit);
  if (query) {
    const resultCount = matchingCollections.reduce((count, c) => count + countCollectionMatches(c, query), 0);
    $('#breadcrumbs').replaceChildren(
      el('span', {role:'status'}, `${resultCount} ${resultCount === 1 ? 'result' : 'results'} across all spaces`),
      button('Clear search', () => {
        $('#tab-search').value = '';
        $('#tab-search').dispatchEvent(new Event('input'));
        $('#tab-search').focus({preventScroll:true});
      }),
    );
  }
  if (!collections.length && query) {
    board.replaceChildren(el('p', {class:'hint'}, 'No matching collections'));
    board.ondragover = board.ondrop = null;
    restoreFocus();
    return;
  }
  if (!collections.length) {
    board.style.display = '';
    board.replaceChildren(
      newCollectionDropTarget(),
    );
    board.ondragover = (e) => e.preventDefault();
    board.ondrop = act(async (e) => {
      e.preventDefault();
      const p = dragPayload(e);
      if (p?.type === 'tabs') await change('save', { tabIds: p.ids, drop:{group:p.wholeGroup===true} });
    });
    return;
  }
  board.style.display = '';
  board.ondragover = e=>{if(draggingCollection){e.preventDefault();e.dataTransfer.dropEffect=markCollectionAtPoint({x:e.clientX,y:e.clientY})?'move':'none';}};
  board.ondrop = act(async e=>{if(!draggingCollection)return;e.preventDefault();const id=draggingCollection,slot=markCollectionAtPoint({x:e.clientX,y:e.clientY});clearCollectionDrag();if(slot)await change('edit',{kind:'move-collection',collectionId:id,beforeId:slot.beforeId,label:'Move collection'});});
  board.replaceChildren(...collections.map(collectionCard));
  if (!detail && !query)
    board.append(
      newCollectionDropTarget(),
    );
  if (!detail && matchingCollections.length > collectionLimit)
    board.append(
      button('Show more collections', () => {
        collectionLimit += 60;
        renderBoard();
      }),
    );
  restoreFocus();
}
function revealSearchedCollection(c) {
  searchReturnView = null;
  activeSpace = c.spaceId;
  localStorage.setItem('neo-space', activeSpace);
  activeCollection = c.id;
  revealedCollection = c.id;
  $('#tab-search').value = '';
  $('#tab-search').dispatchEvent(new Event('input'));
  const card = [...$('#board').querySelectorAll('.collection')].find(node => node.dataset.collectionId === c.id);
  const target = card?.querySelector('.collection-name');
  target?.focus({preventScroll:true});
  target?.scrollIntoView({block:'nearest'});
}
const copyDrag = (e) => e.ctrlKey || e.metaKey;
let draggingCopy = false;
function clearDropFeedback() {
  document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
  insertionIndicator.clear();
}
function markSavedDrop(point) {
  const card=document.elementFromPoint(point.x,point.y)?.closest('.collection');
  if (!draggingPayload || !card) { insertionIndicator.clear(); return; }
  const collection=findCollection(card.dataset.collectionId);
  const plan=collectionDropPlan(card,collection,point,draggingPayload,{copy:draggingCopy});
  insertionIndicator.show(plan?.rect,$('#main'),plan?.group?'group':'link');
  return plan;
}

async function dropIntoCollection(event, card, collection) {
  const payload=dragPayload(event);
  if (!['tabs','link','links','group'].includes(payload?.type)) return false;
  event.preventDefault();event.stopPropagation();
  const copy=copyDrag(event);
  const plan=collectionDropPlan(card,collection,{x:event.clientX,y:event.clientY},payload,{copy});
  finishDrag();
  if (!plan) return true;
  if(payload.type==='tabs') {
    await change('save',{tabIds:payload.ids,destinationId:collection.id,excludePinned:false,drop:{group:plan.group,beforeId:plan.beforeId,groupId:plan.groupId}});
  } else {
    await change('edit',{kind:payload.type==='group'?'move-group':payload.type==='links'?'move-links':'move-link',copy,
      collectionId:payload.collectionId,linkId:payload.linkId,linkIds:payload.linkIds,
      destinationId:collection.id,groupId:payload.type==='group'?payload.groupId:plan.groupId,beforeId:plan.beforeId,reveal:true});
  }
  return true;
}
document.addEventListener('dragover',event=>{
  draggingCopy=copyDrag(event);
  updateInsertion({x:event.clientX,y:event.clientY});
  if (draggingSpace && !event.target.closest('#spaces')) {
    event.dataTransfer.dropEffect = 'none';
    event.stopPropagation();
  }
},true);
document.addEventListener('drop', event => {
  if (draggingSpace && !event.target.closest('#spaces')) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);
document.addEventListener('dragend', clearDropFeedback);
function dragFeedback(e) {
  e.preventDefault();
  const card=e.target.closest('.collection');
  if (card && draggingPayload && !collectionDropPlan(card,findCollection(card.dataset.collectionId),
    {x:e.clientX,y:e.clientY},draggingPayload,{copy:copyDrag(e)})) {
    e.dataTransfer.dropEffect='none';
    return;
  }
  e.dataTransfer.dropEffect =
    draggingPayload?.type === 'tabs' || copyDrag(e) || e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
}
function dragPayload(e) {
  try {
    return JSON.parse(e.dataTransfer.getData('application/x-neo'));
  } catch {
    return null;
  }
}

function newCollectionDropTarget() {
  const target=button('New collection', act(createCollection), {glyph:'plus',className:'add-collection'});
  target.ondragover=e=>{if(!draggingPayload)return;dragFeedback(e);target.classList.add('drag-over');};
  target.ondragleave=e=>{if(!target.contains(e.relatedTarget))target.classList.remove('drag-over');};
  target.ondrop=act(async e=>{
    const payload=dragPayload(e); if(!['tabs','link','links','group'].includes(payload?.type))return;
    e.preventDefault(); e.stopPropagation();
    finishDrag();
    await change('drop-new', {payload,copy:copyDrag(e),spaceId:activeSpace});
  });
  return target;
}
function renderCurrentCollection() {
  const host=$('#current-collection'); if(!host)return;
  const active=data.sessionState?.active?.[win];
  const c=data.state.collections.find(c=>c.id===active?.collectionId);
  host.replaceChildren();
  if(c) {
    host.style.setProperty('--current-color',colorHex(c.color));
    const label=button(c.name,()=>{activeSpace=c.spaceId;activeCollection=c.id;renderBoard();}, {className:'current-collection-name', title:'Current collection: '+c.name});
    label.prepend(el('span',{class:'current-colour','aria-hidden':'true'}));
    const updating = active.tracking !== false && c.autoUpdate !== false;
    const toggle = el('input', { type: 'checkbox', role: 'switch', checked: updating,
      'aria-label': 'Auto-update current collection',
      title: updating ? 'Pause auto-update: keep the saved collection unchanged' : 'Resume auto-update: save this window’s current tabs and follow changes',
    });
    toggle.onchange = act(async () => {
      toggle.disabled = true;
      try { await change('collection-auto-update', { collectionId: c.id, windowId: win, enabled: toggle.checked }); }
      catch (error) { toggle.checked = updating; throw error; }
      finally { toggle.disabled = false; }
    });
    const autoUpdate = el('label', { class: 'current-auto-update' }, 'Auto-update', toggle,
      el('small', { class: 'auto-update-state' }, updating ? 'On' : 'Paused'));
    host.append(label, autoUpdate,button('Close current collection',act(()=>actions.closeCollection(c)),{glyph:'close',className:'close-current'}));
  } else {
    host.style.removeProperty('--current-color');
    host.append(button('Close all currently open tabs',act(()=>actions.closeWindow()),{className:'close-all-tabs',title:'Close all unpinned tabs in this window. Pinned tabs stay open.',disabled:!data.tabs.some(t=>t.windowId===win&&!t.pinned)}));
  }
  updatePageIdentity(document,c);
}

function collectionCard(c) {
  const query = libraryQuery();
  const expanded = !query && activeCollection === c.id;
  const collapsed = c.collapsed && revealedCollection !== c.id;
  const selection = savedSelections.get(c.id);
  if (selection)
    for (const id of selection.ids) if (!c.links.some((l) => l.id === id)) selection.ids.delete(id);
  const card = el('article', {
    class: 'collection',
    style: collectionStyle(c) + ';--color:' + colorHex(c.color) + ';--collection-ink:' + colorInk(c.color),
    dataset: { collectionId: c.id },
  });
  card.ondragover = (e) => {
    e.preventDefault();
    if (draggingCollection) {
      e.dataTransfer.dropEffect = markCollectionAtPoint({x:e.clientX,y:e.clientY})?'move':'none';
      return;
    }
    dragFeedback(e);
    card.classList.remove('drag-over');
  };
  card.ondragleave = (e) => {
    if (!card.contains(e.relatedTarget)) card.classList.remove('drag-over');
  };
  card.ondrop = act(async (e) => {
    if(await dropIntoCollection(e,card,c))return;
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('drag-over');
    const p = dragPayload(e);
    if (p?.type === 'collection') {
      if (p.id === c.id) {
        clearCollectionDrag();
        return;
      }
      const slot = markCollectionAtPoint({x:e.clientX,y:e.clientY});
      clearCollectionDrag();
      if (!slot) return;
      await change('edit', {
        kind: 'move-collection',
        collectionId: p.id,
        beforeId:slot.beforeId,
        label: 'Move collection',
      });
      return;
    }
  });
  const name = editableName(
    c.name,
    c.id + ':name',
    (name) => change('edit', { kind: 'collection', collectionId: c.id, name }),
    'collection-name',
  );
  if(!name.querySelector('input'))name.dataset.focusKey = c.id + ':name';
  name.draggable = !query && name.tagName !== 'INPUT'&&!name.querySelector('input');
  name.ondragstart = name.draggable ? (e) => {
    e.dataTransfer.setData('application/x-neo', JSON.stringify({ type: 'collection', id: c.id }));
  } : null;
  card.append(
    el(
      'header',
      { class: 'collection-head' },
      button(
        (collapsed ? 'Unfold ' : 'Fold ') + c.name,
        act(() => {
          revealedCollection = null;
          return change('edit', { kind: 'collection', collectionId: c.id, collapsed: !collapsed });
        }),
        { glyph: collapsed ? 'chevron' : 'down', quiet: true, className: 'collection-fold' },
      ),
      name,
      el('small', {}, c.links.length),
      button(
        selection ? 'Done' : 'Select',
        () => {
          if (selection) savedSelections.delete(c.id);
          else {
            const wasCollapsed = c.collapsed;
            c.collapsed = false;
            savedSelections.set(c.id, { ids: new Set(), anchor: null });
            if (wasCollapsed)
              change('edit', { kind: 'collection', collectionId: c.id, collapsed: false }).catch(
                (e) => toast(e.message, { error: true }),
              );
          }
          renderBoard();
        },
        {
          glyph: selection ? undefined : 'select',
          quiet: !selection,
          className: 'collection-select' + (selection ? ' selection-mode-button' : ''),
        },
      ),
      button(
        (expanded ? 'Restore ' : 'Expand ') + c.name,
        () => {
          if (query) return revealSearchedCollection(c);
          activeCollection = expanded ? null : c.id;
          renderBoard();
        },
        { glyph: expanded ? 'restore' : 'expand', quiet: true },
      ),
      button(`Options for ${c.name}`, (e) => collectionMenu(c, e.currentTarget), {
        glyph: 'more',
        quiet: true,
      }),
    ),
  );
  const currentSession = data.sessionState?.active?.[win]?.collectionId === c.id;
  card.append(el('div', {class:'collection-meta'},
    query ? el('span', {class:'collection-space'}, data.state.spaces.find(s => s.id === c.spaceId)?.name || 'My space') : null,
    c.pinned ? el('span', {class:'collection-pinned'}, icon('pin'), 'Pinned') : null,

    currentSession ? el('span', {class:'collection-current-label'}, 'Current') : null));
  card.classList.toggle('current-collection-card', currentSession);
  card.querySelector('.collection-head').title=c.name+' · '+collectionAge(c);
  card.append(el('div', {class:'collection-primary-actions'},
    button('Open', act(() => actions.resume(c)), {glyph:'external', title:'Open fresh tabs; keep saved collection unchanged', disabled:!c.links.length}),
    button('Switch', act(() => actions.swap(c)), {glyph:'arrow', className:'collection-switch', 'aria-label':'Switch to collection', disabled:currentSession, title:currentSession?'This collection is already current':'Make this collection current in this window; choose whether to save the current tabs'})));
  card.querySelector('.collection-switch').setAttribute('aria-label','Switch to collection');
  const header = card.querySelector('.collection-head');
  // A draggable ancestor steals mouse text selection from its rename field.
  header.draggable = !activeCollection && !query && editingName !== c.id + ':name';
  header.ondragstart = (e) => {
    if (!header.draggable || e.target.tagName === 'INPUT') {
      e.preventDefault();
      return;
    }
    draggingCollection = c.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-neo', JSON.stringify({ type: 'collection', id: c.id }));
    const ghost = el('div', { class: 'collection-drag-ghost', style: collectionStyle(c) }, c.name);
    ghost.style.width = header.getBoundingClientRect().width + 'px';
    document.body.append(ghost);
    e.dataTransfer.setDragImage(ghost, 28, 18);
    requestAnimationFrame(() => {
      ghost.remove();
      card.classList.add('dragging');
    });
  };
  header.ondragend = clearCollectionDrag;
  header.oncontextmenu = (e) => {
    e.preventDefault();
    collectionMenu(c, header.querySelector('button[aria-label^="Options"]'));
  };
  const matchesCollection = query && matchesPage({ title: c.name + ' ' + (c.note || '') }, query);
  card.classList.toggle('folded', !!collapsed && !query);
  if (query) {
    const fold = card.querySelector('.collection-fold');
    fold.replaceChildren(icon('down'));
    fold.disabled = true;
    fold.title = 'Clear search to fold this collection';
  }
  card
    .querySelector('.collection-fold')
    .setAttribute('aria-expanded', String(!collapsed || !!query));
  if (collapsed && !query) return card;
  const body = el('div', { class: 'collection-body', id: `collection-content-${c.id}` });
  if (selection) card.append(savedSelectionToolbar(c, selection));
  const matchingLinks = (links, group) => query && !matchesCollection && !(group && matchesPage({ title: group.name }, query))
    ? links.filter(l => matchesPage(l, query)) : links;
  const ungrouped = matchingLinks(c.links.filter(l => !l.groupId));
  const sections = c.groups.map(group => ({
    group, links: matchingLinks(c.links.filter(l => l.groupId === group.id), group),
    collapsed: group.collapsed && !query,
  })).filter(section => !query || matchesCollection || matchesPage({ title: section.group.name }, query) || section.links.length);
  const baseLimit = expanded ? 80 : 8;
  const previewKey = `${c.id}:${expanded ? 'detail' : 'card'}:${query}`;
  const limit = linkLimits.get(previewKey) || baseLimit;
  const preview = collectionPreview(ungrouped, sections, limit, c.itemOrder);
  for (const item of preview.items) {
    if (item.type === 'link') { body.append(savedRow(c, item.value)); continue; }
    const section = item.value;
    const g = section.group;
    const children = c.links.filter((l) => l.groupId === g.id);
    if (
      query &&
      !matchesCollection &&
      !matchesPage({ title: g.name }, query) &&
      !children.some((l) => matchesPage(l, query))
    )
      continue;
    const wrap = el('div', { class: 'saved-group', dataset:{groupId:g.id} });
    const toggle = button(
      '',
      act(() => {
        return change('edit', {
          kind: 'group',
          collectionId: c.id,
          groupId: g.id,
          collapsed: !section.collapsed,
        });
      }),
      { className: 'group-toggle' },
    );
    toggle.setAttribute('aria-expanded', String(!section.collapsed));
    toggle.setAttribute('aria-label', `${section.collapsed ? 'Expand' : 'Collapse'} group ${g.name}`);
    toggle.replaceChildren(icon(section.collapsed ? 'chevron' : 'down'), icon('group'));
    if (query) {
      toggle.disabled = true;
      toggle.title = 'Clear search to fold this group';
    }
    wrap.append(toggle);
    toggle.dataset.focusKey = g.id + ':toggle';
    const options = button(`Options for group ${g.name}`, (e) => groupMenu(c, g, e.currentTarget), {
      glyph: 'more',
      quiet: true,
    });
    options.dataset.focusKey = g.id + ':options';
    wrap.replaceChildren(
      el(
        'div',
        {
          class: 'group-header',
          draggable: editingName !== g.id + ':name',
          dataset: { groupId: g.id },
          title: 'Drag to move. Hold Ctrl to copy this group.',
          ondragstart: (e) => {
            if (!e.currentTarget.draggable || e.target.tagName === 'INPUT') {
              e.preventDefault();
              return;
            }
            e.stopPropagation();
            draggingPayload = {type:'group',collectionId:c.id,groupId:g.id};
            showItemDragImage(e,children,g.name+' · '+children.length+' tabs');
            e.dataTransfer.setData(
              'application/x-neo',
              JSON.stringify({
                type: 'group',
                collectionId: c.id,
                groupId: g.id,
              }),
            );
            e.dataTransfer.effectAllowed = 'copyMove';
          },
        },
        toggle,
        selection
          ? el('input', {
              type: 'checkbox',
              checked: children.length > 0 && children.every((l) => selection.ids.has(l.id)),
              indeterminate:
                children.some((l) => selection.ids.has(l.id)) &&
                !children.every((l) => selection.ids.has(l.id)),
              disabled: !children.length,
              'aria-label': 'Select group ' + g.name,
              onchange: (e) => {
                children.forEach((l) =>
                  e.target.checked ? selection.ids.add(l.id) : selection.ids.delete(l.id),
                );
                renderBoard();
              },
            })
          : null,
        editableName(g.name, g.id + ':name', (name) =>
          change('edit', { kind: 'group', collectionId: c.id, groupId: g.id, name }),
        ),
        el('small', {}, children.length),
        options,
      ),
    );
    toggle.oncontextmenu = (e) => {
      e.preventDefault();
      groupMenu(c, g);
    };
    wrap.ondragover = dragFeedback;
    wrap.ondrop = act(e => dropIntoCollection(e,card,c));
    if (!section.collapsed) {
      const members = el('div', { class: 'group-members' });
      members.append(...section.links.map(l => savedRow(c, l)));
      wrap.append(members);
    }
    body.append(wrap);
  }
  if (preview.hasMore || limit > baseLimit) {
    const controls = el('div', { class: 'collection-disclosure' });
    const collapse = () => {
      linkLimits.delete(previewKey);
      renderBoard();
      const control = [...document.querySelectorAll('.collection-disclosure button')]
        .find(node => node.dataset.focusKey === c.id + ':disclosure');
      control?.focus({ preventScroll: true });
      control?.scrollIntoView({ block: 'nearest' });
    };
    const remaining = preview.hiddenTabs
      ? `${preview.hiddenTabs} ${preview.hiddenTabs === 1 ? 'tab' : 'tabs'} remaining`
      : `${preview.hiddenGroups} ${preview.hiddenGroups === 1 ? 'group' : 'groups'} remaining`;
    const more = button(preview.hasMore ? `Show more · ${remaining}` : 'Show less',
      preview.hasMore ? () => { linkLimits.set(previewKey, limit + 80); renderBoard(); } : collapse,
      { className: 'more-links' });
    more.dataset.focusKey = c.id + ':disclosure';
    more.setAttribute('aria-expanded', String(limit > baseLimit));
    more.setAttribute('aria-controls', body.id);
    controls.append(more);
    if (preview.hasMore && limit > baseLimit) {
      const less = button('Show less', collapse, { className: 'more-links' });
      less.dataset.focusKey = c.id + ':show-less';
      less.setAttribute('aria-expanded', 'true');
      less.setAttribute('aria-controls', body.id);
      controls.append(less);
    }
    body.append(controls);
  }
  if (!c.links.length) body.append(el('p', { class: 'empty' }, 'Drop tabs here to save them.'));
  if (c.note || noteDrafts.has(c.id)) {
    const value = noteDrafts.get(c.id) ?? c.note;
    const editor = el('textarea', {
      class: 'collection-note',
      rows: Math.min(4, (value.match(/\n/g) || []).length + 1),
      value,
      maxLength: 10000,
      placeholder: 'Leave a note for next time…',
      'aria-label': `Note for ${c.name}`,
      oninput: (e) => noteDrafts.set(c.id, e.target.value),
      onchange: act(async (e) => {
        if (rendering) return;
        const value = e.target.value;
        await change('edit', {
          kind: 'collection',
          collectionId: c.id,
          note: value,
          label: 'Save note',
        });
        if (noteDrafts.get(c.id) === value) noteDrafts.delete(c.id);
        renderBoard();
      }),
    });
    const remove = button(
      'Delete note',
      act(async () => {
        noteDrafts.delete(c.id);
        if (c.note)
          await change('edit', {
            kind: 'collection',
            collectionId: c.id,
            note: '',
            label: 'Delete note',
          });
        else renderBoard();
        $(`[data-collection-id="${c.id}"] button[aria-label="Add note"]`)?.focus();
      }),
      { className: 'delete-collection-note' },
    );
    // Keep a mouse click on Delete from first saving the editor through blur.
    remove.addEventListener('pointerdown', (e) => e.preventDefault());
    body.append(el('div', { class: 'collection-note-editor' }, editor, remove));
  }
  body.append(
    el(
      'div',
      { class: 'collection-footer' },
      button('Add link', () => editLink(c)),
      button(
        'Add group',
        act(() => createGroup(c)),
      ),
      !c.note && !noteDrafts.has(c.id)
        ? button('Add note', () => {
            noteDrafts.set(c.id, '');
            renderBoard();
            $(`[data-collection-id="${c.id}"] .collection-note`)?.focus();
          })
        : null,
    ),
  );
  const note = body.querySelector('.collection-note');
  if (note) note.dataset.focusKey = c.id + ':note';
  for (const row of body.querySelectorAll('.saved-row'))
    for (const control of row.querySelectorAll('button'))
      control.dataset.focusKey = c.id + ':' + row.dataset.linkId + ':' + control.className;
  card.append(body);
  return card;
}
function savedSelectionToolbar(c, selection) {
  const ids = () => [...selection.ids];
  const members = c.links.filter((l) => selection.ids.has(l.id));
  const control = (label, fn, enabled = members.length, glyph) => {
    const remove = label === 'Remove from collection';
    const b = button(label, act(fn), {
      glyph: glyph || (label === 'Clear' ? 'clear' : label === 'Move to…' ? 'arrow' : 'select'),
      quiet: !remove,
      className: remove ? 'close-selected remove-selected' : '',
    });
    if(remove)b.replaceChildren(label);
    b.disabled = !enabled;
    return b;
  };
  const toolbar = el(
    'div',
    { class: 'saved-selection selection-toolbar', 'aria-label': 'Selected links in ' + c.name },
    el('strong', { 'aria-live': 'polite' }, members.length + ' selected'),
    button(
      'Select all',
      () => {
        c.links.forEach((l) => selection.ids.add(l.id));
        renderBoard();
      },
      { glyph: 'select', quiet: true },
    ),
    control('Clear', () => {
      selection.ids.clear();
      renderBoard();
    }),
    control('Open', () => actions.resume(c, { linkIds: ids() }), members.length, 'external'),
    control(
      'Group',
      async () => {
        const groupId = uid();
        await change('edit', {
          kind: 'group-links',
          collectionId: c.id,
          linkIds: ids(),
          groupId,
          label: 'Group saved links',
        });
        beginName(groupId + ':name');
      },
      members.length,
      'group',
    ),
    control(
      'Ungroup',
      () =>
        change('edit', {
          kind: 'ungroup-links',
          collectionId: c.id,
          linkIds: ids(),
          label: 'Ungroup saved links',
        }),
      members.some((l) => l.groupId),
      'ungroup',
    ),
    control('Move to…', () => {
      const search = el('input', {
        type: 'search',
        placeholder: 'Search collections…',
        'aria-label': 'Search collections',
      });
      const choices = el('div', { class: 'collection-choices', 'aria-label': 'Collections' });
      const destinations = orderedCollections(data.state.collections).filter((x) => x.id !== c.id);
      const { close } = popover(
        'Move selected links to',
        el('div', { class: 'collection-picker' }, search, choices),
      );
      const render = () => {
        const query = search.value.trim().toLocaleLowerCase();
        choices.replaceChildren(
          ...destinations
            .filter((x) => x.name.toLocaleLowerCase().includes(query))
            .map((dest) =>
              collectionChoice(
                dest,
                act(async () => {
                  await change('edit', {
                    kind: 'move-links',
                    collectionId: c.id,
                    linkIds: ids(),
                    destinationId: dest.id,
                    label: 'Move saved links',
                  });
                  close();
                }),
                {
                  detail: `${dest.links.length} tabs · ${data.state.spaces.find((x) => x.id === dest.spaceId)?.name || 'My space'}`,
                },
              ),
            ),
        );
        if (!choices.children.length)
          choices.append(
            el(
              'p',
              { class: 'hint', role: 'status' },
              destinations.length ? 'No matching collections.' : 'Add another collection first.',
            ),
          );
      };
      search.oninput = render;
      search.onkeydown = (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          choices.querySelector('button')?.focus();
        }
        if (event.key === 'Enter' && !event.isComposing) {
          event.preventDefault();
          choices.querySelector('button')?.click();
        }
      };
      render();
      search.focus({ preventScroll: true });
    }),
    control(
      'Remove from collection',
      () =>
        change('edit', {
          kind: 'delete-links',
          collectionId: c.id,
          linkIds: ids(),
          label: 'Remove saved links',
        }),
      members.length,
      'close',
    ),
  );
  const controls = [...toolbar.children];
  toolbar.replaceChildren(
    el('div', { class: 'selection-summary' }, controls.slice(0, 3)),
    el('div', { class: 'selection-actions' }, controls.slice(3)),
  );
  return toolbar;
}
function savedRow(c, l) {
  const selection = savedSelections.get(c.id);
  function choose(event) {
    if (!selection && !event.ctrlKey && !event.metaKey && !event.shiftKey)
      return rpc('open-link', { collectionId: c.id, linkId: l.id, windowId: win });
    const current = selection || { ids: new Set(), anchor: null };
    savedSelections.set(c.id, current);
    if (event.shiftKey && current.anchor) {
      const rows = [
        ...event.currentTarget.closest('.collection').querySelectorAll('.saved-row'),
      ].map((r) => r.dataset.linkId);
      const a = rows.indexOf(current.anchor),
        b = rows.indexOf(l.id);
      if (a >= 0 && b >= 0)
        rows.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((id) => current.ids.add(id));
    } else {
      current.ids.has(l.id) ? current.ids.delete(l.id) : current.ids.add(l.id);
      current.anchor = l.id;
    }
    renderBoard();
  }
  const row = el(
    'div',
    {
      class: 'saved-row' + (selection?.ids.has(l.id) ? ' selected' : ''),
      dataset: { linkId: l.id },
      draggable: true,
      title: (l.note || l.url) + '\nDrag to move. Hold Ctrl to copy.',
      ondragstart: (e) => {
        e.stopPropagation();
        draggingPayload = selection?.ids.has(l.id)
          ? {type:'links',collectionId:c.id,linkIds:[...selection.ids]}
          : {type:'link',collectionId:c.id,linkId:l.id};
        const members=c.links.filter(link=>draggingPayload.linkIds?.includes(link.id)||draggingPayload.linkId===link.id);
        showItemDragImage(e,members,members.length>1?members.length+' tabs':null);
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData(
          'application/x-neo',
          JSON.stringify(
            selection?.ids.has(l.id)
              ? { type: 'links', collectionId: c.id, linkIds: [...selection.ids] }
              : { type: 'link', collectionId: c.id, linkId: l.id },
          ),
        );
      },
    },
    selection
      ? el('input', {
          type: 'checkbox',
          checked: selection.ids.has(l.id),
          'aria-label': 'Select ' + l.title,
          onchange: choose,
        })
      : null,
    favicon(l),
    button(l.title, act(choose), { className: 'link-open' }),
    l.note ? noteButton(l.title, l.note) : null,
    button(`Edit ${l.title}`, (e) => linkMenu(c, l, e.currentTarget), {
      glyph: 'more',
      quiet: true,
    }),
    button(
      `Remove ${l.title} from collection`,
      act(() =>
        change('edit', {
          kind: 'delete-link',
          collectionId: c.id,
          linkId: l.id,
          label: 'Remove saved link',
        }),
      ),
      { glyph: 'close', quiet: true, className: 'remove-link' },
    ),
  );
  row.querySelector('.link-open').classList.add('row-title');
  if (
    libraryQuery() &&
    !matchesPage({ title: l.title }, libraryQuery()) &&
    matchesPage({ url: l.url }, libraryQuery())
  ) {
    const label = row.querySelector('.link-open');
    label.classList.remove('row-title');
    label.replaceChildren(
      el('span', { class: 'row-title' }, l.title),
      el('small', { class: 'search-match-url' }, l.url),
    );
  }
  row.ondragover = dragFeedback;
  row.ondrop = act(e => dropIntoCollection(e,row.closest('.collection'),c));
  return row;
}
function collectionMenu(c, trigger) {
  const applyColour=async colour=>{
    await change('edit',{kind:'collection',collectionId:c.id,color:colour});
    for(const swatch of colors.querySelectorAll('.swatch')){
      const chosen=colorHex(swatch.dataset.color)===colorHex(colour);
      swatch.classList.toggle('selected',chosen);swatch.setAttribute('aria-pressed',String(chosen));
    }
    custom.value=colorHex(colour);hex.value=colorHex(colour);
  };
  const colors = el(
    'div',
    { class: 'swatches' },
    ...PALETTE.map((color) =>
      el('button', {
        class: 'swatch' + (colorHex(color) === colorHex(c.color) ? ' selected' : ''),
        style: `--swatch-color:${colorHex(color)}`,
        dataset:{color},
        'aria-pressed':String(colorHex(color)===colorHex(c.color)),
        title: color,
        'aria-label': color,
        onclick: act(() => applyColour(color)),
      }),
    ),
  );
  const custom = el('input', {type:'color', value:colorHex(c.color), 'aria-label':'Custom collection colour', onchange:act(e => applyColour(e.target.value))});
  const hex = el('input', {value:colorHex(c.color), maxLength:7, pattern:'#[0-9a-fA-F]{6}', 'aria-label':'Hex colour', onchange:act(e => { if(!/^#[0-9a-f]{6}$/i.test(e.target.value)) throw Error('Enter a hex colour, such as #3498db'); return applyColour(e.target.value); })});
  colors.append(el('label', {class:'custom-colour'}, 'Custom', custom, hex));
  const choices = [
    ['Open in new window',()=>actions.resume(c,{target:'new'}),'external',!c.links.length],
    ['Version history', () => actions.versions(c), 'history'],
    [
      c.pinned ? 'Unpin collection' : 'Pin collection',
      () =>
        change('edit', {
          kind: 'collection',
          collectionId: c.id,
          pinned: !c.pinned,
          label: c.pinned ? 'Unpin collection' : 'Pin collection',
        }),
      'pin',
    ],
    null,
    [
      'Move to space',
      () =>
        menu(
          'Move to space',
          data.state.spaces
            .filter((x) => x.id !== c.spaceId)
            .map((x) => [
              x.name,
              () => change('edit', { kind: 'collection', collectionId: c.id, spaceId: x.id }),
            ]),
          { anchor: trigger },
        ),
      'arrow',
    ],
    null,
    ['Group & sort', () => actions.groupCollection(c), 'group', !c.links.length],
    ['Organise collection with AI', () => actions.ai(c), 'sparkles', !c.links.length],
    ['Export', () => actions.export(c, trigger), 'tray'],
    [
      'Duplicate collection',
      () => change('edit', { kind: 'duplicate-collection', collectionId: c.id }),
      'copy',
    ],
    [
      'Delete collection',
      () =>
        change('edit', {
          kind: 'delete-collection',
          collectionId: c.id,
          label: 'Delete collection',
        }),
      'close',
    ],
  ];
  menu('Collection actions', choices, { anchor: trigger, prefix: colors });
}
function groupMenu(c, g, trigger) {
  menu(
    'Group actions',
    [
      [
        'Open all',
        () =>
          actions.resume(c, {
            linkIds: c.links.filter((l) => l.groupId === g.id).map((l) => l.id),
          }),
        'external',
      ],
      [
        'Ungroup',
        () => change('edit', { kind: 'delete-group', collectionId: c.id, groupId: g.id }),
        'ungroup',
      ],
      [
        'Remove group and links',
        () =>
          change('edit', {
            kind: c.links.some((l) => l.groupId === g.id) ? 'delete-links' : 'delete-group',
            collectionId: c.id,
            groupId: g.id,
            linkIds: c.links.filter((l) => l.groupId === g.id).map((l) => l.id),
            label: 'Remove saved group',
          }),
        'close',
      ],
    ],
    { anchor: trigger },
  );
}
function linkMenu(c, l, trigger) {
  menu(
    'Link actions',
    [
      [
        'Open in new tab',
        () => rpc('open-link', { collectionId: c.id, linkId: l.id, windowId: win }),
        'external',
      ],
      ['Edit link', () => editLink(c, l, trigger), 'rename'],
      [
        'Select',
        () => {
          savedSelections.set(c.id, { ids: new Set([l.id]), anchor: l.id });
          renderBoard();
        },
        'select',
      ],
      [
        'Remove',
        () =>
          change('edit', {
            kind: 'delete-link',
            collectionId: c.id,
            linkId: l.id,
            label: 'Remove saved link',
          }),
        'close',
      ],
    ],
    { anchor: trigger },
  );
}
function editLink(c, l, trigger) {
  const title = el('input', { value: l?.title || '', maxLength: 500 }),
    url = el('input', { value: l?.url || '', type: 'url', required: true }),
    note = el('textarea', { value: l?.note || '', maxLength: 10000 }),
    group = el(
      'select',
      {},
      el('option', { value: '' }, 'No group'),
      c.groups.map((g) => el('option', { value: g.id, selected: g.id === l?.groupId }, g.name)),
    );
  const actions = [
    button(
      'Save',
      act(async () => {
        if (!url.reportValidity()) return;
        await change('edit', {
          kind: l ? 'link' : 'add-link',
          collectionId: c.id,
          linkId: l?.id,
          title: title.value,
          url: url.value,
          note: note.value,
          groupId: group.value || null,
        });
        close();
      }),
      { className: 'primary' },
    ),
  ];
  if (l)
    actions.unshift(
      button(
        'Delete',
        act(async () => {
          await change('edit', { kind: 'delete-link', collectionId: c.id, linkId: l.id });
          close();
        }),
        { className: 'danger' },
      ),
    );
  const { close } = popover(
    l ? 'Edit link' : 'Add link',
    el(
      'div',
      {},
      field('Title', title),
      field('URL', url),
      field('Group', group),
      field('Note', note),
    ),
    actions,
    { anchor: trigger },
  );
}
function searchDialog() {
  const input = el('input', { class: 'search-input', type: 'search' }),
    scope = el('div', { class: 'search-scope' }),
    results = el('div', { class: 'search-results' });
  // Each search has its own dialog; action dialogs can close without destroying it.
  const dialog = el(
    'dialog',
    { class: 'search-dialog' },
    el(
      'header',
      { class: 'dialog-head' },
      el('h2', {}, 'Search'),
      button('Close', () => dialog.close(), { glyph: 'close', quiet: true }),
    ),
    input,
    scope,
    results,
  );
  document.body.append(dialog);
  dialog.showModal();
  const controller = (searchController = createSearchController({
    input,
    scope,
    results,
    getData: () => data,
    windowId: win,
    actions,
    onNavigate: () => dialog.close(),
    onDismiss: () => dialog.close(),
  }));
  dialog.addEventListener(
    'close',
    () => {
      controller.destroy();
      if (searchController === controller) searchController = null;
      dialog.remove();
      $('#tab-search').focus();
    },
    { once: true },
  );
  controller.focus();
}
async function initialise() {
  win = await currentWindow();
  actions = createActionDialogs({
    inLibrary: true,
    getData: () => data,
    windowId: win,
    getTabIds: selectedIds,
    change,
    onQuickStart: () => onboarding.open().catch(e=>toast(e.message,{error:true})),
  });
  await refresh();
  $('#settings').replaceChildren(icon('settings'));
  $('#settings').onclick = actions.settings;
  $('#ai-tools').hidden=true;

  $('#imports').onclick = actions.import;
  $('#recovery').onclick = actions.recovery;
  const focusLibrarySearch = () => {
    $('#tab-search').focus();
    $('#tab-search').select();
  };
  chrome.permissions.onAdded.addListener(loadHistory);
  chrome.permissions.onRemoved.addListener(loadHistory);
  loadHistory();
  $('#tab-search').onkeydown = (e) => {
    if (e.key === 'Escape' && e.currentTarget.value) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.value = '';
      e.currentTarget.dispatchEvent(new Event('input'));
    }
  };
  $('#tab-search').oninput = () => {
    const query = libraryQuery();
    if (query && !searchReturnView) searchReturnView = {space:activeSpace, collection:activeCollection, limit:collectionLimit, restore:retainScroll()};
    const returning = !query ? searchReturnView : null;
    if (returning) {
      activeSpace = returning.space;
      activeCollection = returning.collection;
      localStorage.setItem('neo-space', activeSpace);
      searchReturnView = null;
    }
    collectionLimit = returning?.limit || 60;
    selected.clear();
    anchor = null;
    tabLimit = 120;
    recentLimit = 6;
    visitLimit = 8;
    historyGeneration++;
    historyPages = [];
    historyBusy = true;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(loadHistory, 180);
    renderTabs();
    renderBoard();
    renderRecent();
    returning?.restore();
  };
  tabTools = createTabTools({
    getTabs: eligibleTabs,
    getSettings: () => data.state.settings,
    change,
    actions,
    compact: true,
    showCloseAll: false,
    showTopicAI: true,
  });
  tabTools.save.id = 'stash-button';
  tabTools.dedup.id = 'dedup';
  const selectMode = button(
    'Select tabs',
    () => {
      selectingTabs = !selectingTabs;
      if (!selectingTabs) selected.clear();
      selectMode.removeAttribute('aria-pressed');
      selectMode.replaceChildren(icon(selectingTabs ? 'check' : 'select'));
      selectMode.title = selectingTabs ? 'Done selecting' : 'Select tabs';
      selectMode.setAttribute('aria-label', selectMode.title);
      renderTabs();
    },
    { glyph: 'select', quiet: true },
  );
  selectMode.id = 'library-select-mode';
  selectMode.className = 'selection-mode-button icon-button';
  tabTools.node.append(selectMode);
  $('#tab-tools').replaceChildren(tabTools.node);
  $('#tab-preferences').replaceChildren(tabTools.grouping);
  renderTabs();
  chrome.runtime.onMessage.addListener((m) => {
    if (m.event === 'navigate')
      chrome.tabs.getCurrent().then((t) => {
        if (t?.id === m.tabId) handleNavigation();
      });
    if (m.event === 'changed') {
      schedule();
    }
  });
  const schedule = () => {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => refresh().catch(() => {}), 60);
  };
  chrome.tabs.onCreated.addListener(schedule);
  chrome.tabs.onRemoved.addListener(schedule);
  chrome.tabs.onUpdated.addListener(schedule);
  chrome.tabs.onMoved.addListener(schedule);
  chrome.tabGroups.onUpdated.addListener(schedule);
  document.addEventListener('keydown', (e) => {
    if (
      e.isComposing ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
      document.querySelector('dialog[open]')
    )
      return;
    if (e.key === '/') {
      e.preventDefault();
      focusLibrarySearch();
    }
    if (e.key === 'Escape') {
      selected.clear();
      selectingTabs = false;
      savedSelections.clear();
      renderTabs();
      renderBoard();
    }
  });
  handleNavigation();
  window.addEventListener('hashchange', handleNavigation);
}
function handleNavigation() {
  if(location.hash==='#onboarding' || location.hash==='#tour') {
    onboarding.open({automatic:location.hash==='#onboarding'}).catch(e=>toast(e.message,{error:true}));
    return;
  }
  const params = new URLSearchParams(location.hash.slice(1));
  if(params.has('q')) {$('#tab-search').value=params.get('q');$('#tab-search').dispatchEvent(new Event('input'));$('#tab-search').focus();}
  if (params.get('collection')) {
    activeCollection = params.get('collection');
    activeSpace = findCollection()?.spaceId || activeSpace;
    renderBoard();
  }
  if (location.hash === '#settings') actions.settings();
  if (params.get('action') === 'ai-connection') actions.aiConnection();
  if (location.hash === '#search') $('#tab-search').focus();
  if (['settings', 'import', 'export', 'ai'].includes(params.get('action')))
    actions[params.get('action')](findCollection());
}
async function start() {
  if (starting || started) return;
  starting = true;
  try {
    await initialise();
    started = true;
    loadRecovered();
  } catch (error) {
    loadFailed(error);
  } finally {
    starting = false;
  }
}
start();

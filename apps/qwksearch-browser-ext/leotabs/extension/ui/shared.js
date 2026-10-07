
import { PALETTE } from '../lib/model.js';
import { PROTOCOL } from '../lib/version.js';
import { rasterCanvas } from './raster.js';
import { colorHex } from '../lib/colors.js';
import { errorText } from '../lib/messages.js';
export const surface = () => globalThis.__neoSurface || document;
export const $ = (selector, root = surface()) => root.querySelector(selector);
export const $$ = (selector, root = surface()) => [...root.querySelectorAll(selector)];
// Reveal the full result (including its focus ring) without scrolling outer containers.
export function revealResult(container, node) {
  if (!node || !container.contains(node)) return;
  const card = node.closest('.switcher-card') || node;
  const bounds = container.getBoundingClientRect(),
    rect = card.getBoundingClientRect();
  const inset = 8;
  const top = rect.top - bounds.top + container.scrollTop;
  if (rect.top < bounds.top + inset || rect.height > container.clientHeight - inset * 2)
    container.scrollTop = Math.max(0, top - inset);
  else if (rect.bottom > bounds.top + container.clientHeight - inset)
    container.scrollTop = top + rect.height - container.clientHeight + inset;
}
export async function rpc(action, data = {}) {
  const result = await chrome.runtime.sendMessage({
    action,
    protocol: PROTOCOL,
    data,
    overlayToken: globalThis.__neoOverlayContext?.token,
  }).catch(error => { throw new Error(errorText(error)); });
  if (
    result?.error === 'Unknown action.' ||
    (result?.ok && action === 'load' && result.value?.protocol !== PROTOCOL)
  )
    throw new Error(
      'LeoTabs needs to reload. Reload the extension, then refresh this page.',
    );
  if (!result?.ok) throw new Error(errorText(result?.error || 'LeoTabs did not respond. Reopen the Library.'));
  return result.value;
}
// Only reads may time out and retry; never repeat a mutation after an uncertain reply.
export async function loadSnapshot(options = {}) {
  let timer;
  try {
    return await Promise.race([
      rpc('load', options),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Loading timed out. Try again.')), 8000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false)
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const icons = {
  audio: 'M4 9h4l5-4v14l-5-4H4zM16 8q5 4 0 8M18 5q8 7 0 14',
  search: 'M21 21l-5-5 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M6 18L18 6',
  tray: 'M12 3v11m-4-4 4 4 4-4M4 14v6h16v-6',
  sort: 'M4 6h16M4 12h11M4 18h6',
  copy: 'M8 8h12v12H8zM16 4H4v12',
  broom: 'm16 3-5 8m-3-1 7 4-3 7H2l3-10 3-1zM7 14l-2 7m6-5-1 5',
  expand: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',
  restore: 'M3 8h5V3M16 3v5h5M21 16h-5v5M8 21v-5H3',
  clear: 'M4 4h16v16H4zM8 12h8',
  library: 'M3 4h4v16H3zM10 4h4v16h-4zM17 4l4-1 3 16-4 1z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  chevron: 'm9 5 7 7-7 7',
  down: 'm5 9 7 7 7-7',
  up: 'm5 15 7-7 7 7',
  back: 'm14 5-7 7 7 7',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  list: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
  group: 'M3 6h6l2 2h10v12H3z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  history: 'M3 10a9 9 0 1 1 2 8M3 3v7h7M12 7v5l3 2',
  sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  external: 'M14 3h7v7M21 3 9 15M10 3H3v18h18v-7',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  note: 'M4 3h16v18H4zM8 8h8M8 12h8M8 16h5',
  check: 'm4 12 5 5L20 6',
  select: 'M4 4h16v16H4zM8 12l3 3 5-6',
  ungroup: 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M8 8h8v8H8z',
  rename: 'm4 16 12-12 4 4-12 12H4zM13 7l4 4',
  pin: 'M9 3h6v6l3 4v2H6v-2l3-4zM12 15v6',
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.65,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }))
    svg.setAttribute(k, v);
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', icons[name] || icons.group);
  svg.append(path);
  return svg;
}
export function button(
  label,
  handler,
  { glyph, quiet = false, className = '', disabled = false, title = label } = {},
) {
  return el(
    'button',
    {
      type: 'button',
      title,
      disabled,
      'aria-label': label,
      class: (quiet ? 'icon-button ' : '') + className,
      onclick: handler,
    },
    glyph ? icon(glyph) : null,
    quiet ? null : label,
  );
}
export function theme(value) {
  const target = globalThis.__neoSurface?.host || document.documentElement;
  target.dataset.theme = value;
  // The isolated overlay's `all: initial !important` reset must not override
  // the organizer's chosen scheme, nor inherit the website's own theme.
  target.style.setProperty('color-scheme', value === 'system' ? 'light dark' : value, 'important');
}
export function domain(url) {
  try {
    return new URL(url).hostname || 'Local file';
  } catch {
    return '';
  }
}
const iconImages = new Map();
export function favicon(item) {
  const pageURL = item.resourceUrl || item.url;
  const mark = el(
    'span',
    {
      class: 'favicon',
      style: `--hue:${[...domain(pageURL)].reduce((n, c) => n + c.charCodeAt(0), 0) % 360}`,
    },
    String(domain(pageURL) || item.title || '?')[0].toUpperCase(),
  );
  if (/^https?:/.test(pageURL || '')) {
    const draw = (source) => {
      const image = el('canvas', {
        width: source.width,
        height: source.height,
        'aria-hidden': 'true',
      });
      image.getContext('2d').drawImage(source, 0, 0);
      mark.replaceChildren(image);
      mark.classList.add('has-icon');
    };
    const ready = iconImages.get(pageURL)?.canvas;
    if (ready) draw(ready);
    else {
      const load = async (attempt = 0) => {
        let entry = iconImages.get(pageURL);
        if (!entry) {
          entry = {};
          entry.promise = rpc('favicon', { url: pageURL })
            .then(async (data) => {
              if (!data) return null;
              entry.canvas = await rasterCanvas(data);
              return entry.canvas;
            })
            .catch(() => null);
          iconImages.set(pageURL, entry);
          if (iconImages.size > 512) iconImages.delete(iconImages.keys().next().value);
        }
        const image = entry.canvas || (await entry.promise);
        if (image) draw(image);
        else {
          if (iconImages.get(pageURL) === entry) iconImages.delete(pageURL);
          if (attempt < 3)
            setTimeout(
              () => {
                if (mark.isConnected) load(attempt + 1);
              },
              1500 * (attempt + 1),
            );
        }
      };
      load();
    }
  }
  return mark;
}
export function toast(message, { undo, details, error = false, duration = undo ? 8000 : 5000 } = {}) {
  if (error) message = errorText(message);
  let node = $('#toast');
  if (!node) {
    node = el('div', { id: 'toast', role: 'status' });
    (globalThis.__neoSurface || document.body).append(node);
  }
  const panel = error && (surface().activeElement?.closest('dialog[open], .action-popover:popover-open') ||
    $('dialog[open]') || $('.action-popover:popover-open'));
  node.className = (error ? 'error' : '') + (panel ? ' inline-toast' : '');
  node.setAttribute('role', error ? 'alert' : 'status');
  if (panel) {
    const body = panel.querySelector(':scope > .dialog-body') || panel;
    body.insertBefore(node, body.querySelector(':scope > footer'));
  } else (globalThis.__neoSurface || document.body).append(node);
  node.replaceChildren(
    ...[
      el('span', {}, message),
      undo ? button('Undo', task(async()=>{node.hidden=true;await undo();})) : null,
      details?.length ? button('Details', () => modal('Skipped tabs',
        el('ul', {}, details.map(detail => el('li', {}, detail))))) : null,
      button('Dismiss', () => (node.hidden = true), { glyph: 'close', quiet: true }),
    ].filter(Boolean),
  );
  node.hidden = false;
  if (panel && panel.matches('.action-popover')) {
    panel.style.maxHeight = 'calc(100dvh - 24px)';
    panel.style.overflowY = 'auto';
    const bounds = panel.getBoundingClientRect();
    if (bounds.bottom > innerHeight - 12)
      panel.style.top = Math.max(12, innerHeight - bounds.height - 12) + 'px';
  }
  clearTimeout(node._timer);
  let remaining=duration,started=Date.now(),paused=false;
  const resume=()=>{clearTimeout(node._timer);if(error||!duration||node.matches(':hover')||node.contains(surface().activeElement))return;paused=false;started=Date.now();node._timer=setTimeout(()=>{if(node.matches(':hover')||node.contains(surface().activeElement)){pause();return;}node.hidden=true;},remaining);};
  const pause=()=>{if(paused)return;paused=true;clearTimeout(node._timer);remaining=Math.max(0,remaining-(Date.now()-started));};
  node._toastEvents?.abort();
  node._toastEvents=new AbortController();
  const options={signal:node._toastEvents.signal};
  node.addEventListener('mouseenter',pause,options);
  node.addEventListener('mouseleave',resume,options);
  node.addEventListener('focusin',pause,options);
  node.addEventListener('focusout',()=>queueMicrotask(resume),options);
  resume();
}
export function task(fn) {
  return async (event) => {
    try {
      await fn(event);
    } catch (error) {
      toast(errorText(error), { error: true });
    }
  };
}
export async function currentWindow() {
  if (globalThis.__neoOverlayContext) return globalThis.__neoOverlayContext.windowId;
  const source = Number(new URLSearchParams(location.search).get('window'));
  if (source > 0) {
    try {
      const w = await chrome.windows.get(source);
      if (w.type === 'normal' && !w.incognito) return w.id;
    } catch {}
  }
  const tab = await chrome.tabs.getCurrent();
  if (tab) {
    const w = await chrome.windows.get(tab.windowId);
    if (w.type === 'normal') return w.id;
  }
  return (await chrome.windows.getLastFocused({ windowTypes: ['normal'] })).id;
}
export function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = el('a', { href: url, download: name.replace(/[<>:"/\\|?*]/g, '_') });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function field(label, input) {
  return el('label', { class: 'field' }, el('span', {}, label), input);
}
// Preserve the focused control and unfinished text when live tab events redraw a list.
export function retainFocus(root) {
  const previous = surface().activeElement;
  if (!root?.contains(previous)) return () => {};
  const key = previous.dataset.focusKey;
  if (!key) return () => {};
  const editing = /^(INPUT|TEXTAREA)$/.test(previous.tagName),
    value = previous.value;
  const start = previous.selectionStart,
    end = previous.selectionEnd;
  return () => {
    const next = [...root.querySelectorAll('[data-focus-key]')].find(
      (node) => node.dataset.focusKey === key,
    );
    if (!next) return;
    if (editing) next.value = value;
    next.focus({ preventScroll: true });
    if (start !== null && start !== undefined) next.setSelectionRange?.(start, end);
  };
}
export function modal(title, body, actions = []) {
  const previous = surface().activeElement,
    old = $('#dialog');
  // Close events are queued. A new element prevents an old dialog's event from
  // cancelling the next step (for example review → running → AI plan).
  if (old) {
    if (old.open) old.close();
    old.remove();
  }
  const dlg = el('dialog', { id: 'dialog' }),
    close = () => dlg.close();
  dlg.append(
    ...[
      el(
        'header',
        { class: 'dialog-head' },
        el('h2', {}, title),
        button('Close', close, { glyph: 'close', quiet: true }),
      ),
      el('div', { class: 'dialog-body' }, body),
      actions.length ? el('footer', {}, actions) : null,
    ].filter(Boolean),
  );
  dlg.addEventListener(
    'close',
    () => {
      dlg.remove();
      if (previous?.isConnected) previous.focus();
    },
    { once: true },
  );
  (globalThis.__neoSurface || document.body).append(dlg);
  dlg.showModal();
  return { dialog: dlg, close };
}
export function popover(
  title,
  body,
  actions = [],
  { anchor: trigger = surface().activeElement, menu = false } = {},
) {
  $('#action-popover')?.remove();
  const anchor = trigger?.getBoundingClientRect();
  const panel = el(
    'div',
    {
      id: 'action-popover',
      popover: 'auto',
      role: menu ? 'menu' : 'dialog',
      'aria-label': title,
      class: 'action-popover' + (menu ? ' action-menu' : ''),
    },
    menu ? null : el('h2', {}, title),
    body,
    actions.length ? el('footer', {}, actions) : null,
  );
  const close = () => {
    panel.hidePopover();
    panel.remove();
    trigger?.setAttribute('aria-expanded', 'false');
  };
  (globalThis.__neoSurface || document.body).append(panel);
  panel.style.left =
    Math.max(12, Math.min(innerWidth - 342, anchor?.left || (innerWidth - 330) / 2)) + 'px';
  panel.style.top = Math.max(12, Math.min(innerHeight - 290, (anchor?.bottom || 80) + 8)) + 'px';
  panel.showPopover();
  const bounds = panel.getBoundingClientRect();
  panel.style.left =
    Math.max(
      12,
      Math.min(
        innerWidth - bounds.width - 12,
        (menu && anchor ? anchor.right - bounds.width : anchor?.left) ||
          (innerWidth - bounds.width) / 2,
      ),
    ) + 'px';
  panel.style.top =
    Math.max(12, Math.min(innerHeight - bounds.height - 12, (anchor?.bottom || 80) + 6)) + 'px';
  const switcher = $('.task-view');
  if (switcher && !menu) {
    const area = switcher.getBoundingClientRect();
    panel.classList.add('switcher-dialog');
    panel.style.left = Math.max(12, Math.min(innerWidth - bounds.width - 12,
      area.left + (area.width - bounds.width) / 2)) + 'px';
    panel.style.top = Math.max(12, Math.min(innerHeight - bounds.height - 12,
      area.top + (area.height - bounds.height) / 2)) + 'px';
    panel.querySelector('input:not(:disabled),button:not(:disabled)')?.focus({ preventScroll: true });
  }
  if (menu) {
    panel.addEventListener('toggle', (e) => {
      if (e.newState === 'closed') trigger?.setAttribute('aria-expanded', 'false');
    });
    trigger?.setAttribute('aria-haspopup', 'menu');
    trigger?.setAttribute('aria-expanded', 'true');
    for (const item of panel.querySelectorAll('button')) item.setAttribute('role', 'menuitem');
    panel.addEventListener('keydown', (e) => {
      const items = [...panel.querySelectorAll('button:not(:disabled)')];
      const index = items.indexOf(surface().activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        items[
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? items.length - 1
              : (index + (e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
        ]?.focus();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        trigger?.focus();
      }
    });
    panel.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  return { close, dialog: panel };
}

export function menu(title, entries, { anchor, prefix } = {}) {
  const list = el('div', { class: 'menu-items' });
  const { close, dialog } = popover(title, el('div', {}, prefix, list), [], { anchor, menu: true });
  for (const entry of entries) {
    if (!entry) {
      list.append(el('hr'));
      continue;
    }
    const [label, run, glyph, disabled = false] = entry;
    const item = button(
      label,
      task(async () => {
        close();
        await run();
      }),
      { glyph, className: label.startsWith('Delete') || label === 'Remove' ? 'danger' : '' },
    );
    item.disabled = disabled;
    item.setAttribute('role', 'menuitem');
    list.append(item);
  }
  const rect = dialog.getBoundingClientRect(),
    a = anchor?.getBoundingClientRect();
  dialog.style.top =
    Math.max(
      12,
      Math.min(innerHeight - rect.height - 12, (a?.bottom || parseFloat(dialog.style.top) - 6) + 6),
    ) + 'px';
  (list.querySelector('button:not(:disabled)') || dialog.querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
  return { close, dialog };
}

// Hover/focus previews are hoverable and dismissible; clicking pins the note.
let dismissNote;
export function noteButton(title, note) {
  let panel,
    pinned = false,
    timer;
  const trigger = button(
    'Read note for ' + title,
    () => {
      if (pinned) hide();
      else {
        show();
        pinned = true;
      }
    },
    { glyph: 'note', quiet: true, className: 'note-button' },
  );
  trigger.title = note;
  const cancelHide = () => clearTimeout(timer);
  const scheduleHide = () => {
    cancelHide();
    if (!pinned)
      timer = setTimeout(() => {
        if (
          !panel?.matches(':hover') &&
          surface().activeElement !== trigger &&
          !panel?.contains(surface().activeElement)
        )
          hide();
      }, 180);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      hide();
    }
  };
  function hide() {
    cancelHide();
    panel?.remove();
    panel = null;
    pinned = false;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-describedby');
    surface().removeEventListener('keydown', onKey, true);
    if (dismissNote === hide) dismissNote = null;
  }
  function show() {
    cancelHide();
    if (panel) return;
    dismissNote?.();
    dismissNote = hide;
    const id = 'note-' + crypto.randomUUID();
    panel = el(
      'aside',
      { id, class: 'note-preview', popover: 'auto', 'aria-label': 'Note for ' + title },
      el(
        'header',
        {},
        el('strong', {}, title),
        button('Close note', hide, { glyph: 'close', quiet: true }),
      ),
      el('div', { class: 'note-content' }, note),
    );
    (globalThis.__neoSurface || document.body).append(panel);
    const bounds = trigger.getBoundingClientRect();
    panel.style.left = Math.max(12, Math.min(innerWidth - 360, bounds.right - 340)) + 'px';
    panel.style.top = Math.max(12, Math.min(innerHeight - 260, bounds.bottom + 6)) + 'px';
    panel.addEventListener('pointerenter', cancelHide);
    panel.addEventListener('pointerleave', scheduleHide);
    panel.addEventListener('focusout', scheduleHide);
    panel.addEventListener('toggle', () => {
      if (panel && !panel.matches(':popover-open')) hide();
    });
    panel.showPopover();
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-describedby', id);
    surface().addEventListener('keydown', onKey, true);
  }
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('pointerenter', show);
  trigger.addEventListener('pointerleave', scheduleHide);
  trigger.addEventListener('focus', show);
  trigger.addEventListener('blur', scheduleHide);
  return trigger;
}

// Shared identity and spacing for collection destinations and search results.
export function styleCollectionChoice(node, collection) {
  node.classList.add('collection-choice');
  node.style.setProperty(
    '--collection-color',
    colorHex(collection.color),
  );
  node.prepend(el('span', { class: 'collection-color', 'aria-hidden': 'true' }));
  if (collection.pinned) node.append(icon('pin'));
  return node;
}
export function collectionChoice(collection, onChoose, { detail, ...options } = {}) {
  const row = button(collection.name, onChoose, options);
  row.replaceChildren(
    el(
      'span',
      { class: 'collection-copy' },
      el('span', { class: 'collection-name switch-name' }, collection.name),
      el(
        'small',
        { class: 'collection-detail switch-detail' },
        detail ?? `${collection.links.length} ${collection.links.length === 1 ? 'tab' : 'tabs'}`,
      ),
    ),
  );
  return styleCollectionChoice(row, collection);
}

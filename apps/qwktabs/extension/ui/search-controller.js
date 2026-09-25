import { orderedCollections } from '../lib/collection-workflow.js';

import {
  el,
  button,
  icon,
  rpc,
  task,
  toast,
  revealResult,
  styleCollectionChoice,
} from './shared.js';
import { COMMANDS, parseQuery, searchResources } from '../lib/search.js';

export function createSearchController({
  input,
  results,
  scope,
  getData,
  windowId,
  actions,
  onNavigate = () => {},
  onDismiss = () => {},
  visualSearch = null,
  escapeDismiss = false,
  onHistory = null,
  onModeChange = () => {},
}) {
  let chipId = null,
    choices = [],
    activeKey = null,
    pendingCommand = null,
    historyMode = false;
  let closed = [],
    closedLoaded = false,
    generation = 0,
    destroyed = false;
  const id = 'search-' + crypto.randomUUID();
  results.id ||= id + '-results';
  results.setAttribute('role', 'listbox');
  results.setAttribute('aria-label', 'Search results');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', results.id);
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-label', 'Search tabs and collections');
  input.placeholder = 'Search, @collection, or /command…';

  function setActive(index, { scroll = false } = {}) {
    if (!choices.length) {
      activeKey = null;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    index = Math.max(0, Math.min(index, choices.length - 1));
    activeKey = choices[index].key;
    [...results.querySelectorAll('[role=option]')].forEach((node, i) => {
      node.setAttribute('aria-selected', String(i === index));
      if (i === index) {
        input.setAttribute('aria-activedescendant', node.id);
        if (scroll) revealResult(results, node);
      }
    });
  }
  async function run(choice) {
    try {
      await choice.run();
    } catch (error) {
      toast(error.message, { error: true });
    }
  }
  function rows(items) {
    results.className = 'search-results';
    if (items.length && items.every((item) => item.collection || item.type === 'collection'))
      results.classList.add('collection-choices');
    choices = items;
    results.replaceChildren(
      ...items.map((item, i) => {
        const row = el(
          'div',
          {
            id: `${id}-option-${i}`,
            role: 'option',
            class: 'search-result',
            'aria-selected': 'false',
            onmousedown: (event) => event.preventDefault(),
            onclick: () => run(item),
          },
          item.icon ? icon(item.icon) : null,
          el(
            'span',
            { class: 'row-title' },
            item.title,
            item.subtitle ? el('small', {}, item.subtitle) : null,
          ),
          el('span', { class: 'badge' }, item.verb || 'Choose'),
        );
        const collection =
          item.collection ||
          (item.type === 'collection' && getData().state.collections.find((c) => c.id === item.id));
        return collection ? styleCollectionChoice(row, collection) : row;
      }),
    );
    if (!items.length) results.append(el('p', { class: 'empty' }, 'No matching pages.'));
    input.setAttribute('aria-expanded', String(!!items.length));
    setActive(
      Math.max(
        0,
        items.findIndex((item) => item.key === activeKey),
      ),
    );
  }
  function selectContext(c, query = '') {
    chipId = c.id;
    input.value = query;
    if (pendingCommand) {
      const command = pendingCommand;
      pendingCommand = null;
      return invoke(command, c);
    }
    render();
    input.focus();
  }
  function invoke(command, c) {
    const handlers = {
      save: actions.save,
      'save-close': actions.stash,
      open: actions.resume,
      switch: actions.switch,
      note: actions.note,
      export: actions.export,
      organize: actions.ai,
      recovery: actions.recovery,
      settings: actions.settings,
      import: actions.import,
    };
    if (command === 'history') {
      if (onHistory) {
        input.value = '';
        onHistory();
        return;
      }
      historyMode = true;
      chipId = c?.id || chipId;
      input.value = '';
      render();
      ensureClosed();
      return;
    }
    const definition = COMMANDS.find((x) => x.id === command);
    if (definition?.context && !c) {
      pendingCommand = command;
      input.value = '';
      render();
      input.focus();
      return;
    }
    if (!handlers[command]) throw new Error('Unknown command.');
    return handlers[command](c);
  }
  function contextRows(query) {
    const list = orderedCollections(getData().state.collections).filter((c) =>
      c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
    rows(
      list.slice(0, 80).map((c) => ({
        key: 'scope:' + c.id,
        title: c.name,
        collection: c,
        subtitle: `${c.links.length} links`,
        verb: pendingCommand ? 'Choose' : 'Search in',
        run: () => selectContext(c),
      })),
    );
  }
  function chips(parsed) {
    const c = parsed.context || getData().state.collections.find((c) => c.id === chipId);
    const parts = [];
    if (c)
      parts.push(
        button(
          `${c.name} ×`,
          () => {
            chipId = null;
            if (input.value.trimStart().startsWith('@')) input.value = parsed.query || '';
            render();
            input.focus();
          },
          { className: 'scope-chip' },
        ),
      );
    if (pendingCommand)
      parts.push(
        button(
          `${COMMANDS.find((c) => c.id === pendingCommand)?.title} ×`,
          () => {
            pendingCommand = null;
            render();
            input.focus();
          },
          { className: 'scope-chip' },
        ),
      );
    if (c && !pendingCommand && !historyMode && parsed.mode !== 'commands') {
      const currentSession = getData().sessionState?.active?.[windowId]?.collectionId === c.id;
      parts.push(
        button('Open collection', () => actions.resume(c), {
          glyph: 'external',
          title: 'Open collection: add its saved tabs to this window',
        }),
      );
      parts.push(
        button(
          currentSession ? 'Close current collection' : 'Switch to collection',
          task(() => (currentSession ? actions.closeCollection(c) : actions.swap(c))),
          {
            glyph: currentSession ? 'close' : 'arrow',
            title: currentSession
              ? 'Save and close this collection’s tabs. Pinned tabs stay open.'
              : 'Make this collection current in this window; choose whether to save the current tabs',
          },
        ),
      );
    }
    if (c && actions.versions && !pendingCommand && !historyMode && parsed.mode !== 'commands')
      parts.push(
        button(
          'Version history',
          task(() => actions.versions(c)),
          { glyph: 'history' },
        ),
      );
    if (historyMode && parsed.mode !== 'commands')
      parts.push(
        button(
          'Closed pages ×',
          () => {
            historyMode = false;
            render();
            input.focus();
          },
          { className: 'scope-chip' },
        ),
      );
    scope.hidden = !parts.length;
    scope.replaceChildren(...parts);
  }
  function choiceFor(item) {
    return {
      ...item,
      run: async () => {
        if (item.type === 'collection') {
          selectContext(getData().state.collections.find((c) => c.id === item.id));
          return;
        }
        if (item.type === 'tab') await rpc('activate', { tabId: item.id });
        if (item.type === 'session') await rpc('restore-session', { sessionId: item.id });
        if (item.type === 'closed') await rpc('restore-closed', { id: item.id, windowId });
        if (item.type === 'link') {
          await rpc('open-link', {
            collectionId: item.collectionId,
            linkId: item.id,
            windowId,
          });
        }
        onNavigate();
      },
    };
  }
  async function ensureClosed() {
    if (closedLoaded) return;
    closedLoaded = true;
    const token = ++generation;
    try {
      const records = await rpc('closed-records');
      if (token === generation && !destroyed) {
        closed = records;
        render();
      }
    } catch (error) {
      if (token === generation && !destroyed) {
        closedLoaded = false;
        toast(error.message, { error: true });
      }
    }
  }
  function render() {
    const data = getData();
    if (!data || destroyed) return;
    if (chipId && !data.state.collections.some((c) => c.id === chipId)) chipId = null;
    const parsed = parseQuery(input.value, data.state.collections, chipId);
    onModeChange(parsed);
    chips(parsed);
    if (pendingCommand) {
      contextRows(input.value.trim());
      return;
    }
    if (parsed.mode === 'contexts') {
      contextRows(parsed.contextPartial);
      return;
    }
    if (parsed.mode === 'commands') {
      results.className = 'search-results';
      const matching = COMMANDS.filter(
        (c) =>
          c.id.startsWith(parsed.command) || c.title.toLocaleLowerCase().includes(parsed.command),
      );
      if (parsed.contextPartial !== undefined) {
        const command = COMMANDS.find((c) => c.id === parsed.command);
        if (command) {
          rows(
            data.state.collections
              .filter((c) =>
                c.name.toLocaleLowerCase().includes(parsed.contextPartial.toLocaleLowerCase()),
              )
              .slice(0, 80)
              .map((c) => ({
                key: 'scope:' + c.id,
                title: c.name,
                collection: c,
                subtitle: command.title,
                verb: 'Choose',
                run: () => {
                  chipId = c.id;
                  input.value = '';
                  return invoke(command.id, c);
                },
              })),
          );
          return;
        }
      }
      rows(
        matching.map((c) => ({
          key: 'command:' + c.id,
          title: c.title,
          subtitle: parsed.context ? parsed.context.name : c.detail,
          verb: 'Choose',
          run: () => invoke(c.id, parsed.context),
        })),
      );
      return;
    }
    if (visualSearch && !parsed.context && !historyMode) {
      choices = [];
      input.removeAttribute('aria-activedescendant');
      visualSearch(parsed.query);
      return;
    }
    results.className = 'search-results';
    let found = searchResources(
      { ...data, closed },
      parsed.query,
      parsed.context?.id,
      windowId,
      historyMode ? 200 : 40,
    );
    if (historyMode) {
      // Empty closed search still offers recent records, unlike the broad idle view.
      if (!parsed.query && !parsed.context)
        found = [
          ...data.recent.map((t) => ({
            key: 'session:' + t.sessionId,
            type: 'session',
            id: t.sessionId,
            title: t.title || t.url,
            subtitle: 'Recently closed',
            verb: 'Restore',
          })),
          ...closed.map((r) => ({
            key: 'closed:' + r.id,
            type: 'closed',
            id: r.id,
            title: r.title,
            subtitle: 'Retained closed page',
            verb: 'Restore',
          })),
        ];
      else found = found.filter((r) => r.type === 'session' || r.type === 'closed');
    }
    const items = found.slice(0, 40).map(choiceFor);
    if (parsed.query || historyMode) ensureClosed();
    if (parsed.query && !parsed.context && chrome.permissions)
      items.push({
        key: 'native-history',
        title: 'Search browser history',
        subtitle: 'Optional browser permission',
        verb: 'Search',
        run: async () => {
          if (!(await chrome.permissions.request({ permissions: ['history'] }))) return;
          const response = await rpc('history', { query: parsed.query });
          rows(
            response.map((record) => ({
              key: 'history:' + record.id,
              title: record.title || record.url,
              subtitle: record.url,
              verb: 'Open',
              run: async () => {
                await rpc('open-url', { url: record.url, windowId });
                onNavigate();
              },
            })),
          );
        },
      });
    rows(items);
  }
  const onInput = () => {
    activeKey = null;
    render();
  };
  const onKey = (event) => {
    if (event.isComposing) return;
    if (
      visualSearch &&
      !choices.length &&
      !scope.children.length &&
      !input.value.trimStart().match(/^[@/]/)
    )
      return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const index = choices.findIndex((c) => c.key === activeKey);
      setActive(index + (event.key === 'ArrowDown' ? 1 : -1), { scroll: true });
    } else if (event.key === 'Enter') {
      if (choices.length) {
        event.preventDefault();
        run(choices.find((c) => c.key === activeKey) || choices[0]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (escapeDismiss) {
        onDismiss();
        return;
      }
      if (input.value) {
        input.value = '';
        activeKey = null;
        render();
      } else if (pendingCommand) {
        pendingCommand = null;
        render();
      } else if (chipId || historyMode) {
        chipId = null;
        historyMode = false;
        render();
      } else onDismiss();
    }
  };
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKey);
  render();
  return {
    render,
    update: () => {
      generation++;
      closedLoaded = false;
      render();
    },
    focus: () => input.focus(),
    destroy: () => {
      destroyed = true;
      generation++;
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKey);
    },
    resetContext: () => {
      chipId = null;
      pendingCommand = null;
      historyMode = false;
      render();
    },
    setContext: (id) => {
      chipId = id;
      render();
    },
  };
}

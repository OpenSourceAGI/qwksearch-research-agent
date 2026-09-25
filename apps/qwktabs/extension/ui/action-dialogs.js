import { orderedCollections } from '../lib/collection-workflow.js';
import { countLabel, operationStatus } from '../lib/messages.js';
import { PROVIDERS, providerEndpoint, aiConnectionId } from '../lib/providers.js';

import {
  $,
  el,
  button,
  toast,
  task,
  rpc,
  modal,
  popover,
  field,
  download,
  favicon,
  domain,
  collectionChoice,
} from './shared.js';
import { uid, newCollection, safeURL } from '../lib/model.js';
import {
  parseImport,
  importBookmarkTree,
  jsonExport,
  backupExport,
  markdownExport,
  htmlExport,
} from '../lib/portable.js';
import { endpointOrigin } from '../lib/integrations.js';
import { linkPicker } from './link-picker.js';

export function createActionDialogs({ getData, windowId, getTabIds, change, onOpen = () => {}, inLibrary = false, onQuickStart }) {
  const data = new Proxy({}, { get: (_, key) => getData()[key] });
  const win = windowId,
    selectedIds = getTabIds,
    act = (fn) => task(fn);
  function saveTo(context, { closeTabs = data.state.settings.closeAfterStash } = {}) {
    const ids = selectedIds().filter((id) => data.tabs.some((t) => t.id === id && !t.pinned));
    if (!ids.length) return toast('Select an unpinned tab', { error: true });
    const check = el('input', { type: 'checkbox', checked: closeTabs });
    const adopt = el('input', {type:'checkbox', checked:false, 'aria-label':'and switch to new collection'});
    const windowIds=data.tabs.filter(t=>t.windowId===win&&!t.pinned).map(t=>t.id);
    const canAdopt=ids.length===windowIds.length&&ids.every(id=>windowIds.includes(id));
    adopt.disabled=!canAdopt;
    const save = button(
      'Save tabs',
      act(async () => {
        save.disabled = true;
        try {
          await change('save', {
            tabIds: ids,
            windowId:win, minimal:true, adopt:adopt.checked,
            close: check.checked,
          });
          close();
        } finally {
          save.disabled = false;
        }
      }),
      { className: 'primary' },
    );
    const label = () => {
      save.textContent = check.checked ? 'Stash tabs' : 'Save tabs';
      save.title = save.textContent;
      save.setAttribute('aria-label', save.textContent);
    };
    check.onchange = () => {if(check.checked)adopt.checked=false;label();};
    adopt.onchange = () => {if(adopt.checked)check.checked=false;label();};
    label();
    const { close } = popover(
      `Save ${countLabel(ids.length, 'tab')}`,
      el(
        'div',
        {},
        el('label', { class: 'check-label' }, check, 'and close them'),
        el('label', { class: 'check-label', title:canAdopt?'':'Select all unpinned tabs in this window to switch to the new collection.' }, adopt, 'and switch to new collection'),
      ),
      [save, button('Cancel', () => close())],
    );
  }
  let groupingBusy=false;
  const groupingIds=(include=true)=>selectedIds().filter(id=>data.tabs.some(t=>t.id===id&&t.windowId===win&&!t.pinned&&(include||t.groupId<0)));
  function topicOptions(title,run){
    if(groupingBusy)return;
    if(!data.connections.ai){settingsDetails('AI connection');return;}
    const include=el('input',{type:'checkbox',checked:data.state.settings.regroupExisting!==false,'aria-label':'Include already grouped tabs'});
    const apply=button('Organise by topic',act(async()=>{
      apply.disabled=true;
      try{
        const granted=globalThis.__neoSurface
          ? await rpc('ai-connection-access')
          : await chrome.permissions.request({origins:[endpointOrigin(providerEndpoint(data.state.settings))+'/*']});
        if(!granted){
          if(globalThis.__neoSurface){close();settingsDetails('AI connection');}
          return;
        }
        if(include.checked!==(data.state.settings.regroupExisting!==false))await change('settings',{settings:{regroupExisting:include.checked}});
        close();await run(include.checked);
      }finally{apply.disabled=false;}
    }),{className:'primary topic-apply'});
    const {close}=modal(title,el('div',{},el('label',{class:'check-label'},include,'Include already grouped tabs'),el('p',{class:'hint'},'Uncheck to keep existing groups')),[button('Cancel',()=>close()),apply]);
  }
  function groupCollection(c) {
    const include = el('input', {type:'checkbox', checked:data.state.settings.regroupExisting!==false});
    const {close} = popover('Group & sort', el('div', {},
      el('p', {class:'hint'}, 'Group by website. Sort A–Z, with ungrouped tabs first.'),
      el('label', {class:'check-label'}, include, 'Include already grouped tabs')),
      [button('Cancel', () => close()), button('Group & sort', act(async () => {
        close();
        await change('collection-group-sort', {collectionId:c.id, regroupExisting:include.checked});
      }), {className:'primary'})]);
  }
  function aiTabs(){return topicOptions('Group open tabs by topic',runTopicTabs);}
  async function runTopicTabs(regroupExisting){
    if(groupingBusy)return;
    if(!data.connections.ai){settingsDetails('AI connection');return;}
    groupingBusy=true;const requestId=uid();let cancelled=false;
    const progress=el('span',{},'Grouping by topic…');
    const cancel=button('Cancel',()=>{cancelled=true;rpc('ai-cancel',{requestId});progress.textContent='Cancelling…';});
    toast(el('span',{class:'grouping-progress'},progress,cancel),{duration:0});
    try {await change('group-topic',{windowId:win,tabIds:groupingIds(),regroupExisting,requestId});}
    catch(error){toast(cancelled?'Grouping cancelled':error.message,{error:!cancelled});}
    finally{groupingBusy=false;}
  }
  async function groupSort(options={}){if(groupingBusy)return;groupingBusy=true;try{return await change('group-sort',{windowId:win,tabIds:groupingIds(),...options});}finally{groupingBusy=false;}}
  const opening = new Set();
  async function resumeDialog(c, { target = 'current', linkIds } = {}) {
    if (!c?.links.length || (linkIds && !linkIds.length)) return toast('No saved tabs to open');
    const key = c.id + ':' + target;
    if (opening.has(key)) return;
    opening.add(key);
    try {
      const job = await rpc('resume-start', {
        collectionId: c.id,
        linkIds,
        target,
        windowId: win,
        deferred: true,
      });
      toast(`Opening ${countLabel(job.total, 'tab')}…`);
      clearTimeout($('#toast')?._timer);
      const cancel = button('Cancel', () => rpc('cancel-operation', { id: job.id }), {
        quiet: false,
      });
      $('#toast')?.append(cancel);
      const result = await rpc('resume-run', { id: job.id });
      cancel.remove();
      toast(
        `Opened ${countLabel(result.created.length, 'tab')}` +
          (result.cancelled ? ' · Cancelled' : '') +
          (result.failed.length ? ` · ${result.failed.length} failed` : '') +
          (result.groupFailures.length ? ' · Groups not fully restored' : ''),
        { error: !!result.failed.length || !!result.groupFailures.length },
      );
      onOpen();
      if (result.focusTabId) await rpc('activate', { tabId: result.focusTabId });
      else if (result.focusFirst && result.created[0])
        await rpc('activate', { tabId: result.created[0] });
    } catch (e) {
      toast(e.message, { error: true });
    } finally {
      opening.delete(key);
    }
  }
  let swapping = false;
  async function closeCollection(collection) {
    if (!collection || swapping) return;
    swapping = true;
    try {
      return await change('close-collection', { collectionId: collection.id, windowId: win });
    } finally {
      swapping = false;
    }
  }
  async function performSwap(collection, {working = collection.autoUpdate !== false, outgoing = 'keep', expectedSourceId} = {}) {
    if (!collection || swapping) return;
    swapping = true;
    try {
      if (working) await change('edit', {kind:'collection', collectionId:collection.id, autoUpdate:true});
      const result = await change('switch', {
        destinationId: collection.id,
        windowId: win,
        outgoing, expectedSourceId,
        tracking: working,
        requestId: uid(),
        focusPage: !!globalThis.__neoOverlayContext,
      });
      if (result?.status === 'partial' || result?.cancelled || result?.failed?.length)
        throw new Error('Switch incomplete. Check Timeline.');
      onOpen();
      return result;
    } finally {
      swapping = false;
    }
  }
  function outgoingOption() {
    const source=data.state.collections.find(c=>c.id===data.sessionState?.active?.[win]?.collectionId);
    const label=source?'Update “'+source.name+'” with current tabs':'Save current tabs as a new collection';
    const check=el('input',{type:'checkbox',checked:false,'aria-label':label});
    const payload=()=>({outgoing:check.checked?(source?'update':'new'):'keep',expectedSourceId:source?.id||null});
    return {check,label,payload};
  }
  function swapCollection(collection, { working = collection?.autoUpdate !== false } = {}) {
    if (!collection || swapping) return;
    const option=outgoingOption();
    const confirm = button('Switch to collection', act(async () => {
      confirm.disabled = true;
      try {
        await performSwap(collection, { working, ...option.payload() });
        close();
      } finally { confirm.disabled = false; }
    }), { className: 'primary' });
    const { close } = modal('Switch to ' + collection.name + '?', el('div', {},
      el('label', { class: 'check-label' }, option.check, option.label),
    ), [button('Cancel', () => close()), confirm]);
  }
  function switchDialog() {
    const trigger = globalThis.__neoSurface?.activeElement || document.activeElement;
    const ids = data.tabs.filter((t) => t.windowId === win && !t.pinned).map((t) => t.id);
    let running = false,
      requestId;
    const search = el('input', {
      type: 'search',
      placeholder: 'Search collections…',
      'aria-label': 'Search collections',
    });
    const option=outgoingOption(),saveCurrent=option.check;
    saveCurrent.disabled=!ids.length;
    const list = el('div', {
      class: 'switch-choices collection-choices',
      'aria-label': 'Collections',
    });
    const status = el('p', { class: 'hint', role: 'status' });
    const retained = (data.sessionState?.retained || []).filter((x) => x.key.startsWith(win + ':'));
    const collections = [
      ...orderedCollections(data.state.collections),
      ...retained.filter((x) => !data.state.collections.some((c) => c.id === x.id)),
    ];
    function render() {
      const query = search.value.trim().toLocaleLowerCase();
      const matches = collections.filter((x) => x.name.toLocaleLowerCase().includes(query));
      list.replaceChildren(
        ...matches.map((collection) => {
          const space = data.state.spaces?.find((x) => x.id === collection.spaceId)?.name;
          const choose = collectionChoice(
            collection,
            act(async () => {
              if (running) return;
              running = true;
              requestId = uid();
              search.disabled = saveCurrent.disabled = true;
              for (const row of list.querySelectorAll('button')) row.disabled = true;
              status.textContent = 'Switching to ' + collection.name + '…';
              try {
                const result = await change('switch', {
                  requestId,
                  tabIds: ids,
                  destinationId: collection.id,
                  ...option.payload(),
                  focusPage: !!globalThis.__neoOverlayContext,
                  windowId: win,
                });
                if (
                  result.status === 'partial' ||
                  result.failed?.length ||
                  result.groupFailures?.length ||
                  result.cancelled
                )
                  throw new Error('Switch incomplete. Check Timeline.');
                running = false;
                close();
                onOpen();
              } catch (error) {
                status.textContent = error.message;
              } finally {
                running = false;
                search.disabled = false;
                saveCurrent.disabled = !ids.length;
                for (const row of list.querySelectorAll('button')) row.disabled = false;
              }
            }),
            {
              detail: `${data.sessionState?.active?.[win]?.collectionId === collection.id ? 'Current · ' : retained.some((x) => x.id === collection.id) ? 'Resume · ' : ''}${collection.links.length} tabs${space ? ' · ' + space : ''}`,
            },
          );
          return choose;
        }),
      );
      status.textContent = matches.length
        ? ''
        : collections.length
          ? 'No matching collections.'
          : 'No saved collections with tabs yet.';
    }
    search.oninput = render;
    render();
    const { close, dialog } = popover(
      'Switch collection',
      el(
        'div',
        { class: 'switch-picker' },
        search,
        el('label', { class: 'check-label' }, saveCurrent, option.label),
        el(
          'p',
          { class: 'hint switch-explanation' },
          'Timeline is saved automatically. Pinned tabs stay open.',
        ),
        list,
        status,
      ),
      [
        button('Cancel', () => {
          close();
        }),
      ],
    );
    dialog.addEventListener('toggle', (e) => {
      if (e.newState === 'closed' && running)
        rpc('cancel-operation', { id: requestId }).catch(() => {});
    });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        trigger?.focus();
        return;
      }
      if (running) return;
      const rows = [...list.querySelectorAll('button')];
      const index = rows.indexOf(e.target);
      if ((e.target === search || index >= 0) && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowUp' && index <= 0) search.focus();
        else rows[Math.min(rows.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1))]?.focus();
      } else if ((e.target === search || index >= 0) && e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        e.stopPropagation();
        rows[Math.max(0, index)]?.click();
      }
    });
    search.focus({ preventScroll: true });
  }
  function importDialog() {
    const input = el('input', { type: 'file', hidden:true, 'aria-label':'Import file', accept: '.json,.html,.htm,.md,.markdown,.txt' });
    input.onchange = act(async () => {
      const f = input.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) throw new Error('Choose a file under 20 MB');
      previewImport(parseImport(await f.text(), f.name));
    });
    focusedDialog(
      'Import data',
      el(
        'div',
        { class: 'transfer-options' },
        button(
          'Import browser bookmarks',
          act(async () => {
            if (!(await chrome.permissions.request({ permissions: ['bookmarks'] }))) return;
            previewImport(importBookmarkTree(await rpc('bookmarks-read')));
          }),
          { glyph: 'library', className: 'transfer-primary' },
        ),
        el(
          'details',
          {},
          el('summary', {}, 'Import from a file'),
          el(
            'p',
            { class: 'hint' },
            'Backup JSON, bookmark HTML, Markdown, Toby JSON or OneTab text.',
          ),
          el('div', {class:'file-picker'}, input, button('Choose file', () => input.click(), {glyph:'plus',className:'dialog-action'})),
        ),
        button('Export & import', backupDialog, {glyph:'arrow',className:'transfer-switch'}),
      ),
    );
  }

  function previewImport(result) {
    const preferences = el('input', { type: 'checkbox' });
    const { close } = modal(
      'Review import',
      el(
        'div',
        {},
        el(
          'p',
          {},
          `${result.collections.length} collections · ${result.links} links${result.skipped ? ` · ${result.skipped} unsupported links skipped` : ''}`,
        ),
        el(
          'div',
          { class: 'review-list' },
          result.collections.map((c) => el('p', {}, `${c.name} · ${c.links.length}`)),
        ),
        el('p', { class: 'hint' }, 'Imported collections are added as separate copies.'),
        result.settings
          ? el(
              'label',
              { class: 'check-label' },
              preferences,
              'Restore saved preferences',
            )
          : null,
        result.settings
          ? el(
              'p',
              { class: 'hint' },
              'Keys and website permissions are not in backups. Automatic preview capture stays off until enabled in Settings. Recovery log entries are imported for reference; old browser actions are never replayed.',
            )
          : null,
      ),
      [
        button(
          'Import collections',
          act(async () => {
            await change('import', {
              collections: result.collections,
              spaces: result.spaces,
              settings: preferences.checked ? result.settings : undefined,
              recovery: result.recovery,
            });
            close();
          }),
          { className: 'primary' },
        ),
      ],
    );
  }
  function exportDialog(c, trigger) {
    const { close, dialog } = popover(
      `Export ${c.name}`,
      el(
        'div',
        {},

        el(
          'div',
          { class: 'export-actions' },
          button('Markdown', () => download(markdownExport([c]), c.name + '.md', 'text/markdown')),
          button('Bookmark HTML', () => download(htmlExport([c]), c.name + '.html', 'text/html')),
          button('JSON', () => download(jsonExport([c]), c.name + '.json', 'application/json')),
          button(
            'Copy Markdown',
            act(async () => {
              await navigator.clipboard.writeText(markdownExport([c]));
              toast('Markdown copied');
            }),
          ),
          button('Send to Notion…', () => notionDialog(c)),
          button(
            'Export to browser bookmarks…',
            act(async () => {
              if (!(await chrome.permissions.request({ permissions: ['bookmarks'] }))) return;
              const tree = await rpc('bookmarks-read');
              const select = el('select');
              function folders(n, depth = 0) {
                if (!n.url && n.id !== '0')
                  select.append(el('option', { value: n.id }, '— '.repeat(depth) + n.title));
                for (const child of n.children || []) if (!child.url) folders(child, depth + 1);
              }
              tree.forEach((n) => folders(n));
              const { close } = popover(
                'Export browser bookmarks',
                field('Create a new group inside', select),
                [
                  button(
                    'Create bookmarks',
                    act(async () => {
                      await change('bookmarks-export', {
                        collectionId: c.id,
                        parentId: select.value,
                      });
                      close();
                    }),
                    { className: 'primary' },
                  ),
                ],
              );
            }),
          ),
        ),
      ),
      [],
      { menu: true, anchor: trigger },
    );
    dialog.addEventListener('click', (e) => {
      if (e.target.closest('button')) close();
    });
  }
  function notionDialog(c) {
    const parent = el('input', {
      value: data.state.settings.notionParent,
      placeholder: 'Destination page ID',
    });
    const { close } = modal(
      c ? 'Send a snapshot to Notion' : 'Export collections to Notion',
      el(
        'div',
        {},
        el(
          'p',
          {},
          c
            ? `Create a new page containing ${c.links.length} links and notes. People with access to the parent page may see this content.`
            : `Create ${data.state.collections.length} new pages, one for each collection across all spaces, with its groups, links and notes. Pages are created under your destination page.`,
        ),
        field('Destination page ID', parent),
        el(
          'p',
          { class: 'hint' },
          'Share the parent page with your internal integration first. Configure its token in Settings.',
        ),
      ),
      [
        button(
          c ? 'Create Notion page' : 'Create Notion pages',
          act(async () => {
            if (!(await chrome.permissions.request({ origins: ['https://api.notion.com/*'] })))
              return;
            const result = await rpc(c ? 'notion-export' : 'notion-export-library', {
              collectionId: c?.id,
              parent: parent.value.trim(),
            });
            close();
            runNotion(result);
          }),
          { className: 'primary' },
        ),
      ],
    );
  }
  function runNotion(initial, resume = false) {
    let running = true,
      job = initial;
    const status = el('p', { role: 'status' }),
      link = el('div'),
      progress = el('progress', { max: Math.max(1, job.pageTotal ?? job.total), value: job.pageCursor ?? job.cursor });
    const { dialog, close } = modal(
      'Export to Notion',
      el(
        'div',
        {},
        status,
        progress,
        link,
        el(
          'p',
          { class: 'hint' },
          'You can pause between batches and continue from Recovery. A request already sent may finish after this dialog closes.',
        ),
      ),
      [
        button('Pause', () => {
          running = false;
          close();
        }),
      ],
    );
    dialog.addEventListener(
      'close',
      () => {
        running = false;
      },
      { once: true },
    );
    async function run() {
      try {
        while (running) {
          const progressText = job.pages
            ? `${job.pageCursor} of ${job.pageTotal} pages exported`
            : `${job.cursor} of ${job.total} items sent`;
          status.textContent = progressText;
          progress.value = job.pageCursor ?? job.cursor;
          if (job.pages)
            link.replaceChildren(...job.pages.filter(page => page.remoteURL).map(page =>
              el('p', {}, el('a', { href: page.remoteURL, target: '_blank', rel: 'noreferrer' }, page.name)),
            ));
          else if (job.remoteURL)
            link.replaceChildren(
              el(
                'a',
                { href: job.remoteURL, target: '_blank', rel: 'noreferrer' },
                'Open the Notion page',
              ),
            );
          if (job.status === 'complete') {
            status.textContent = job.pages ? `Exported ${countLabel(job.pageTotal, 'collection')} to Notion` : 'Exported to Notion';
            dialog.querySelector('footer').replaceChildren(button('Done', close));
            return;
          }
          if (!resume && ['partial', 'failed', 'uncertain', 'sending'].includes(job.status)) {
            status.textContent =
              job.error ||
              'Export not confirmed. Check Notion before retrying.';
            dialog.querySelector('footer').replaceChildren(button('Close', close));
            return;
          }
          if (job.retryAt > Date.now()) {
            status.textContent = `${progressText} · waiting for Notion`;
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(1000, job.retryAt - Date.now())),
            );
            continue;
          }
          job = await rpc('notion-step', { id: job.id, resume });
          resume = false;
        }
      } catch (error) {
        if (running) {
          status.textContent = error.message;
          dialog.querySelector('footer').replaceChildren(button('Close', close));
        }
      }
    }
    run();
  }
  function aiSaved(c){return topicOptions('Organise collection with AI',include=>runCollectionAI(c,include));}
  async function runCollectionAI(c,regroupExisting){
    if(groupingBusy)return;
    if(!data.connections.ai){settingsDetails('AI connection');return;}
    const requestId=uid();let cancelled=false;groupingBusy=true;
    toast(el('span',{class:'grouping-progress'},'Organising collection…',button('Cancel',()=>{cancelled=true;rpc('ai-cancel',{requestId});})),{duration:0});
    try {await change('collection-ai',{collectionId:c.id,windowId:win,regroupExisting,requestId});}
    catch(error){toast(cancelled?'Organisation cancelled':error.message,{error:!cancelled});}
    finally{groupingBusy=false;}
  }
  function recoveryDialog() {
    modal(
      'Recovery',
      el(
        'div',
        {},
        el(
          'p',
          { class: 'hint' },
          'Recover saved URLs and groups. Unsaved form or app state cannot be restored. Interrupted actions are never replayed automatically.',
        ),
        data.journal.map((op) =>
          el(
            'div',
            { class: 'recovery-row' },
            el(
              'div',
              { class: 'row' },
              el('strong', {}, op.label),
              el('small', {}, new Date(op.at).toLocaleString()),
            ),
            el(
              'p',
              {},
              op.kind === 'notion'
                ? op.pages ? `${op.pageCursor} / ${op.pageTotal} pages · ${operationStatus(op.status)}` : `${op.cursor} / ${op.total} items · ${operationStatus(op.status)}`
                : operationStatus(op.status),
            ),
            op.error ? el('p', {}, op.error) : null,
            op.kind === 'notion' && ['ready', 'waiting', 'partial', 'failed'].includes(op.status)
              ? button('Continue export', () => runNotion(op, true))
              : null,
            op.kind === 'notion' && ['sending', 'uncertain'].includes(op.status)
              ? el(
                  'p',
                  { class: 'hint' },
                  'Export not confirmed. Check Notion before retrying.',
                )
              : null,
            op.recoverable
              ? button(
                  'Recover pages',
                  act(() => change('recover', { id: op.id, windowId: win })),
                )
              : null,
            op.undoable
              ? button(
                  'Restore earlier collection…',
                  act(() => recoverLibrary(op)),
                )
              : null,
            (op.undoable || op.closed?.length) && op.status !== 'undone'
              ? button(
                  'Undo action',
                  act(() => change('undo-action', { id: op.id, windowId: win })),
                )
              : null,
            op.remoteURL
              ? el('a', { href: op.remoteURL, target: '_blank', rel: 'noreferrer' }, 'Open export')
              : null,
          ),
        ),
      ),
    );
  }
  function focusedDialog(title, body, actions = []) {
    const result = modal(title, body, actions);
    result.dialog.classList.add('settings-detail');
    const focus =
      body.querySelector('input:not([type=file]), select, textarea') ||
      result.dialog.querySelector('h2');
    if (focus.tagName === 'H2') focus.tabIndex = -1;
    focus.focus({ preventScroll: true });
    return result;
  }
  function backupDialog() {
    const { close } = focusedDialog(
      'Export & import',
      el(
        'div',
        { class: 'transfer-options' },
        el(
          'p',
          { class: 'hint' },
          'Backups include collections, settings and recovery history. API keys are excluded.',
        ),
        button(
          'Backup JSON',
          () =>
            download(backupExport(data.state, data.journal), 'backup.json', 'application/json'),
          { glyph: 'tray', className: 'transfer-primary' },
        ),
        el(
            'div',
            { class: 'transfer-formats' },
            button('Bookmark HTML', () =>
              download(htmlExport(data.state.collections), 'bookmarks.html', 'text/html'),
            ),
            button('Markdown', () =>
              download(
                markdownExport(data.state.collections),
                'collections.md',
                'text/markdown',
              ),
            ),
            button('Send to Notion…', () => { close(); notionDialog(); }, { glyph: 'note', disabled: !data.state.collections.length }),
        ),
        button('Import data', importDialog, {glyph:'arrow',className:'transfer-switch'}),
      ),
    );
  }
  function settingsDialog() {
    const s = data.state.settings;
    const allCollapsed = data.state.collections.length > 0 && data.state.collections.every(c => c.collapsed);
    const body = el('div', { class: 'settings-list' });
    let close;
    const row = (label, run, glyph) =>
      button(
        label,
        () => {
          close();
          run();
        },
        { glyph, className: 'settings-entry' },
      );
    const preference = (label, name, options) => {
      const select = el(
        'select',
        { 'aria-label': label },
        options.map(([value, text]) => el('option', { value, selected: s[name] === value }, text)),
      );
      select.onchange = act(async () => {
        select.disabled = true;
        try {
          await change('settings', { settings: { [name]: select.value } });
        } finally {
          select.disabled = false;
        }
      });
      return el('label', { class: 'settings-preference' }, el('span', {}, label), select);
    };
    const toggle = (label, name) => {
      const check = el('input', {
        type: 'checkbox',
        role: 'switch',
        checked: !!s[name],
        'aria-label': label,
      });
      check.onchange = act(async () => {
        const value = check.checked;
        check.disabled = true;
        try {
          if (
            name === 'previewCapture' &&
            value &&
            !(await chrome.permissions.request({ origins: ['<all_urls>'] }))
          ) {
            check.checked = false;
            toast('Preview access not granted');
            return;
          }
          await change('settings', { settings: { [name]: value } });
        } catch (error) {
          check.checked = !value;
          throw error;
        } finally {
          check.disabled = false;
        }
      });
      return el('label', { class: 'settings-preference' }, el('span', {}, label), check);
    };
    body.append(
      preference('Theme', 'theme', [
        ['system', 'System'],
        ['light', 'Light'],
        ['dark', 'Dark'],
      ]),
      ...(!inLibrary ? [toggle('Show this window only', 'currentWindowOnly')] : []),
      toggle('Auto-update all collections', 'autoUpdateDefault'),
      ...(!inLibrary ? [toggle('Auto-group new tabs', 'autoGroup')] : []),

      row(allCollapsed ? 'Expand all collections' : 'Collapse all collections',
        act(() => change('collapse-collections', { collapsed: !allCollapsed })), 'chevron'),
      el('hr'),
      row('AI connection', () => settingsDetails('AI connection'), 'sparkles'),
      row('Notion', () => settingsDetails('Notion'), 'note'),
      row('Open Library in its own window', () => change('library-window',{}), 'external'),
      el('hr'),
      ...(!inLibrary ? [row('Import data', importDialog, 'plus')] : []),
      row('Export & import', backupDialog, 'tray'),
      row('Privacy & permissions', () => settingsDetails('Data & permissions'), 'settings'),
      el('hr'),
      row(
        'Keyboard shortcuts',
        () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }),
        'external',
      ),
      row(
        'Quick start',
        () => onQuickStart ? onQuickStart() : chrome.tabs.create({url:chrome.runtime.getURL('app.html')+'#tour'}),
        'library',
      ),
      row(
        'Help & privacy',
        () => chrome.tabs.create({ url: chrome.runtime.getURL('help.html') }),
        'external',
      ),
    );
    const result = popover('Settings', body);
    close = result.close;
    result.dialog.classList.add('settings-menu');
    // Preserve the original anchor after CSS changes the menu dimensions.
    const bounds = result.dialog.getBoundingClientRect();
    result.dialog.style.left =
      Math.max(12, Math.min(innerWidth - bounds.width - 12, bounds.left)) + 'px';
    result.dialog.style.top =
      Math.max(12, Math.min(innerHeight - bounds.height - 12, bounds.top)) + 'px';
    const trigger = $('#settings');
    trigger?.setAttribute('aria-expanded', 'true');
    result.dialog.addEventListener('toggle', (e) => {
      if (e.newState === 'closed') trigger?.setAttribute('aria-expanded', 'false');
    });
    result.dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        trigger?.focus();
      }
    });
    body.querySelector('select').focus({ preventScroll: true });
  }
  function privacyDialog() {
    const row = (title, description, action) => el('div', {class:'dialog-setting-row'},
      el('div', {class:'dialog-setting-copy'}, el('h3', {}, title), el('p', {class:'hint'}, description)), action);
    const automatic = el('input', {type:'checkbox', role:'switch', checked:!!data.state.settings.previewCapture, 'aria-label':'Automatic page previews'});
    automatic.onchange = act(async()=>{
      const enabled=automatic.checked;
      automatic.disabled=true;
      try {
        if(enabled && !(await chrome.permissions.request({origins:['<all_urls>']}))) {
          automatic.checked=false;
          toast('Preview access not granted');
          return;
        }
        await change('settings',{settings:{previewCapture:enabled}});
      } catch(error) {automatic.checked=!enabled;throw error;}
      finally {automatic.disabled=false;}
    });
    const history = button('Enable', act(async()=>{
      history.disabled=true;
      try {
        const granted=await chrome.permissions.request({permissions:['history']});
        toast(granted?'History search enabled':'History access not granted');
      } finally {await updateHistory();}
    }), {className:'dialog-action'});
    async function updateHistory() {
      const granted=await chrome.permissions.contains({permissions:['history']});
      history.textContent=granted?'Enabled':'Enable';
      history.setAttribute('aria-label',granted?'Browser history enabled':'Enable browser history search');
      history.disabled=granted;
    }
    const revoke = button('Revoke access', act(async()=>{
      revoke.disabled=true;
      try {
        const access=await chrome.permissions.getAll();
        await chrome.permissions.remove({origins:access.origins||[],permissions:(access.permissions||[]).filter(p=>['history','bookmarks'].includes(p))});
        await change('settings',{settings:{previewCapture:false}});
        automatic.checked=false;
        await updateHistory();
        toast('Optional access revoked');
      } finally {revoke.disabled=false;}
    }), {className:'dialog-action danger-action'});
    focusedDialog('Privacy & permissions', el('div', {class:'dialog-settings'},
      row('Automatic page previews', 'Capture the visible active web page while browsing. Images can contain sensitive content; they stay on this device. Requires website access.', el('label',{class:'settings-preference'},automatic)),
      el('p', {class:'hint'}, 'Opening the visual switcher can also capture the current page, even when automatic previews are off.'),
      row('Cached previews', 'Stored on this device · 50 MB limit',
        button('Clear previews', act(async()=>{await change('clear-previews',{});toast('Cached previews cleared');}), {className:'dialog-action'})),
      row('Browser history', 'Include browser history in search.', history),
      row('Optional access', 'Remove website, bookmark and history permissions.', revoke),
      el('a', {href:'privacy.html', target:'_blank', rel:'noopener'}, 'Read the privacy policy')));
    updateHistory().catch(error=>toast(error.message,{error:true}));
  }
  function settingsDetails(sectionName = 'AI connection') {
    if(globalThis.__neoSurface) return act(async()=>{
      await rpc('open-library',{hash:sectionName==='AI connection'?'#action=ai-connection':'#action=settings'});
      onOpen?.();
    })();
    if(sectionName==='Data & permissions') return privacyDialog();
    const s = data.state.settings;
    const fields = {};
    const input = (name, type = 'text') =>
      (fields[name] = el('input', { value: s[name] || '', type }));
    const select = (name, choices) =>
      (fields[name] = el(
        'select',
        {},
        choices.map((v) =>
          el(
            'option',
            { value: v, selected: s[name] === v },
            name === 'provider' ? PROVIDERS[v].name : v[0].toUpperCase() + v.slice(1),
          ),
        ),
      ));
    const aiKey = el('input', {
        type: 'password',
        autocomplete: 'off',
        placeholder: data.connections.ai ? 'Saved · leave blank to keep' : 'Your API key',
      }),
      notionKey = el('input', {
        type: 'password',
        autocomplete: 'off',
        placeholder: data.connections.notion
          ? 'Saved · leave blank to keep'
          : 'Your internal integration token',
      });
    const body = el(
      'div',
      {},
      el(
        'section',
        { class: 'settings-section' },
        el('h3', {}, 'AI connection'),
        field('Provider', select('provider', Object.keys(PROVIDERS))),
        field('Model', input('model')),
        field('Compatible endpoint (complete chat/completions URL)', input('aiEndpoint')),
        field('API key', aiKey),

        el(
          'p',
          { class: 'hint' },
          'Saving this connection enables AI requests directly to your provider. Newly saved collections may be named automatically using their titles and full URLs. AI organisation also sends collection names and notes. Screenshots and page text are not sent. Your provider may retain requests and charge for them.',
        ),
        el('p', {class:'hint'}, 'Keys stay in browser-local storage, without LeoTabs-managed encryption, and are excluded from backups. Forget a key or revoke optional website access to stop its use.'),
        el('a', {href:'privacy.html', target:'_blank', rel:'noopener'}, 'Privacy policy'),
        button(
          'Forget AI key',
          act(async () => {
            await change('credentials', {
              aiKey: '',
              aiProvider: fields.provider.value,
              aiEndpoint: fields.aiEndpoint.value,
            });
            aiKey.value = '';
            updateProvider();
          }),
        ),
      ),
      el(
        'section',
        { class: 'settings-section' },
        el('h3', {}, 'Notion'),
        field('Notion integration token', notionKey),
        field('Notion parent page ID', input('notionParent')),
        el('p', {class:'hint'}, 'Exports send collection titles, URLs, groups and notes directly to Notion. Library export includes all collections. People with access to the destination may see them. Your token stays in browser-local storage without LeoTabs-managed encryption and is excluded from backups.'),
        button(
          'Forget Notion token',
          act(() => change('credentials', { notionKey: '' })),
        ),
      ),
    );
    const section = [...body.querySelectorAll('.settings-section')].find(
      (node) => node.querySelector('h3').textContent === sectionName,
    );
    section.querySelector('h3').remove();
    body.replaceChildren(section);
    function draftConnection() {
      return { provider: fields.provider.value, aiEndpoint: fields.aiEndpoint.value };
    }
    function updateProvider(reset = false) {
      if (sectionName !== 'AI connection') return;
      const provider = PROVIDERS[fields.provider.value];
      if (reset) {
        fields.model.value = provider.model;
        fields.aiEndpoint.value = provider.endpoint;
        aiKey.value = '';
      }
      fields.aiEndpoint.closest('.field').hidden = fields.provider.value !== 'compatible';
      aiKey.placeholder = data.connections.aiProviders?.[aiConnectionId(draftConnection())]
        ? 'Saved for this provider · leave blank to keep'
        : 'API key for ' + provider.name;
    }
    if (sectionName === 'AI connection') {
      fields.provider.onchange = () => updateProvider(true);
      fields.aiEndpoint.oninput = () => updateProvider();
      updateProvider();
    }
    const activeFields = Object.fromEntries(
      Object.entries(fields).filter(([, node]) => section.contains(node)),
    );
    const { close } = focusedDialog(
      sectionName === 'Data & permissions' ? 'Privacy & permissions' : sectionName,
      body,
      sectionName === 'Data & permissions'
        ? []
        : [
            button(
              'Save settings',
              act(async () => {
                const settings = Object.fromEntries(
                  Object.entries(activeFields).map(([k, v]) => [k, v.value]),
                );
                const origins = [];
                if (
                  sectionName === 'AI connection' &&
                  (aiKey.value.trim() ||
                    data.connections.aiProviders?.[aiConnectionId(settings)] ||
                    (settings.provider === 'compatible' && settings.aiEndpoint))
                )
                  origins.push(endpointOrigin(providerEndpoint(settings)) + '/*');
                if (sectionName === 'Notion' && notionKey.value.trim())
                  origins.push('https://api.notion.com/*');
                if (
                  origins.length &&
                  !(await chrome.permissions.request({ origins: [...new Set(origins)] }))
                )
                  throw new Error('Allow access to save this connection');
                await change('settings', { settings });
                const credentials = {};
                if (sectionName === 'AI connection' && aiKey.value.trim())
                  Object.assign(credentials, {
                    aiKey: aiKey.value.trim(),
                    aiProvider: settings.provider,
                    aiEndpoint: settings.aiEndpoint,
                  });
                if (sectionName === 'Notion' && notionKey.value.trim())
                  credentials.notionKey = notionKey.value.trim();
                if (Object.keys(credentials).length) await change('credentials', credentials);
                close();
              }),
              { className: 'primary' },
            ),
          ],
    );
  }

  function noteDialog(c) {
    const input = el('textarea', {
      value: c.note,
      rows: 7,
      maxLength: 10000,
      'aria-label': 'Continuation note',
    });
    const { close } = popover('Note · ' + c.name, input, [
      button(
        'Save note',
        act(async () => {
          await change('edit', { kind: 'collection', collectionId: c.id, note: input.value });
          close();
        }),
        { className: 'primary' },
      ),
    ]);
  }
  async function recoverLibrary(op) {
    const collections = await rpc('library-snapshot', { id: op.id });
    const selected = new Set();
    const list = el(
      'div',
      { class: 'review-list' },
      collections.map((c) =>
        el(
          'label',
          {},
          el('input', {
            type: 'checkbox',
            onchange: (event) =>
              event.target.checked ? selected.add(c.id) : selected.delete(c.id),
          }),
          el('span', { class: 'row-title' }, c.name),
          el('small', {}, `${c.links.length} links`),
        ),
      ),
    );
    const { close } = modal(
      'Restore an earlier collection',
      el(
        'div',
        {},
        el(
          'p',
          { class: 'hint' },
          'Restore earlier collections as separate copies',
        ),
        list,
      ),
      [
        button(
          'Restore selected copies',
          act(async () => {
            if (!selected.size) throw new Error('Select a collection');
            await change('restore-library', { id: op.id, collectionIds: [...selected] });
            close();
          }),
          { className: 'primary' },
        ),
      ],
    );
  }
  async function updateCollection(context) {
    const plan = await rpc('collection-update-preview', {
      collectionId: context.id,
      windowId: win,
    });
    const picked = new Set(plan.additions.map((l) => l.url));
    const status = el('p', { class: 'hint', role: 'status' });
    const commit = button(
      '',
      act(async () => {
        commit.disabled = true;
        try {
          await change('collection-update', {
            collectionId: context.id,
            windowId: win,
            expectedRevision: plan.revision,
            signature: plan.signature,
            urls: [...picked],
          });
          close();
        } catch (error) {
          status.textContent = error.message;
        } finally {
          commit.disabled = !picked.size;
        }
      }),
      { className: 'primary' },
    );
    const updateLabel = () => {
      commit.textContent = 'Add ' + picked.size + (picked.size === 1 ? ' tab' : ' tabs');
      commit.setAttribute('aria-label', commit.textContent);
      commit.disabled = !picked.size;
    };
    const body = el(
      'div',
      {},
      el('p', { class: 'hint' }, `Current window · ${plan.currentCount} unpinned tabs`),
      el('p', {}, `${plan.additions.length} new · ${plan.alreadySaved} already saved`),
      el(
        'p',
        { class: 'hint' },
        'Existing links, titles and notes are kept',
      ),
      el(
        'div',
        { class: 'collection-update-list' },
        plan.additions.map((link) =>
          el(
            'label',
            { class: 'collection-update-row', title: link.url },
            el('input', {
              type: 'checkbox',
              checked: true,
              'aria-label': 'Add ' + link.title,
              onchange: (e) => {
                e.target.checked ? picked.add(link.url) : picked.delete(link.url);
                updateLabel();
              },
            }),
            favicon(link),
            el('span', {}, el('strong', {}, link.title), el('small', {}, domain(link.url))),
          ),
        ),
      ),
      !plan.additions.length
        ? el(
            'p',
            {},
            plan.currentCount
              ? 'No new tabs to add'
              : 'No tabs to add',
          )
        : null,
      status,
    );
    const { close } = modal('Update ' + context.name, body, [
      button('Cancel', () => close()),
      button(
        'Review again',
        act(() => updateCollection(context)),
      ),
      commit,
    ]);
    updateLabel();
  }
  async function collectionVersions(c) {
    const rows = await rpc('collection-versions', { collectionId: c.id });
    const body = el('div', { class: 'collection-versions' });
    body.append(
      el(
        'p',
        { class: 'hint' },
        'Restoring a version keeps the current version in this history.',
      ),
    );
    for (const row of rows) {
      const details = el(
        'details',
        { class: 'session-entry collection-version', dataset: { versionId: row.id } },
        el(
          'summary',
          {},
          new Date(row.at).toLocaleString(),
          el(
            'small',
            {},
            `${row.snapshot.links.length} ${row.snapshot.links.length === 1 ? 'tab' : 'tabs'}${row.version ? ' · Saved version' : ' · Earlier snapshot'}`,
          ),
        ),
      );
      for (const link of row.snapshot.links)
        details.append(
          el(
            'div',
            { class: 'session-page' },
            favicon(link),
            el('span', { class: 'row-title' }, link.title, el('small', {}, domain(link.url))),
          ),
        );
      details.append(
        button(
          'Restore this version',
          act(async () => {
            await change('collection-version-restore', {
              collectionId: c.id,
              id: row.id,
              windowId: win,
            });
            close();
            toast('Collection version restored');
          }),
          { className: 'session-restore' },
        ),
      );
      body.append(details);
    }
    if (!rows.length)
      body.append(
        el(
          'p',
          { class: 'empty' },
          'No previous versions',
        ),
      );
    const { close } = modal('Version history · ' + c.name, body);
  }
  function stashDialog(context) {
    return saveTo(context, { closeTabs: true });
  }
  return {
    save: saveTo,
    update: updateCollection,
    versions: collectionVersions,
    stash: stashDialog,
    resume: resumeDialog,
    switch: switchDialog,
    swap: swapCollection,
    closeCollection,
    closeWindow: () => change('close-window', {windowId:win}),
    note: noteDialog,
    export: exportDialog,
    ai: aiSaved,
    aiTabs,
    arrangeRules: () => change('arrange-tabs', {windowId:win}),
    groupSort,
    groupCollection,
    sortTabs: order => change('sort-open-tabs', {windowId:win,order}),
    recovery: recoveryDialog,
    settings: settingsDialog,
    aiConnection: () => settingsDetails('AI connection'),
    aiSettings: () => settingsDetails('AI connection'),
    import: importDialog,
    previewImport,
  };
}

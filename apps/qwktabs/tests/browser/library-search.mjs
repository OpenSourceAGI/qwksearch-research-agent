
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkLibrarySearch({ app, rpc, out, results, delay, origin }) {
  const wait = async (fn) => {
    for (let i = 0; i < 80; i++) {
      if (await fn()) return;
      await delay(100);
    }
    throw Error('Library search did not settle');
  };
  const query = async (value) => {
    await app.evaluate(
      `(()=>{const input=document.querySelector('#tab-search');input.focus({preventScroll:true});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input'));})()`,
    );
    await delay(400);
  };
  const shot = async (name) => {
    await fs.writeFile(
      path.join(out, name + '.png'),
      Buffer.from((await app.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
    );
  };
  const own = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('settings', { settings: { autoGroup: false } });
  await rpc('activate', { tabId: own.id });
  await app.send('Page.bringToFront');
  await app.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  const imported = await rpc('import', {
    collections: [
      {
        name: 'Design references',
        collapsed: true,
        groups: [{ id: 'docs', name: 'Reading', collapsed: true }],
        links: [
          {
            id: 'match',
            title: 'Research <svg onload=alert(1)> guide',
            url: origin + '/research-saved',
            groupId: 'docs',
          },
          { id: 'other', title: 'Unrelated guide', url: origin + '/unrelated' },
          {
            id: 'long-title',
            title: '【闪之轨迹4】全人物回路搭配攻略及支线任务详细指南'.repeat(4),
            url: origin + '/overflow-case?keyword=' + encodeURIComponent('攻略与技巧'.repeat(20)),
            groupId: 'docs',
          },
        ],
      },
      { name: 'Unrelated collection', groups: [], links: [] },
    ],
  });
  const fixture = imported.state.collections.find((c) => c.name === 'Design references');
  await app.evaluate(`import(chrome.runtime.getURL('lib/db.js')).then(db=>db.mutate('Other space fixture',s=>{
    s.spaces.push({id:'other-space',name:'Other space'},{id:'empty-space',name:'Empty space'});
    s.collections.push({id:'other-collection',spaceId:'other-space',name:'Remote archive',collapsed:true,groups:[{id:'remote-group',name:'Deep research',collapsed:true}],links:[{id:'remote-link',title:'Remote reference',url:'https://example.org/reference',note:'research in a different space',groupId:'remote-group'},{id:'long-title',title:'LongUnbrokenPageTitle'.repeat(25),url:'https://example.org/overflow-case?token='+'a'.repeat(800)}]});
  }))`);
  await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/research-live')},windowId:${own.windowId},active:false})`,
  );
  const closed = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/research-closed')},windowId:${own.windowId},active:false})`,
  );
  await wait(() => app.evaluate(`chrome.tabs.get(${closed.id}).then(t=>t.status==='complete'&&!t.pendingUrl)`));
  await app.evaluate(`chrome.tabs.remove(${closed.id})`);
  const granted = await app.evaluate("chrome.permissions.contains({permissions:['history']})");
  if (granted)
    await app.evaluate(
      `chrome.history.addUrl({url:${JSON.stringify(origin + '/research-visited')}})`,
    );
  await app.send('Page.reload');
  await wait(() => app.evaluate('!!document.querySelector(".recent-mode")'));
  await query('research');
  assert(await app.evaluate('!document.querySelector("#spaces .active,#spaces [aria-current]")'),'Global search must not mark a space as current');
  assert(await app.evaluate('document.querySelectorAll("#tabs mark").length>0'));
  await wait(() => app.evaluate('document.querySelectorAll("#recent .recent-pages mark").length>0'));
  assert(await app.evaluate('document.querySelectorAll("#board mark").length>0'));
  assert(await app.evaluate(`document.querySelector('#breadcrumbs').textContent.includes('across all spaces')`));
  assert.equal(await app.evaluate(`document.querySelector('#breadcrumbs [role="status"]').textContent`),'3 results across all spaces');
  assert.equal(await app.evaluate(`document.querySelector('#breadcrumbs button').textContent`),'Clear search');
  assert.equal(await app.evaluate(`document.querySelectorAll('#board .collection').length`),2,'Search should retain matching collection cards');
  assert(await app.evaluate(`!!document.querySelector('[data-collection-id="other-collection"] [data-link-id="remote-link"]')`));
  assert(await app.evaluate(`document.querySelector('[data-collection-id="other-collection"] .collection-space').textContent==='Other space'`));
  assert(await app.evaluate(`!document.querySelector('#board.detail') && getComputedStyle(document.querySelector('#board')).display==='grid'`));
  assert.equal(await app.evaluate(`document.querySelectorAll('#view-tools button').length`),2,'Keep board/list controls while searching');
  assert(await app.evaluate(`!document.querySelector('.collection-head[draggable="true"]')`),'Cross-space filtered cards must not be reordered as if they belonged to one space');
  assert(await app.evaluate('!document.querySelector("#board .row-title svg")'));
  assert(
    await app.evaluate(
      '![...document.querySelectorAll("#board .row-title")].some(e=>e.textContent==="Unrelated guide")',
    ),
  );
  assert(
    (await rpc('load')).state.collections.find((c) => c.id === fixture.id).collapsed,
    'Search must preserve fold state',
  );
  if (granted) {
    await wait(() =>
      app.evaluate(
        'document.querySelector(".history-pages")?.textContent.includes("research-visited")',
      ),
    );
    assert(
      await app.evaluate(
        '!document.querySelector(".history-pages").textContent.includes("research-closed")',
      ),
      'Deduplicate recent pages from history',
    );
    await app.evaluate(
      "(()=>{const i=document.querySelector('#tab-search');i.value='research';i.dispatchEvent(new Event('input'));setTimeout(()=>{i.value='unrelatedzz';i.dispatchEvent(new Event('input'));},190);})()",
    );
    await delay(700);
    assert(
      await app.evaluate(
        '!document.querySelector(".history-pages").textContent.includes("research")',
      ),
      'Stale history results must not reappear',
    );
    await query('research');
  } else {
    assert(await app.evaluate('!!document.querySelector(".enable-history")'));
    await assert.rejects(() => rpc('history', { query: 'research' }));
  }
  assert(await app.evaluate('!document.querySelector("#global-search")'),'Remove the redundant header search button');
  await app.evaluate('document.activeElement.blur()');
  await app.send('Input.dispatchKeyEvent',{type:'keyDown',key:'/',code:'Slash',text:'/',windowsVirtualKeyCode:191});
  await app.send('Input.dispatchKeyEvent',{type:'keyUp',key:'/',code:'Slash',windowsVirtualKeyCode:191});
  assert(await app.evaluate('document.activeElement.id==="tab-search"'));
  await query('');
  await query('different space');
  assert.equal(await app.evaluate(`document.querySelector('#breadcrumbs [role="status"]').textContent`),'1 result across all spaces');
  assert.equal(await app.evaluate(`document.querySelectorAll('#board .collection').length`),1);
  assert(await app.evaluate(`!!document.querySelector('[data-link-id="remote-link"]')`),'Link notes should match inside collection cards');
  await app.evaluate(`document.querySelector('button[aria-label="Expand Remote archive"]').click()`);
  assert(await app.evaluate(`document.activeElement.closest('.collection')?.dataset.collectionId==='other-collection'`),'Expanding a cross-space result should open its collection');
  assert.equal((await rpc('load')).state.collections.find(c=>c.id==='other-collection').collapsed,true,'Expanding search result changed persisted folding');
  await app.evaluate(`document.querySelector('#main').scrollTop=80`);
  const oldScroll=await app.evaluate(`document.querySelector('#main').scrollTop`);
  await query('research');
  assert(await app.evaluate(`!!document.querySelector('[data-link-id="${fixture.links.find(l=>l.title.includes('Research')).id}"]')`),'Search from collection detail was restricted to that collection');
  assert(await app.evaluate(`!document.querySelector('#board.detail')`),'Global search from detail should still use collection cards');
  await app.evaluate(`document.querySelector('#breadcrumbs button').click()`);
  assert(await app.evaluate(`!!document.querySelector('#board.detail [data-collection-id="other-collection"]')`));
  assert(await app.evaluate(`document.activeElement.id==='tab-search'`));
  assert.equal(await app.evaluate(`document.querySelector('#main').scrollTop`),oldScroll,'Clear search lost the detail scroll position');
  const chooseSpace=async(id,keyboard=false)=>{
    const selector=`#spaces [data-space-id="${id}"] > button:first-child`;
    if(keyboard) {
      await app.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
      await app.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
      await app.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    } else {
      const p=await app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      for(const type of ['mousePressed','mouseReleased'])await app.send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1});
    }
    await wait(()=>app.evaluate(`document.querySelector('#tab-search').value===''&&document.querySelector('#spaces .active')?.dataset.spaceId===${JSON.stringify(id)}`));
    assert.equal(await app.evaluate(`localStorage.getItem('neo-space')`),id);
    assert(await app.evaluate(`!document.querySelector('#board.detail,#spaces input,#breadcrumbs [role="status"]')`),'Space navigation should show its collection board, not rename or return to old detail');
    assert.equal(await app.evaluate(`document.querySelector('#main').scrollTop`),0);
    assert.equal(await app.evaluate(`document.querySelector('#spaces [aria-current="page"]').closest('.space-tab').dataset.spaceId`),id);
    assert.equal(await app.evaluate(`document.activeElement.closest('.space-tab')?.dataset.spaceId`),id,'Space navigation lost keyboard focus');
    const state=(await rpc('load')).state;
    const expected=state.collections.filter(c=>c.spaceId===id).map(c=>c.id).sort();
    assert.deepEqual(await app.evaluate(`[...document.querySelectorAll('#board .collection')].map(c=>c.dataset.collectionId).sort()`),expected);
    assert(await app.evaluate(`document.querySelectorAll('#tabs .tab-row').length>0`),'Clearing global search should also reset open-tab filtering');
  };
  await query('research');
  await chooseSpace('other-space'); // The space active before search must navigate, not rename.
  await query('research');
  await app.evaluate(`document.querySelector('#breadcrumbs button').click()`);
  assert(await app.evaluate(`!document.querySelector('#board.detail')&&document.querySelector('#spaces .active').dataset.spaceId==='other-space'`),'Clear search resurrected the detail view from before explicit navigation');
  await query('no-matching-saved-content');
  await chooseSpace('main',true);
  await query('research');
  await app.evaluate(`document.querySelector('button[aria-label="Workspace options for Other space"]').click()`);
  await app.evaluate(`[...document.querySelectorAll('#action-popover button')].find(b=>b.textContent==='Rename workspace').click()`);
  assert(await app.evaluate(`document.querySelector('#tab-search').value===''&&document.activeElement.matches('[data-space-id="other-space"] input')`),'Explicit workspace rename must leave search and focus the editor');
  for(const type of ['keyDown','keyUp'])await app.send('Input.dispatchKeyEvent',{type,key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await app.evaluate(`!document.querySelector('#spaces input')`));
  await query('research');
  await chooseSpace('empty-space');
  await query('research');
  await app.evaluate(`document.querySelector('#breadcrumbs button').click()`);
  assert(await app.evaluate(`document.querySelector('#spaces .active').dataset.spaceId==='empty-space'&&!document.querySelector('#board .collection')`));
  await chooseSpace('main');
  results.push('Global search has no current-space indicator; mouse/keyboard space navigation clears query and opens the chosen board, including the prior or empty space; Clear search retains its own return behavior');
  await app.evaluate(
    `document.querySelector('[data-collection-id="${fixture.id}"] button[aria-label="Expand Design references"]').click()`,
  );
  await query('nothing-matches-this-collection');
  assert(await app.evaluate('!document.querySelector("#board .collection")'));
  assert.equal(await app.evaluate(`document.querySelector('#breadcrumbs [role="status"]').textContent`),'0 results across all spaces');
  await query('');
  await app.evaluate(`document.querySelector('button[aria-label="All collections"]').click()`);
  await query('research');
  await app.evaluate(`document.querySelector('#view-tools button[aria-label="List view"]').click()`);
  await wait(()=>app.evaluate(`document.querySelector('#board').classList.contains('list-view')`));
  assert.equal(await app.evaluate(`document.querySelectorAll('#board .collection').length`),2,'List view must retain matching collection cards');
  await app.evaluate(`document.querySelector('#view-tools button[aria-label="Board view"]').click()`);
  await wait(()=>app.evaluate(`!document.querySelector('#board').classList.contains('list-view')`));
  await rpc('settings', { settings: { theme: 'dark' } });
  await delay(200);
  await shot('library-unified-search-dark');
  await query('');
  assert(
    await app.evaluate(
      '!![...document.querySelectorAll("#board .collection-name")].find(e=>e.textContent==="Unrelated collection")',
    ),
  );
  await app.evaluate('document.querySelector(".recent-mode").click()');
  await wait(() => app.evaluate('!!document.querySelector(".history-restore")'));
  assert(
    await app.evaluate(
      '(()=>{const b=document.querySelector(".history-restore").getBoundingClientRect(),l=document.querySelector(".history-tabs").getBoundingClientRect();return b.height>=38 && b.top>=l.bottom;})()',
    ),
  );
  assert(
    await app.evaluate(
      '!document.querySelector("#recent select") && !document.querySelector(".history-reason")',
    ),
  );
  assert(
    await app.evaluate(
      'document.querySelector("#recent h2").innerText.includes("Timeline")',
    ),
  );
  assert(
    await app.evaluate(
      'document.querySelectorAll(".timeline-page").length>0 && [...document.querySelectorAll(".timeline-page")].every(p=>p.querySelector(".favicon") && p.querySelector(".recent-page-copy small"))',
    ),
  );
  await shot('library-timeline');
  await app.evaluate('document.querySelector(".recent-mode").click()');
  await query('research');
  await rpc('settings', { settings: { theme: 'light' } });
  await delay(200);
  await shot('library-unified-search-light');
  await app.send('Emulation.setDeviceMetricsOverride', {
    width: 1000,
    height: 760,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await delay(300);
  assert(await app.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  assert(
    await app.evaluate(
      'document.querySelector("#sidebar").scrollWidth<=document.querySelector("#sidebar").clientWidth',
    ),
  );
  await shot('library-unified-search-compact');
  await query('overflow-case');
  assert.equal(await app.evaluate(`document.querySelector('#breadcrumbs [role="status"]').textContent`),'2 results across all spaces');
  for (const [width, view] of [[1440, 'Board'], [1440, 'List'], [1000, 'Board']]) {
    await app.send('Emulation.setDeviceMetricsOverride', {
      width, height: 1000, deviceScaleFactor: 1, mobile: false,
    });
    await app.evaluate(`document.querySelector('#view-tools button[aria-label="${view} view"]').click()`);
    await delay(200);
    await shot(`library-long-text-${view.toLowerCase()}-${width}`);
    const layout = await app.evaluate(`(()=>{
      const rows=[...document.querySelectorAll('#board .link-open:has(.search-match-url)')];
      return {
        pageFits:document.documentElement.scrollWidth<=innerWidth,
        boardFits:document.querySelector('#main').scrollWidth<=document.querySelector('#main').clientWidth,
        rows:rows.map(button=>{
          const title=button.querySelector('.row-title'),url=button.querySelector('.search-match-url');
          const bounds=button.getBoundingClientRect(),card=button.closest('.collection').getBoundingClientRect();
          const close=button.parentElement.querySelector('.remove-link').getBoundingClientRect();
          const contained=[title,url].every(node=>{
            const r=node.getBoundingClientRect();
            return r.left>=bounds.left-1&&r.right<=bounds.right+1;
          });
          return {contained,controlsFit:bounds.right<=close.left&&close.right<=card.right,
            fullTitle:button.title===title.textContent&&button.getAttribute('aria-label')===title.textContent,
            truncated:title.scrollWidth>title.clientWidth&&getComputedStyle(title).textOverflow==='ellipsis',
            highlighted:!!url.querySelector('mark')};
        })
      };
    })()`);
    assert.equal(layout.rows.length,2);
    assert(layout.pageFits&&layout.boardFits,`Long search text causes horizontal scrolling in ${view} view at ${width}px`);
    assert(layout.rows.every(row=>row.contained&&row.controlsFit),`Long search text escapes its row or covers controls: ${JSON.stringify(layout)}`);
    assert(layout.rows.every(row=>row.fullTitle&&row.truncated&&row.highlighted),'Keep full accessible titles, ellipsis and URL highlights');
  }
  await app.send('Emulation.clearDeviceMetricsOverride');
  results.push('Long Chinese and unbroken titles with URL-only matches stay inside grouped and independent rows; full titles and controls preserved in board/list and compact layouts');
  results.push(
    'All-space search preserves collection cards, matching links/groups and highlights, board/list controls and saved folding; header search button removed, slash shortcut retained; clearing restores detail/scroll',
  );
  results.push(
    granted
      ? 'Real Chrome history with isolated fixture permission, URL deduplication and stale-query protection'
      : 'Browser history remains optional: permission CTA shown and ungranted reads rejected',
  );
  results.push(
    'Session restore is a visible 38px action below the scrollable list; light/dark and compact layout captured',
  );
}

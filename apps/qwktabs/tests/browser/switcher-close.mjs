
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkSwitcherClose({app,rpc,origin,delay,targets,connect,triggerSwitcher,results,out}) {
  const wait=async(fn,label)=>{for(let i=0;i<100;i++){if(await fn())return;await delay(100);}throw Error(label);};
  await rpc('settings',{settings:{autoGroup:false}});
  const hostUrl=origin+'/close-host?continuation=website-state';
  const host=await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(hostUrl)},pinned:true,active:true})`);
  const tabs=await app.evaluate(`Promise.all(['one','two','solo'].map(p=>chrome.tabs.create({url:${JSON.stringify(origin)}+'/close-'+p,active:false})))`);
  await wait(()=>app.evaluate(`chrome.tabs.query({}).then(ts=>ts.filter(t=>${JSON.stringify([host.id,...tabs.map(t=>t.id)])}.includes(t.id)).every(t=>t.status==='complete'))`),'Fixtures did not load');
  const group=await app.evaluate(`chrome.tabs.group({tabIds:${JSON.stringify(tabs.slice(0,2).map(t=>t.id))}})`);
  await app.evaluate(`chrome.tabGroups.update(${group},{title:'Close fixture',color:'green'})`);
  await triggerSwitcher(host);
  const page=await connect((await targets()).find(t=>t.url===hostUrl).webSocketDebuggerUrl);
  const read=code=>app.evaluate(`chrome.scripting.executeScript({target:{tabId:${host.id}},func:()=>{const root=globalThis.__neoSurface;${code}}}).then(r=>r[0].result)`);
  const groupCard=`[...root.querySelectorAll('.group-name')].find(n=>n.textContent==='Close fixture')?.closest('.switcher-card')`;
  await wait(()=>read(`return !!(${groupCard})`),'Group card missing');
  const closeBounds=await read(`
    const card=(${groupCard}),button=card.querySelector('.tile-close'),r=button.getBoundingClientRect();
    return {bottom:r.bottom,previewTop:card.querySelector('.group-preview').getBoundingClientRect().top,height:r.height};
  `);
  assert(closeBounds.bottom<=closeBounds.previewTop,'Close button overlaps the thumbnail: '+JSON.stringify(closeBounds));
  await read(`
    const send=chrome.runtime.sendMessage.bind(chrome.runtime);
    globalThis.__failQuickLoads=1;
    chrome.runtime.sendMessage=(message,...args)=>{
      if(message?.action==='load' && globalThis.__failQuickLoads-->0) return Promise.reject(new Error('Test: temporary switcher connection failure'));
      return send(message,...args);
    };
  `);
  const pointerTab=await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(origin+'/pointer-close')},active:false})`);
  const pointerCard=`[...root.querySelectorAll('.switcher-card')].find(c=>c.dataset.key.includes(':tab:${pointerTab.id}:'))`;
  await wait(()=>read('return !!root.querySelector(".load-error:not([hidden])")'),'Switcher hid a failed refresh');
  assert(await read(`return !!(${groupCard})`),'A refresh failure erased existing switcher cards');
  await read('root.querySelector(".load-error button").click()');
  await wait(()=>read(`return !!(${pointerCard})`),'New tab did not reach the switcher');
  await wait(()=>read('return !!root.querySelector(".load-error[hidden]")'),'Switcher Retry did not clear the error');
  await read(`(${pointerCard}).scrollIntoView({block:'nearest'})`);
  const point=await read(`const card=(${pointerCard}),b=card.querySelector('.tile-close'),r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.bottom-1,previewTop:card.querySelector('.preview-image').getBoundingClientRect().top};`);
  assert(point.y<point.previewTop,'Close hit area reaches into the thumbnail');
  await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
  const hit=await read(`const target=root.elementFromPoint(${point.x},${point.y});return {close:target?.closest('.tile-close')===(${pointerCard}).querySelector('.tile-close'),target:target?.outerHTML.slice(0,200)};`);
  assert(hit.close,'Pointer misses Close: '+JSON.stringify({point,hit}));
  await fs.writeFile(path.join(out,'close-hover.png'),Buffer.from((await page.send('Page.captureScreenshot')).data,'base64'));
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
  await wait(()=>app.evaluate(`chrome.tabs.query({}).then(ts=>!ts.some(t=>t.id===${pointerTab.id}))`),'Real pointer click did not close the tab');
  await wait(()=>read(`return !(${pointerCard})`),'Closed tab left a stale thumbnail');
  assert(await read('return !!root.querySelector(".task-view")'),'Close activated the thumbnail and dismissed the switcher');
  results.push('Close hover and pointer hit area stay in the header; a real click closes and refreshes without activating the preview');
  for(const mode of ['Previews','List']) {
    await read(`root.querySelector('[aria-label="${mode}"]').click()`);
    await wait(()=>read(`return !!(${groupCard})`),'Group view missing');
    await read(`(${groupCard}).querySelector('.group-name').click()`);
    const bounds=await read(`
      const input=root.querySelector('.group-name-slot input'),slot=input.parentElement,card=input.closest('.switcher-card');
      input.value='Programming languages and runtimes';input.select();
      const i=input.getBoundingClientRect(),s=slot.getBoundingClientRect(),x=card.querySelector('.tile-close').getBoundingClientRect();
      return {height:i.height,slotHeight:s.height,right:i.right,closeLeft:x.left,bottom:i.bottom,previewTop:card.querySelector('.group-preview')?.getBoundingClientRect().top,
        countLeft:card.closest('.tab-list')?card.querySelector('.preview-info').getBoundingClientRect().left:null};
    `);
    assert(bounds.height<=bounds.slotHeight+0.5 && bounds.right<=bounds.closeLeft,`${mode} rename overlaps the header: ${JSON.stringify(bounds)}`);
    if(bounds.previewTop)assert(bounds.bottom<=bounds.previewTop,'Rename overlaps the preview');
    if(bounds.countLeft!==null)assert(bounds.right+4<=bounds.countLeft,'Rename overlaps the tab count');
    await read(`root.querySelector('.group-name-slot input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))`);
  }
  await read(`root.querySelector('[aria-label="Previews"]').click()`);
  assert(await read(`return !(${groupCard}).querySelector('.tile-actions').hidden`));
  assert(await read(`return (${groupCard}).querySelector('.tile-close').title==='Close group · 2 tabs (Alt+W)'`));
  const alive=async ids=>app.evaluate(`chrome.tabs.query({}).then(ts=>ts.filter(t=>${JSON.stringify(ids)}.includes(t.id)).length)`);
  const altW=async(autoRepeat=false)=>{
    await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87,modifiers:1,autoRepeat});
    await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87,modifiers:1});
    await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Alt',code:'AltLeft',windowsVirtualKeyCode:18});
  };
  await read(`(${groupCard}).querySelector('.preview-tile').focus()`);await altW(true);await delay(200);
  assert.equal(await alive(tabs.map(t=>t.id)),3,'Held shortcut closed tabs');
  await read(`root.querySelector('#quick-search').focus()`);await altW();await delay(200);
  assert.equal(await alive(tabs.map(t=>t.id)),3,'Typing focus allowed destructive shortcut');
  await read(`globalThis.__previousToast=root.querySelector('#toast>span'); (${groupCard}).querySelector('.preview-tile').focus()`);await altW();
  await wait(async()=>await alive(tabs.slice(0,2).map(t=>t.id))===0,'Alt+W did not close group');
  await wait(()=>read(`return !!root.activeElement?.closest('.switcher-card')`),'Close lost keyboard focus');
  await wait(()=>read(`return root.querySelector('#toast>span')!==globalThis.__previousToast && !![...root.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo')`),'Group close has no new Undo');
  await read(`[...root.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
  await wait(()=>read(`return !!(${groupCard})`),'Undo did not restore group');
  await wait(()=>app.evaluate(`chrome.tabGroups.query({}).then(gs=>gs.some(g=>g.title==='Close fixture'&&g.color==='green'))`),'Undo lost the group name or color');
  await read(`root.querySelector('[aria-label="List"]').click()`);
  await wait(()=>read(`return !!(${groupCard})?.querySelector('.tab-choice')`),'List view did not load');
  await read(`globalThis.__previousToast=root.querySelector('#toast>span'); (${groupCard}).querySelector('.tile-close').click()`);
  await wait(()=>read(`return !(${groupCard})`),'Group x did not close group');
  await wait(()=>read(`return root.querySelector('#toast>span')!==globalThis.__previousToast && !![...root.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo')`),'List close has no new Undo');
  await read(`[...root.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
  await wait(()=>read(`return !!(${groupCard})`),'List Undo failed');
  results.push('Native Alt+W closes focused group; repeated keys and text inputs are safe; group x works in List view; focus and group Undo retained');

  await read(`root.querySelector('[aria-label="Select tabs"]').click()`);
  await read(`(${groupCard}).querySelector('.group-select').click(); [...root.querySelectorAll('.switcher-card')].find(c=>c.dataset.key.includes(':tab:${host.id}:')).querySelector('.tab-choice').click(); (${groupCard}).querySelector('.tab-choice').focus()`);
  await read(`globalThis.__previousToast=root.querySelector('#toast>span')`);
  await altW();await wait(()=>read(`return !(${groupCard})`),'Selection shortcut failed');
  assert.equal(await alive([host.id]),1,'Bulk close removed pinned host');
  await wait(()=>read(`return root.querySelector('#toast>span')!==globalThis.__previousToast && !![...root.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo')`),'Selection close has no new Undo');
  await read(`[...root.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
  await wait(()=>read(`return !!(${groupCard})`),'Selection Undo failed');
  results.push('Selection Alt+W closes selected group while preserving pinned tabs');
  await read(`globalThis.__neoCloseOverlay()`);

  await app.evaluate(`chrome.tabs.update(${host.id},{pinned:false})`);
  const hostGroup=await app.evaluate(`chrome.tabs.group({tabIds:${JSON.stringify([host.id,tabs[2].id])}})`);
  await app.evaluate(`chrome.tabGroups.update(${hostGroup},{title:'Host group',color:'blue'})`);
  await triggerSwitcher(host);
  await wait(()=>read(`return !![...root?.querySelectorAll('.group-name')||[]].find(n=>n.textContent==='Host group')`),'Host group missing');
  await read(`[...root.querySelectorAll('.group-name')].find(n=>n.textContent==='Host group').closest('.switcher-card').querySelector('.tile-close').click()`);
  let popup;
  await wait(async()=>{popup=(await targets()).find(t=>t.url.includes('/quick.html?')&&t.url.includes('continuation='));return !!popup;},'Closing host did not preserve switcher');
  const quick=await connect(popup.webSocketDebuggerUrl);
  await wait(async()=>await alive([host.id,tabs[2].id])===0,'Host group did not close');
  await wait(()=>quick.evaluate(`!![...document.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo')`),'Continued switcher lost Undo');
  await wait(()=>quick.evaluate(`!!document.activeElement.closest('.switcher-card') || document.activeElement.id==='quick-search'`),'Continued close lost result focus');
  await fs.writeFile(path.join(out,'switcher-close-continuation.png'),Buffer.from((await quick.send('Page.captureScreenshot')).data,'base64'));
  await quick.evaluate(`[...document.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
  await wait(()=>app.evaluate(`chrome.tabGroups.query({}).then(gs=>gs.some(g=>g.title==='Host group'))`),'Continued Undo did not restore host group');
  results.push('Closing the page hosting the overlay continues in the protected-page popup with focus and working Undo');
}

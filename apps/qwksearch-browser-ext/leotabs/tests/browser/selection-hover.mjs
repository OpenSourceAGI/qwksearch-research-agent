
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkSelectionHover({app,rpc,results,delay,origin,out}) {
  await rpc('settings',{settings:{autoGroup:false}});
  const tab=await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(origin+'/hover')},active:false})`);
  const row=`#tabs .tab-row[data-tab-id="${tab.id}"]`, check=row+' .tab-select';
  for(let i=0;i<100&&!await app.evaluate(`!!document.querySelector(${JSON.stringify(check)})`);i++)await delay(100);
  // Finish the new tab's title checkpoint before beginning a pointer gesture.
  for(let i=0;i<100&&!await app.evaluate(`chrome.tabs.get(${tab.id}).then(t=>t.status==='complete')`);i++)await delay(50);
  await delay(350);
  const mouse=async(selector,click=false)=>{
    const p=await app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
    if(click)for(const type of ['mousePressed','mouseReleased'])await app.send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1});
    await delay(100);
  };
  const away=async()=>{await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:700,y:100});await delay(100);};
  const state=()=>app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(row)}),c=r.querySelector('.tab-select');return {checked:c.checked,checkbox:getComputedStyle(c).opacity,icon:getComputedStyle(r.querySelector('.favicon')).visibility,close:getComputedStyle(r.querySelector('.row-close')).opacity,focused:c===document.activeElement,keyboard:c.matches(':focus-visible')}})()`);
  await app.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await mouse(check,true);await away();assert.equal((await state()).checked,true);
  await mouse(check,true);await away();
  const after=await state();
  await fs.writeFile(path.join(out,'deselected.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
  assert.equal(after.checked,false);
  assert.equal(after.checkbox,'0','Unchecked mouse-focused checkbox remained visible after pointer left: '+JSON.stringify(after));
  assert.equal(after.icon,'visible');assert.equal(after.close,'0');
  await mouse(row);assert.equal((await state()).checkbox,'1');await away();assert.equal((await state()).checkbox,'0');
  // Keyboard users retain visible controls and can select/deselect without losing focus.
  for(const type of ['keyDown','keyUp'])await app.send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await app.evaluate(`document.querySelector(${JSON.stringify(check)}).focus()`);
  assert.equal((await state()).checkbox,'1');
  for(let i=0;i<2;i++)for(const type of ['keyDown','keyUp'])await app.send('Input.dispatchKeyEvent',{type,key:' ',code:'Space',windowsVirtualKeyCode:32});
  const keyboard=await state();assert.equal(keyboard.checked,false);assert.equal(keyboard.focused,true);assert.equal(keyboard.checkbox,'1');
  await mouse('#library-select-mode',true);await away();assert.equal((await state()).checkbox,'1');
  await mouse('#library-select-mode',true);await away();assert.equal((await state()).checkbox,'0');assert.equal((await state()).icon,'visible');
  results.push('Mouse select/deselect restores favicon and hover controls; keyboard selection stays accessible; leaving Select mode restores normal rows');
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await rpc('import',{collections:[{name:'Selection fixture',groups:[],links:[{title:'Project brief',url:origin+'/hover'},{title:'Reference',url:origin+'/reference'}]}]});
  const c=(await rpc('load')).state.collections.find(c=>c.name==='Selection fixture');
  const card=`[data-collection-id="${c.id}"]`;
  for(let i=0;i<100&&!await app.evaluate(`!!document.querySelector(${JSON.stringify(card)})`);i++)await delay(100);
  await app.evaluate(`document.querySelector(${JSON.stringify(card+' .collection-select')}).click();document.querySelector(${JSON.stringify(card+' .saved-row input')}).click()`);
  assert.equal(await app.evaluate(`document.querySelector(${JSON.stringify(card+' .remove-selected')}).textContent`),'Remove from collection');
  assert.equal(await app.evaluate(`document.querySelectorAll('#selection [aria-label="Rename group"],.saved-selection [aria-label="Rename group"]').length`),0);
  for(const width of [1440,390]){
    await app.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await delay(150);
    assert(await app.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(card+' .remove-selected')}),r=b.getBoundingClientRect(),a=b.parentElement.getBoundingClientRect();return r.left>=a.left&&r.right<=a.right+1&&b.scrollWidth<=b.clientWidth+1})()`),'Remove label overflowed at '+width);
    assert(await app.evaluate(`(()=>{const b=document.querySelector('#current-collection .close-all-tabs'),r=b.getBoundingClientRect(),a=b.parentElement.getBoundingClientRect();return b.textContent==='Close all currently open tabs'&&!b.querySelector('svg')&&r.left>=a.left&&r.right<=a.right+1&&b.scrollWidth<=b.clientWidth+1})()`),'Close all text button missing or clipped at '+width);
  }
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await fs.writeFile(path.join(out,'selection-toolbar.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
  assert.equal(await app.evaluate(`document.querySelectorAll('.close-all-tabs').length`),1,'Duplicate Close all');
  assert.equal(await app.evaluate(`document.querySelector('#ai-tools').hidden`),true);
  const nativeBefore=await app.evaluate('chrome.tabs.query({}).then(ts=>ts.map(t=>t.id))');
  await app.evaluate(`document.querySelector(${JSON.stringify(card+' .remove-selected')}).click()`);
  for(let i=0;i<100&&(await rpc('load')).state.collections.find(x=>x.id===c.id).links.length!==1;i++)await delay(100);
  assert.equal((await rpc('load')).state.collections.find(x=>x.id===c.id).links.length,1);
  assert.deepEqual(await app.evaluate('chrome.tabs.query({}).then(ts=>ts.map(t=>t.id))'),nativeBefore,'Removing saved links closed browser tabs');
  for(let i=0;i<100&&!await app.evaluate(`document.querySelector('#toast')?.textContent.includes('Remove saved links')`);i++)await delay(100);
  await app.evaluate(`[...document.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
  for(let i=0;i<100&&(await rpc('load')).state.collections.find(x=>x.id===c.id).links.length!==2;i++)await delay(100);
  assert.equal((await rpc('load')).state.collections.find(x=>x.id===c.id).links.length,2);
  results.push('Collection selection uses readable Remove from collection; no redundant Rename group buttons; narrow layout fits; removal keeps browser tabs open and supports Undo');
}

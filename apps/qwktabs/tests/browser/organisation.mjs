import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkOrganisation({app,rpc,results,delay,origin,out}) {
  const wait=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await delay(80);}throw Error('Grouping check did not settle');};
  await rpc('settings',{settings:{autoGroup:false,organisation:{group:'ai'},aiNaming:true}});
  for(const action of ['organisation-policy','organisation-run','organisation-retry','organisation-reset','organisation-status'])
    await assert.rejects(rpc(action,{scope:{type:'global'},organisation:{group:'ai'}}),/Open Settings to change organisation preferences/);
  const own=await app.evaluate('chrome.tabs.getCurrent()');
  const tabs=await app.evaluate(`Promise.all(['/z','/a'].map(p=>chrome.tabs.create({windowId:${own.windowId},url:${JSON.stringify(origin)}+p,active:false})))`);
  const saved=await rpc('save',{tabIds:tabs.map(t=>t.id),close:false,name:'Keep my collection'});
  // Seed old-version state in this isolated profile, including its manual metadata.
  await app.evaluate(`import(chrome.runtime.getURL('lib/db.js')).then(db=>db.mutate('Legacy policy fixture',s=>{
    s.settings.organisation={group:'ai',collectionName:'ai'};s.settings.aiNaming=true;
    s.spaces[0].organisation={collectionOrder:'title'};
    const c=s.collections.find(c=>c.id===${JSON.stringify(saved.collectionId)});c.organisation={collectionName:'template'};c.note='Keep my note';c.manualOrder=true;
  }))`);
  const state=(await rpc('load')).state,c=state.collections.find(c=>c.id===saved.collectionId);
  assert.equal(state.settings.organisation,undefined);assert.equal(state.settings.aiNaming,undefined);
  assert.equal(state.spaces[0].organisation,undefined);assert.equal(c.organisation,undefined);
  assert.equal(c.name,'Keep my collection');assert.equal(c.note,'Keep my note');assert(c.manualOrder);
  await app.evaluate('location.reload()');
  await wait(()=>app.evaluate(`!!document.querySelector('.space-options')`));
  await app.evaluate(`document.querySelector('.space-options').click()`);
  assert(!await app.evaluate(`document.querySelector('#action-popover').textContent.includes('Organisation')`));
  await fs.writeFile(path.join(out,'space-menu.png'),Buffer.from((await app.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await app.evaluate(`document.querySelector('#action-popover').hidePopover();document.querySelector('#settings').click()`);
  assert(!await app.evaluate(`document.querySelector('#action-popover').textContent.includes('Organisation')`));
  await app.evaluate(`document.querySelector('#action-popover').hidePopover();document.querySelector('[aria-label="Options for Keep my collection"]').click()`);
  const labels=await app.evaluate(`Array.from(document.querySelectorAll('#action-popover [role=menuitem]'),b=>b.textContent.trim())`);
  assert(!labels.includes('Organisation'));assert(labels.includes('Group & sort'));assert(labels.includes('Organise collection with AI'));
  await rpc('settings',{settings:{autoGroup:true}});
  await wait(()=>app.evaluate(`Promise.all(${JSON.stringify(tabs.map(t=>t.id))}.map(id=>chrome.tabs.get(id))).then(ts=>ts[0].groupId>=0&&ts[0].groupId===ts[1].groupId)`));
  assert.equal((await rpc('load')).state.collections.find(c=>c.id===saved.collectionId)?.name,'Keep my collection');
  const original=await app.evaluate(`chrome.tabs.get(${tabs[0].id})`);
  await app.evaluate(`chrome.tabs.update(${tabs[0].id},{url:${JSON.stringify(origin.replace('127.0.0.1','localhost')+'/moved')}})`);
  await delay(1200);
  assert.equal((await app.evaluate(`chrome.tabs.get(${tabs[0].id})`)).groupId,original.groupId,'Navigation moved an auto-grouped tab');
  await app.evaluate(`chrome.tabs.ungroup(${tabs[0].id})`);
  await delay(400);
  await app.evaluate(`chrome.tabs.update(${tabs[0].id},{url:${JSON.stringify(origin+'/returned')}})`);
  await delay(1200);
  assert.equal((await app.evaluate(`chrome.tabs.get(${tabs[0].id})`)).groupId,-1,'Navigating a manually ungrouped tab regrouped it');
  const newcomer=await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(origin+'/newcomer')},active:false})`);
  await wait(()=>app.evaluate(`chrome.tabs.get(${newcomer.id}).then(t=>t.groupId===${original.groupId})`));
  results.push('Background navigation preserves auto-created groups; manual ungroup survives URL changes; new matching tabs still join an existing group');
  results.push('Organisation is absent from space, collection and Settings menus; retired endpoints reject requests; legacy policies are discarded without losing names, notes or manual ordering; built-in Auto-group still creates native groups');
}

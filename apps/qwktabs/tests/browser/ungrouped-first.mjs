
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkUngroupedFirst({app,rpc,results,delay,origin,out}) {
 const wait=async(fn,message)=>{for(let i=0;i<150;i++){if(await fn())return;await delay(60);}throw Error(message);};
 const own=await app.evaluate('chrome.tabs.getCurrent()');
 await rpc('settings',{settings:{autoGroup:false}});
 const names=['AlphaTwo','AlphaOne','Zulu','BetaTwo','BetaOne','Aardvark'];
 const hosts=['alpha.localhost','alpha.localhost','zulu.localhost','beta.localhost','beta.localhost','single.localhost'];
 const urls=names.map((name,i)=>origin.replace('127.0.0.1',hosts[i])+'/'+name);
 const tabs=await app.evaluate(`Promise.all(${JSON.stringify(urls)}.map(url=>chrome.tabs.create({url,active:false})))`);
 const ids=tabs.map(t=>t.id);
 await wait(()=>app.evaluate(`chrome.tabs.query({windowId:${own.windowId}}).then(ts=>ts.filter(t=>${JSON.stringify(ids)}.includes(t.id)).every(t=>t.status==='complete'&&${JSON.stringify(names)}.includes(t.title)))`),'Fixture not loaded');
 const pin=await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(origin)}+'/Pinned',pinned:true,active:false})`);
 const group=await app.evaluate(`chrome.tabs.group({tabIds:${JSON.stringify(ids.slice(0,2))}})`);
 await app.evaluate(`chrome.tabGroups.update(${group},{title:'Original group',color:'orange',collapsed:true})`);await delay(250);
 const layout=()=>app.evaluate(`(async()=>{const ts=await chrome.tabs.query({windowId:${own.windowId}}),gs=await chrome.tabGroups.query({windowId:${own.windowId}});return ts.filter(t=>${JSON.stringify([...ids,pin.id])}.includes(t.id)).sort((a,b)=>a.index-b.index).map(t=>({id:t.id,title:t.title,url:t.url,pinned:t.pinned,group:gs.filter(g=>g.id===t.groupId).map(g=>({title:g.title,color:g.color,collapsed:g.collapsed}))}));})()`);
 const first=await layout();
 const adopted=await rpc('save',{adopt:true,windowId:own.windowId,tabIds:ids});
 await rpc('collection-auto-update',{collectionId:adopted.collectionId,windowId:own.windowId,enabled:true});
 const assertLooseFirst=rows=>{
   let grouped=false;
   for(const t of rows.filter(t=>!t.pinned)){if(t.group.length)grouped=true;else assert(!grouped,'Standalone tab '+t.title+' appears after a group');}
   assert.equal(rows[0].id,pin.id,'Pinned tab moved');
 };
 for(const include of [true,false]) {
   await wait(()=>app.evaluate(`!!document.querySelector('.tab-more-button:not(:disabled)')`),'Grouping button missing');
   await app.evaluate(`document.querySelector('.tab-more-button').click();[...document.querySelectorAll('[role="menuitem"]')].find(b=>b.textContent==='Group & sort').click();document.querySelector('input[aria-label="Include already grouped tabs"]').checked=${include};document.querySelector('.group-apply').click()`);
   await wait(()=>app.evaluate(`!!document.querySelector('.tab-more-button').dataset.operationId&&!document.querySelector('.tab-more-button').disabled`),'Grouping did not finish');
   const ordered=await layout();assertLooseFirst(ordered);
   assert.deepEqual(ordered.filter(t=>!t.pinned&&!t.group.length).map(t=>t.title),['Aardvark','Zulu']);
   if(include)assert.deepEqual(ordered.filter(t=>!t.pinned).map(t=>t.title),['Aardvark','Zulu','AlphaOne','AlphaTwo','BetaOne','BetaTwo']);
   const tracked=(await rpc('load')).state.collections.find(c=>c.id===adopted.collectionId);
   assert.deepEqual(tracked.links.map(l=>l.url),ordered.filter(t=>!t.pinned).map(t=>t.url),'Active collection order does not match browser order');
   const alpha=ordered.filter(t=>ids.slice(0,2).includes(t.id));
   if(include)assert.deepEqual(alpha.map(t=>t.title),['AlphaOne','AlphaTwo']);
   else assert.deepEqual(alpha,first.filter(t=>ids.slice(0,2).includes(t.id)),'Unchecked grouping changed existing group content');
   await fs.writeFile(path.join(out,'ungrouped-first-'+include+'.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
   const operationId=await app.evaluate(`document.querySelector('.tab-more-button').dataset.operationId`);
   await rpc('undo-action',{id:operationId,windowId:own.windowId});assert.deepEqual(await layout(),first,'Undo did not restore grouping/order');
 }
 results.push('Group & sort UI puts standalone tabs A–Z before groups with Include already grouped tabs on and off; active collection order, pinned tabs, existing group content and Undo verified');
 for(const order of ['title','domain','recent']) {
   const op=await rpc('sort-open-tabs',{windowId:own.windowId,order});assertLooseFirst(await layout());
   await rpc('undo-action',{id:op.id,windowId:own.windowId});assert.deepEqual(await layout(),first);
 }
 results.push('Title, website and recent sorts also keep standalone tabs before intact groups, with working Undo');
 const selection=[ids[2],ids[5]],unselected=first.filter(t=>!selection.includes(t.id));
 const op=await rpc('group-sort',{windowId:own.windowId,tabIds:selection});
 assert.deepEqual((await layout()).filter(t=>!selection.includes(t.id)),unselected,'Selected-tab sort changed unselected relative order or membership');
 await rpc('undo-action',{id:op.id,windowId:own.windowId});assert.deepEqual(await layout(),first);
 results.push('Selection scope preserves unselected tabs and group membership');
}

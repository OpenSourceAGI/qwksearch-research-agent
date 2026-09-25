import assert from 'node:assert/strict';

export async function checkStashSafety({app,rpc,results,delay,origin}) {
  const own=await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('import',{collections:[{id:'stash-source',name:'Stash source',color:'mint',autoUpdate:true,groups:[],links:[
    {id:'a',title:'First',url:origin+'/stash-first'},
    {id:'b',title:'Second',url:origin+'/stash-second'},
  ]}]});
  const source=(await rpc('load')).state.collections.find(c=>c.name==='Stash source');
  await rpc('switch',{windowId:own.windowId,destinationId:source.id,tracking:true});
  await rpc('session-checkpoint',{windowId:own.windowId});
  const tabs=await app.evaluate(`chrome.tabs.query({windowId:${own.windowId}}).then(ts=>ts.filter(t=>t.id!==${own.id} && !t.pinned && (t.url.includes('/parked.html?') || t.url.startsWith(${JSON.stringify(origin)}))))`);
  assert.equal(tabs.length,2);
  await rpc('save',{tabIds:[tabs[0].id],close:false,name:'Save without closing'});
  assert.equal((await rpc('load')).sessionState.active[own.windowId].tracking,true);
  const before=(await rpc('load')).state.collections.find(c=>c.id===source.id);
  const stashed=await rpc('save',{tabIds:[tabs[0].id],close:true,name:'Partial stash'});
  assert.equal(stashed.closed.length,1);
  await delay(500);
  await rpc('session-checkpoint',{windowId:own.windowId});
  let loaded=await rpc('load');
  assert.deepEqual(loaded.state.collections.find(c=>c.id===source.id).links,before.links,'partial stash must not shrink the active saved collection');
  assert.equal(loaded.sessionState.active[own.windowId].tracking,false);
  assert.equal(loaded.state.collections.find(c=>c.id===source.id).autoUpdate,false);
  await rpc('save',{tabIds:[tabs[1].id],close:true,name:'Remaining stash'});
  await delay(500);
  await rpc('session-checkpoint',{windowId:own.windowId});
  loaded=await rpc('load');
  assert.deepEqual(loaded.state.collections.find(c=>c.id===source.id).links,before.links,'stashing all tabs must not empty the active saved collection');
  assert.equal(loaded.state.collections.find(c=>c.id===stashed.collectionId).links.length,1);
  assert(await app.evaluate(`document.querySelector('#current-collection')?.textContent.includes('Paused')`));
  results.push('Save-only keeps auto-update on; partial and complete stashes pause it, preserve the active collection and retain the stashed copies');
}


import assert from 'node:assert/strict';

export async function checkRecovery({
  app,
  rpc,
  connect,
  targets,
  extensionOrigin,
  windowId,
  origin,
  results,
  delay,
}) {
  const settle = async (ids) => {
    for (let i = 0; i < 100; i++) {
      if (
        await app.evaluate(
          `chrome.tabs.query({}).then(t=>${JSON.stringify(ids)}.every(id=>t.some(x=>x.id===id&&x.status==='complete'&&!x.pendingUrl)))`,
        )
      )
        return;
      await delay(100);
    }
    throw new Error('Recovery fixture pages did not finish loading');
  };
  const tab = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/undo-fixture')},active:false})`,
  );
  await settle([tab.id]);
  const stash = await rpc('save', { tabIds: [tab.id], name: 'Undo fixture', close: true });
  const undo = await rpc('undo-action', { id: stash.id, windowId });
  assert.equal(undo.restored.created.length, 1);
  const state = (await rpc('load')).state;
  assert(!state.collections.some((c) => c.id === stash.collectionId));
  const restored = (await rpc('load')).tabs.find((t) => t.id === undo.restored.created[0]);
  assert.equal(restored.resourceUrl, origin + '/undo-fixture');
  results.push('Undo stash restores closed pages as parked tabs and reverses the library change');

  const before = await rpc('edit', { kind: 'create', name: 'Earlier version' });
  const c = before.state.collections.find((c) => c.name === 'Earlier version');
  const edit = await rpc('edit', {
    kind: 'collection',
    collectionId: c.id,
    note: 'Original continuation',
  });
  const removed = await rpc('edit', { kind: 'delete-collection', collectionId: c.id });
  await rpc('edit', { kind: 'create', name: 'Newer work' });
  const denied = await app.evaluate(
    `chrome.runtime.sendMessage({action:'undo-action',data:{id:${JSON.stringify(removed.operation.id)},windowId:${windowId}}})`,
  );
  assert.equal(denied.ok, false);
  assert.match(denied.error, /can't undo after newer edits/i);
  await rpc('restore-library', { id: removed.operation.id, collectionIds: [c.id] });
  const after = (await rpc('load')).state.collections;
  assert(after.some((c) => c.name === 'Newer work'));
  assert(
    after.some(
      (c) => c.name === 'Earlier version (recovered)' && c.note === 'Original continuation',
    ),
  );
  results.push('Older library recovery creates selected copies and preserves newer edits');

  const metadata = await rpc('load');
  assert(
    metadata.journal.every((op) => !('before' in op) && !('tabs' in op) && !('snapshot' in op)),
  );
  const closed = await rpc('closed-records');
  assert(closed.some((r) => r.url === origin + '/undo-fixture'));
  results.push(
    'Routine refresh returns lightweight journal metadata; closed records persist separately',
  );

  const versions = [];
  const listener = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'ServiceWorker.workerVersionUpdated')
      versions.push(...message.params.versions);
  };
  app.ws.addEventListener('message', listener);
  await app.send('ServiceWorker.enable');
  await delay(80);
  const workerTarget = (await targets()).find(
    (t) => t.type === 'service_worker' && t.url === extensionOrigin + '/background.js',
  );
  assert(workerTarget);
  const worker = await connect(workerTarget.webSocketDebuggerUrl);
  await worker.send('Runtime.enable');
  const version = versions.find(
    (v) => v.scriptURL === extensionOrigin + '/background.js' && v.runningStatus === 'running',
  );
  assert(version, 'Actual worker version is identified');
  const failedTab = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/storage-failure')},active:false})`,
  );
  await settle([failedTab.id]);
  const beforeFailure = (await rpc('load')).state.revision;
  await worker.evaluate(
    `globalThis.__neoOriginalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='state')throw new DOMException('Simulated full disk','QuotaExceededError');return globalThis.__neoOriginalPut.apply(this,args);};`,
  );
  const failedSave = await app.evaluate(
    `chrome.runtime.sendMessage({action:'save',data:{tabIds:[${failedTab.id}],close:true}})`,
  );
  await worker.evaluate(
    `IDBObjectStore.prototype.put=globalThis.__neoOriginalPut;delete globalThis.__neoOriginalPut;`,
  );
  assert.equal(failedSave.ok, false);
  assert.equal((await rpc('load')).state.revision, beforeFailure);
  assert((await rpc('load')).tabs.some((t) => t.id === failedTab.id));
  results.push(
    'Actual IndexedDB write rejection leaves the source tab open and library revision unchanged',
  );
  const interruptedTab = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/interrupted')},active:false})`,
  );
  await settle([interruptedTab.id]);
  // Stall the browser side effect after the production operation has persisted its
  // close intent. This test-only injection is never part of the packaged extension.
  await worker.evaluate(
    `globalThis.__neoCloseReached=false;chrome.tabs.remove=async()=>{globalThis.__neoCloseReached=true;await new Promise(()=>{});}`,
  );
  await app.evaluate(
    `globalThis.__neoInterruptedResult=null;chrome.runtime.sendMessage({action:'save',data:{tabIds:[${interruptedTab.id}],name:'Interrupted recovery',close:true}}).then(r=>globalThis.__neoInterruptedResult=r).catch(e=>globalThis.__neoInterruptedResult={error:e.message});undefined`,
  );
  let reached = false;
  for (let i = 0; i < 100; i++) {
    reached = await worker.evaluate('globalThis.__neoCloseReached');
    if (reached) break;
    await delay(50);
  }
  assert(reached);
  worker.ws.close();
  await delay(50);
  await app.send('ServiceWorker.stopWorker', { versionId: version.versionId });
  await delay(150);
  const recovered = await rpc('load');
  assert(recovered.state.collections.some((c) => c.name === 'Interrupted recovery'));
  assert(recovered.tabs.some((t) => t.id === interruptedTab.id));
  assert(recovered.journal.some((op) => op.label === 'Stash tabs' && op.status === 'closing'));
  const restartedTarget = (await targets()).find(
    (t) => t.type === 'service_worker' && t.url === extensionOrigin + '/background.js',
  );
  assert(restartedTarget, 'The extension worker is available after restart');
  results.push(
    'Terminating the real worker after durable close intent preserves snapshot and source tab without replay',
  );

  const newWorker = await connect(restartedTarget.webSocketDebuggerUrl);
  await newWorker.send('Runtime.enable');
  assert.equal(
    await newWorker.evaluate('typeof globalThis.__neoCloseReached'),
    'undefined',
    'Discarded worker globals prove restart',
  );
  const first = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/partially-closed')},active:false})`,
  );
  const second = await app.evaluate(
    `chrome.tabs.create({url:${JSON.stringify(origin + '/still-open')},active:false})`,
  );
  await settle([first.id, second.id]);
  await newWorker.evaluate(
    `globalThis.__neoOriginalRemove=chrome.tabs.remove;globalThis.__neoRemoved=false;chrome.tabs.remove=async id=>{await globalThis.__neoOriginalRemove(id);globalThis.__neoRemoved=true;await new Promise(()=>{});};`,
  );
  await app.evaluate(
    `chrome.runtime.sendMessage({action:'save',data:{tabIds:[${first.id},${second.id}],name:'Partial interruption',close:true}}).catch(()=>{});undefined`,
  );
  let removedOnce = false;
  for (let i = 0; i < 30; i++) {
    removedOnce = await newWorker.evaluate('globalThis.__neoRemoved');
    if (removedOnce) break;
    await delay(50);
  }
  assert(removedOnce);
  newWorker.ws.close();
  await delay(50);
  await app.send('ServiceWorker.stopWorker', { versionId: version.versionId });
  await delay(150);
  const partial = await rpc('load');
  const operation = partial.journal.find(
    (op) =>
      op.collectionId ===
      partial.state.collections.find((c) => c.name === 'Partial interruption').id,
  );
  assert(!partial.tabs.some((t) => t.id === first.id));
  assert(partial.tabs.some((t) => t.id === second.id));
  assert.equal(operation.status, 'closing');
  const reopened = await rpc('recover', { id: operation.id, windowId });
  assert.equal(reopened.created.length, 1);
  assert(reopened.reused.includes(second.id));
  results.push(
    'Worker termination after one actual close recovers the missing page and reuses the untouched source',
  );
  const migration = await app.evaluate(`(async()=>{
    const name='neo-migration-fixture-'+Date.now();
    const state={schema:1,revision:3,settings:{theme:'dark'},collections:[{id:'legacy',name:'Legacy collection',color:'mint',note:'Preserved note',groups:[],links:[{id:'legacy-link',title:'Old page',url:'https://example.org/old',note:'',groupId:null}]}]};
    const operation={id:'legacy-op',label:'Stash tabs',at:Date.now(),status:'complete',revision:3,before:{...state,collections:[]},snapshot:state.collections[0],tabs:[{id:23,title:'Old page',url:'https://example.org/old'}],closed:[23],collectionId:'legacy'};
    await new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{for(const store of ['state','journal','previews','parked'])request.result.createObjectStore(store,{keyPath:'id'});};request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['state','journal'],'readwrite');tx.objectStore('state').put({id:'library',value:state});tx.objectStore('journal').put(operation);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
    const original=indexedDB.open.bind(indexedDB);indexedDB.open=(requested,version)=>original(requested==='neo-library'?name:requested,version);
    try{const module=await import('./lib/db.js?migration-check');const migrated=await module.getState();const metadata=await module.all('journalMeta');const closed=await module.all('closed');return {name:migrated.collections[0].name,note:migrated.collections[0].note,theme:migrated.settings.theme,metadata:metadata.length,closed:closed.length,privateSnapshots:metadata.some(op=>'before'in op)};}finally{indexedDB.open=original;}
  })()`);
  assert.deepEqual(migration, {
    name: 'Legacy collection',
    note: 'Preserved note',
    theme: 'dark',
    metadata: 1,
    closed: 1,
    privateSnapshots: false,
  });
  results.push(
    'Real IndexedDB v1-to-v2 migration preserves library/settings and backfills lightweight history',
  );
  app.ws.removeEventListener('message', listener);
}

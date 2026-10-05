
import assert from 'node:assert/strict';
import http from 'node:http';
export async function checkTopicRegroup({app,rpc,results,delay,origin}) {
  const wait=async(fn,message)=>{for(let i=0;i<100;i++){if(await fn())return;await delay(100);}throw Error(message);};
  let payload,requests=0,leaveLast=false;
  const server=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;
    const prompt=JSON.parse(raw).messages[0].content;payload=JSON.parse(prompt.split('\nData: ')[1]);requests++;
    let ids=payload.groupable;
    if(leaveLast)ids=ids.slice(0,-1);
    const answer={name:'Topic collection',note:'Useful research references.',groups:[{name:'Cross-site research',ids}]};
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(answer)}}]}));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try {
    await rpc('settings',{settings:{autoGroup:false,provider:'compatible',model:'fixture',aiEndpoint:`http://127.0.0.1:${server.address().port}/chat/completions`,rules:[],regroupExisting:true}});
    await app.evaluate(`document.querySelector('.tab-more-button').click();[...document.querySelectorAll('[role="menuitem"]')].find(b=>b.textContent==='Group by topic with AI').click()`);
    assert.equal(await app.evaluate(`document.querySelector('#dialog').textContent.includes('Organise this space')`),false);
    await app.evaluate(`document.querySelector('#dialog').close()`);await delay(50);
    for(const scope of [{type:'space',id:'main'},{type:'all'}])await assert.rejects(rpc('ai-assist',{kind:'library',scope}),/Select open tabs or one collection to organise/);
    assert.equal(requests,0,'Removed workspace action reached the provider');
    results.push('AI tools has no space organisation; space/all-space requests are rejected without a provider call');
    const own=await app.evaluate('chrome.tabs.getCurrent()');
    const tabs=await app.evaluate(`Promise.all(Array.from({length:4},(_,i)=>chrome.tabs.create({url:${JSON.stringify(origin)}+'/topic/'+i,active:false})))`);
    await wait(()=>app.evaluate(`chrome.tabs.query({windowId:${own.windowId}}).then(ts=>ts.filter(t=>${JSON.stringify(tabs.map(t=>t.id))}.includes(t.id)).every(t=>t.status==='complete'))`),'Tabs did not settle');
    const group=await app.evaluate(`chrome.tabs.group({tabIds:${JSON.stringify(tabs.slice(0,2).map(t=>t.id))}})`);
    await app.evaluate(`chrome.tabGroups.update(${group},{title:'Old website group',color:'blue'})`);
    // AI changes should survive the next automatic website grouping checkpoint.
    await rpc('settings',{settings:{autoGroup:true}});await delay(700);
    const result=await rpc('group-topic',{windowId:own.windowId,requestId:'flash-regression',regroupExisting:true});
    const snapshot=()=>app.evaluate(`(async()=>{const gs=await chrome.tabGroups.query({windowId:${own.windowId}});return (await chrome.tabs.query({windowId:${own.windowId}})).sort((a,b)=>a.index-b.index).map(t=>[t.id,t.groupId,gs.find(g=>g.id===t.groupId)?.title]);})()`);
    const after=await snapshot();assert(after.some(t=>t[2]==='Cross-site research'));
    await delay(1800);assert.deepEqual(await snapshot(),after,'Automatic website grouping overwrote the AI result and flashed the layout');
    await rpc('undo-action',{id:result.id,windowId:own.windowId});
    results.push('Topic groups remain stable with automatic website grouping on; Undo survives later checkpoints');
    await rpc('settings',{settings:{autoGroup:false}});
    await app.evaluate(`chrome.tabs.ungroup(${JSON.stringify(tabs.slice(2).map(t=>t.id))})`);await delay(500);
    const preserved=(await snapshot()).filter(t=>tabs.slice(0,2).some(x=>x.id===t[0]));
    const open=async()=>{
      await app.evaluate(`document.querySelector('.tab-more-button').click();[...document.querySelectorAll('[role="menuitem"]')].find(b=>b.textContent==='Group by topic with AI').click()`);
      await wait(()=>app.evaluate(`!!document.querySelector('dialog[open] .topic-apply')`),'Topic options did not open');
    };
    // Undo may recreate browser groups with new native IDs; compare membership
    // and names, not those implementation-generated IDs.
    const membership=async()=>(await snapshot()).map(([id,,name])=>[id,name]);
    const beforeApply=await membership();
    let before=requests;await open();assert.equal(requests,before,'Opening options sent an AI request');
    await app.evaluate(`document.querySelector('dialog input[aria-label="Include already grouped tabs"]').checked=false;document.querySelector('.topic-apply').click()`);
    await wait(()=>app.evaluate(`document.querySelector('#toast')?.textContent.includes('Grouped 2 tabs')`),'Exclude-grouped action failed');
    assert.equal(requests,before+1);assert.deepEqual(payload.links.filter(l=>payload.groupable.includes(l.id)).map(l=>l.url).sort(),[origin+'/topic/2',origin+'/topic/3']);
    assert.deepEqual((await snapshot()).filter(t=>tabs.slice(0,2).some(x=>x.id===t[0])),preserved,'Excluded groups changed');
    await app.evaluate(`[...document.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
    await wait(async()=>JSON.stringify(await membership())===JSON.stringify(beforeApply),'UI Undo did not restore the native layout');
    await open();assert.equal(await app.evaluate(`document.querySelector('dialog input').checked`),false,'Choice was not remembered');
    before=requests;
    await app.evaluate(`document.querySelector('dialog input').checked=true;document.querySelector('.topic-apply').click()`);
    await wait(()=>app.evaluate(`document.querySelector('#toast')?.textContent.includes('Grouped 4 tabs')`),'Include-grouped action failed');
    assert.equal(requests,before+1);assert.equal(payload.links.length,4);assert(payload.links.every(t=>!('group' in t)&&!('groupId' in t)),'Existing groups leaked into topic input');
    assert((await snapshot()).filter(t=>tabs.some(x=>x.id===t[0])).every(t=>t[2]==='Cross-site research'));
    results.push('Topic modal remembers include/exclude; no request before Apply; excluded native groups stay intact; included tabs regroup across old boundaries');
    leaveLast=true;
    const solo=await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(origin+'/independent')},active:false})`);
    await wait(()=>app.evaluate(`chrome.tabs.get(${solo.id}).then(t=>t.status==='complete')`),'Independent tab did not load');
    const operation=await rpc('group-topic',{windowId:own.windowId,tabIds:[...tabs.map(t=>t.id),solo.id],regroupExisting:true,requestId:'independent-first'});
    const arranged=await app.evaluate(`chrome.tabs.query({windowId:${own.windowId}}).then(ts=>ts.filter(t=>${JSON.stringify([...tabs.map(t=>t.id),solo.id])}.includes(t.id)).sort((a,b)=>a.index-b.index))`);
    assert.equal(arranged[0].groupId,-1);assert(arranged.slice(1).every(t=>t.groupId>=0),'AI did not put the independent tab before the group');
    await rpc('undo-action',{id:operation.id,windowId:own.windowId});
    results.push('AI organization places independent tabs before groups and retains Undo');
    leaveLast=false;
    const adopted=await rpc('save',{windowId:own.windowId,tabIds:[...tabs.map(t=>t.id),solo.id],adopt:true,minimal:true,name:'Current research context'});
    await rpc('collection-auto-update',{windowId:own.windowId,collectionId:adopted.collectionId,enabled:true});
    await rpc('edit',{kind:'collection',collectionId:adopted.collectionId,note:'Compare reference materials across websites.'});
    const current=()=>rpc('load').then(r=>r.state.collections.find(c=>c.id===adopted.collectionId));
    const metadata=await current();
    const openPlan=await rpc('group-topic',{windowId:own.windowId,regroupExisting:true,requestId:'context-parity'});
    const nativePayload=structuredClone(payload),nativeMembership=await membership();
    assert.equal(nativePayload.name,metadata.name);assert.equal(nativePayload.note,metadata.note);
    assert.equal((await current()).name,metadata.name,'Open-tab grouping renamed the current collection');
    assert.equal((await current()).note,metadata.note,'Open-tab grouping rewrote the current note');
    await rpc('undo-action',{id:openPlan.id,windowId:own.windowId});
    await rpc('collection-ai',{collectionId:adopted.collectionId,windowId:own.windowId,regroupExisting:true,requestId:'collection-parity'});
    assert.deepEqual(payload,nativePayload,'The same current collection produced different AI context through open tabs');
    assert.deepEqual(await membership(),nativeMembership,'Equivalent AI groups were applied differently');
    results.push('Collection and open-tab AI send identical current-context payloads and apply equivalent grouping; open-tab actions preserve collection name/note');
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}

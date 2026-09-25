
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkDragPlacement({ app, rpc, results, delay, origin, out }) {
  const wait = async (fn, message) => {
    for (let i=0;i<100;i++) { if(await fn())return; await delay(60); }
    throw Error(message + ': ' + await app.evaluate('document.querySelector("#toast")?.textContent'));
  };
  const shot = async name => fs.writeFile(path.join(out,name+'.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
  const rect = selector => app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()`);
  const marker = () => app.evaluate(`(()=>{const n=document.querySelector('.drop-insertion');if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,count:document.querySelectorAll('.drop-insertion').length}})()`);
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await rpc('settings',{settings:{autoGroup:false,theme:'dark'}});
  const tabs=await app.evaluate(`Promise.all(Array.from({length:4},(_,i)=>chrome.tabs.create({url:${JSON.stringify(origin)}+'/drag-placement/'+i,active:false})))`);
  // tabs.create may return an empty URL while navigation is still pending.
  tabs.forEach((tab,i)=>{tab.url=origin+'/drag-placement/'+i;});
  const nativeGroup=await app.evaluate(`chrome.tabs.group({tabIds:${JSON.stringify(tabs.slice(0,3).map(t=>t.id))}})`);
  await app.evaluate(`chrome.tabGroups.update(${nativeGroup},{title:'Source group',color:'blue'})`);
  const link=(id,groupId=null)=>({id,title:id,url:origin+'/'+id,groupId});
  await rpc('import',{collections:[
    {name:'Destination',groups:[{id:'g',name:'Existing group',collapsed:false}],links:[link('First'),link('Second'),link('Group first','g'),link('Group second','g')]},
    {name:'Source saved',groups:[{id:'s',name:'Saved group',collapsed:false}],links:[link('Saved loose'),link('Saved child','s'),link('Saved sibling','s')]},
    {name:'Empty destination',groups:[],links:[]},
    {name:'Truncated',groups:[],links:Array.from({length:12},(_,i)=>link('Preview '+i))},
  ]});
  const collections=(await rpc('load')).state.collections;
  const dest=collections.find(c=>c.name==='Destination'),source=collections.find(c=>c.name==='Source saved'),empty=collections.find(c=>c.name==='Empty destination'),truncated=collections.find(c=>c.name==='Truncated');
  const card=id=>`.collection[data-collection-id="${id}"]`;
  const saved=(c,title)=>card(c.id)+` .saved-row[data-link-id="${c.links.find(l=>l.title===title).id}"]`;
  const native=id=>`.tab-row[data-tab-id="${id}"]`;
  const group=card(dest.id)+` .saved-group[data-group-id="${dest.groups[0].id}"]`;
  const load=id=>rpc('load').then(r=>r.state.collections.find(c=>c.id===id));
  await wait(()=>app.evaluate(`document.querySelectorAll('.collection').length===4&&document.querySelectorAll('#tabs .tab-row').length===4`),'Fixture not visible');
  await app.send('Input.setInterceptDrags',{enabled:true});
  const start=async selector=>{
    await wait(()=>app.evaluate(`!document.getAnimations().some(a=>a.playState==='running')`),'Move animation did not settle');
    await app.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);
    const r=await rect(selector),p={x:r.left+r.width*.45,y:r.top+r.height/2};
    app.dragEvents.length=0;
    await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
    await app.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});
    for(let i=1;i<=4;i++)await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+10*i,y:p.y+i,button:'left',buttons:1});
    await wait(()=>app.dragEvents.length,'Native drag did not start');
    return app.dragEvents.at(-1).data;
  };
  const over=async(data,p)=>{
    for(const type of ['dragEnter','dragOver'])await app.send('Input.dispatchDragEvent',{type,...p,data});
    await delay(30);
  };
  const end=async(data,p,cancel=false,modifiers=0)=>{
    await app.send('Input.dispatchDragEvent',{type:cancel?'dragCancel':'drop',...p,data,modifiers});
    await app.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
    await wait(()=>app.evaluate(`!document.querySelector('.drop-insertion')&&!document.body.classList.contains('dragging-open-tabs')`),'Feedback did not clear');
    await delay(180);
  };
  // The same native-row boundary is stable even when the hit target is group padding.
  let data=await start(native(tabs[3].id)+' .tab-open');
  const a=await rect(native(tabs[0].id)),b=await rect(native(tabs[1].id)),wrapper=await rect(`.open-tab-group[data-group-id="${nativeGroup}"]`);
  const y=(a.bottom+b.top)/2;
  await over(data,{x:a.left+35,y:y-1}); const boundary=await marker();
  assert.equal(boundary?.height,2,'Native tab drag needs a visible insertion line');
  for(const p of [{x:a.left+35,y:y+1},{x:wrapper.left+4,y},{x:a.left+35,y:y-1}]){
    await over(data,p);assert.deepEqual(await marker(),boundary,'Native row/group-padding boundary jumps');
  }
  // Exercise the parent target explicitly: native drag events can target the
  // padding/container between descendant rows, not only the row under a hit test.
  await app.evaluate(`document.querySelector('.open-tab-group[data-group-id="${nativeGroup}"]').dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,clientX:${wrapper.left+4},clientY:${y},dataTransfer:new DataTransfer()}))`);
  assert.deepEqual(await marker(),boundary,'Parent dragover must not overwrite the row boundary with group-end placement');
  await shot('stable-native-boundary');
  await end(data,{x:a.left+35,y},true);
  results.push('Native row insertion remains identical across children, row boundaries and group padding');

  data=await start(native(tabs[0].id)+' .tab-open');
  let r=await rect(saved(dest,'Second')),p={x:r.left+50,y:r.top+3};
  await over(data,p);
  assert.equal((await marker())?.height,2,'Open tab needs a saved-list insertion line');
  assert.equal(await app.evaluate(`document.querySelectorAll('.collection.drag-over').length`),0);
  await shot('open-tab-insertion');
  await end(data,p);
  await wait(async()=> (await load(dest.id)).links.length===5,'Open tab not saved');
  let changed=await load(dest.id);
  assert.equal(changed.links[1].url,tabs[0].url);assert.equal(changed.links[1].groupId,null);assert.equal(changed.groups.length,1);
  assert.equal(await app.evaluate(`chrome.tabs.get(${tabs[0].id}).then(t=>t.groupId)`),nativeGroup);
  results.push('One grouped open tab inserts at the line as a loose link; browser tabs and source group stay unchanged');

  // A group header explicitly carries its group; placement is between saved groups.
  data=await start(`.open-tab-group[data-group-id="${nativeGroup}"] .open-group-header .editable-name`);
  r=await rect(group);p={x:r.left+50,y:r.top+3};
  await over(data,p);assert.equal((await marker())?.height,2);
  await shot('whole-group-insertion');await end(data,p);
  await wait(async()=> (await load(dest.id)).groups.length===2,'Whole group not saved');
  changed=await load(dest.id);assert.deepEqual(changed.groups.map(g=>g.name),['Source group','Existing group']);
  assert.equal(changed.links.filter(l=>l.groupId===changed.groups[0].id).length,3);
  results.push('Whole browser-group drag preserves its title, members and relative group placement');

  // Collapsed destination group accepts a link without importing the source group.
  await app.evaluate(`document.querySelector('${card(dest.id)} .more-links')?.click()`);
  await wait(()=>app.evaluate(`!!document.querySelector('${group}')`),'Existing group hidden by preview limit');
  await rpc('edit',{kind:'group',collectionId:dest.id,groupId:dest.groups[0].id,collapsed:true});
  await wait(()=>app.evaluate(`!document.querySelector('${group} .group-members')`),'Group not folded');
  data=await start(native(tabs[1].id)+' .tab-open');r=await rect(group);p={x:r.left+60,y:r.top+15};
  await over(data,p);assert.equal((await marker())?.height,2);await end(data,p);
  await wait(async()=> (await load(dest.id)).links.some(l=>l.url===tabs[1].url&&l.groupId===dest.groups[0].id),'Collapsed-group drop lost membership');
  assert.equal((await load(dest.id)).groups.length,2);
  assert.equal((await load(dest.id)).groups.find(g=>g.id===dest.groups[0].id).collapsed,false);

  // A saved child dragged out of its group into a new collection becomes loose.
  data=await start(saved(source,'Saved child')+' .link-open');
  await app.evaluate(`document.querySelector('.add-collection').scrollIntoView({block:'nearest'})`);
  r=await rect('.add-collection');p={x:r.left+50,y:r.top+15};await over(data,p);await end(data,p);
  await wait(async()=> (await rpc('load')).state.collections.length===5,'New collection not created');
  const created=(await rpc('load')).state.collections.at(-1);
  assert.equal(created.groups.length,0);assert.equal(created.links[0].title,'Saved child');assert.equal(created.links[0].groupId,null);
  results.push('Saved single-link drop into a new collection does not carry the source group');

  // The insertion after the last preview row is before hidden content, not at the tail.
  await app.evaluate(`document.querySelector('${card(truncated.id)}').scrollIntoView({block:'start'})`);
  data=await start(native(tabs[3].id)+' .tab-open');
  r=await rect(saved(truncated,'Preview 7'));p={x:r.left+45,y:r.bottom-3};await over(data,p);await end(data,p);
  await wait(async()=> (await load(truncated.id)).links.length===13,'Truncated collection did not receive tab');
  assert.equal((await load(truncated.id)).links[8].url,tabs[3].url);
  results.push('Dropping at the last visible preview row inserts before the first hidden link');

  // Empty and folded cards each show a line and accept the drop.
  for(const folded of [false,true]){
    await rpc('edit',{kind:'collection',collectionId:empty.id,collapsed:folded});await delay(150);
    await app.evaluate(`document.querySelector('${card(empty.id)}').scrollIntoView({block:'nearest'})`);
    data=await start(native(tabs[2].id)+' .tab-open');r=await rect(card(empty.id)+(folded?' .collection-head':' .collection-body > .empty'));p={x:r.left+60,y:r.top+r.height/2};
    await over(data,p);assert.equal((await marker())?.height,2);await end(data,p);
  }
  assert.equal((await load(empty.id)).links.length,2);assert.equal((await load(empty.id)).groups.length,0);
  assert.equal((await load(empty.id)).collapsed,false);
  results.push('Empty and folded collection drops remain valid, use a line and save loose tabs');

  await app.evaluate(`document.querySelector('#main').scrollTop=0`);
  data=await start(saved(dest,'Second')+' .link-open');r=await rect(saved(dest,'First'));p={x:r.left+50,y:r.top+3};
  await over(data,p);await end(data,p);
  await wait(async()=> (await load(dest.id)).links[0].title==='Second','Saved-link reordering failed');
  const count=(await load(dest.id)).links.length;
  data=await start(saved(dest,'Second')+' .link-open');r=await rect(saved(dest,'First'));p={x:r.left+50,y:r.bottom-3};
  await over(data,p);await end(data,p,false,2);
  await wait(async()=> (await load(dest.id)).links.length===count+1,'Ctrl-drag did not copy');
  changed=await load(dest.id);
  assert.equal(changed.links.filter(l=>l.title==='Second').length,2);assert.equal(new Set(changed.links.map(l=>l.id)).size,changed.links.length);
  results.push('Saved links reorder at the indicated boundary and Ctrl-drag copies with a distinct identity');

  // Selected individual browser rows stay loose even if every selected tab shares a group.
  await app.evaluate(`document.querySelector('#library-select-mode').click();document.querySelector('${native(tabs[0].id)} .tab-select').click();document.querySelector('${native(tabs[1].id)} .tab-select').click()`);
  data=await start(native(tabs[0].id)+' .tab-open');
  r=await rect(saved(dest,'First'));p={x:r.left+55,y:r.top+3};await over(data,p);await end(data,p);
  await wait(async()=> (await load(dest.id)).links.length===count+3,'Selected tabs not inserted');
  changed=await load(dest.id);const firstIndex=changed.links.findIndex(l=>l.title==='First');
  assert.deepEqual(changed.links.slice(firstIndex-2,firstIndex).map(l=>l.url),tabs.slice(0,2).map(t=>t.url));
  assert(changed.links.slice(firstIndex-2,firstIndex).every(l=>l.groupId===null));
  await app.evaluate(`document.querySelector('#library-select-mode').click()`);
  results.push('Dragging selected browser rows inserts all selected tabs in order without importing their group');

  // The destination stays usable in list/light mode, and edge scroll updates the line.
  await rpc('settings',{settings:{view:'list',theme:'light'}});await delay(180);
  data=await start(native(tabs[3].id)+' .tab-open');
  await app.evaluate(`document.querySelector('#main').scrollTop=0`);
  r=await rect(saved(dest,'First'));p={x:r.left+50,y:r.top+3};await over(data,p);
  assert.equal((await marker())?.height,2);await shot('light-list-insertion');
  await over(data,{x:r.left+60,y:980});
  await wait(()=>app.evaluate(`document.querySelector('#main').scrollTop>50`),'Drag edge scrolling failed');
  await end(data,{x:r.left+60,y:980},true);
  results.push('Light/list view keeps the insertion line; edge scrolling works and cancellation clears feedback');
  await rpc('settings',{settings:{view:'board',theme:'dark'}});await delay(150);
  await app.send('Page.reload');
  await wait(()=>app.evaluate(`document.querySelectorAll('.collection').length===5`),'Reload failed');
  assert.equal((await load(truncated.id)).links[8].url,tabs[3].url);
  results.push('Chosen insertion order persists after reloading the extension page');

  // Match the reported active-collection setup. Manual drops must not be
  // overwritten by the next live-tab checkpoint.
  const windowId=await app.evaluate('chrome.windows.getCurrent().then(w=>w.id)');
  const adoption=await rpc('save',{adopt:true,windowId,tabIds:tabs.map(t=>t.id)});
  const activeId=adoption.collectionId;
  await rpc('collection-auto-update',{collectionId:activeId,windowId,enabled:true});
  await wait(()=>app.evaluate(`!!document.querySelector('${card(activeId)}')`),'Active collection not rendered');
  await app.evaluate(`document.querySelector('${card(activeId)}').scrollIntoView({block:'nearest'})`);
  data=await start(native(tabs[3].id)+' .tab-open');r=await rect(card(activeId)+' .collection-head');p={x:r.left+60,y:r.top+20};
  await over(data,p);await end(data,p);
  await wait(async()=> (await load(activeId)).autoUpdate===false,'Active drop did not pause mirroring');
  const placed=await load(activeId);
  await app.evaluate(`chrome.tabs.update(${tabs[3].id},{url:${JSON.stringify(origin+'/after-drop')}})`);
  await delay(1100);
  assert.deepEqual((await load(activeId)).links,placed.links);
  results.push('Dropping into an auto-updating active collection pauses mirroring and survives later browser navigation');
}

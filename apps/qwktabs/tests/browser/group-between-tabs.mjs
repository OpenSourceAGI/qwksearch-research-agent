
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkGroupBetweenTabs({app,rpc,results,delay,origin,out}) {
  const wait=async(fn,message)=>{for(let i=0;i<100;i++){if(await fn())return;await delay(60);}throw Error(message);};
  const rect=selector=>app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()`);
  const marker=()=>app.evaluate(`(()=>{const n=document.querySelector('.drop-insertion');if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()`);
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await rpc('settings',{settings:{autoGroup:false,theme:'dark'}});
  const tabs=await app.evaluate(`Promise.all([0,1].map(i=>chrome.tabs.create({url:${JSON.stringify(origin)}+'/group-placement/'+i,active:false})))`);
  const nativeGroup=await app.evaluate(`chrome.tabs.group({tabIds:${JSON.stringify(tabs.map(t=>t.id))}})`);
  await app.evaluate(`chrome.tabGroups.update(${nativeGroup},{title:'Browser group',color:'blue'})`);
  const link=(id,groupId=null)=>({id,title:id,url:origin+'/'+id,groupId});
  await rpc('import',{collections:[
    {name:'Target',groups:[],links:[link('A'),link('B'),link('C')]},
    {name:'Source',groups:[{id:'g',name:'Saved group',collapsed:false}],links:[link('D'),link('X','g'),link('Y','g')]},
  ]});
  const collections=(await rpc('load')).state.collections,target=collections.find(c=>c.name==='Target'),source=collections.find(c=>c.name==='Source');
  const card=id=>`.collection[data-collection-id="${id}"]`;
  const row=(c,name)=>card(c.id)+` .saved-row[data-link-id="${c.links.find(l=>l.title===name).id}"]`;
  const group=(id,c=target)=>card(c.id)+` .saved-group[data-group-id="${id}"]`;
  const load=id=>rpc('load').then(r=>r.state.collections.find(c=>c.id===id));
  const displayed=()=>app.evaluate(`[...document.querySelector(${JSON.stringify(card(target.id)+' .collection-body')}).children].filter(n=>n.matches('.saved-row,.saved-group')).map(n=>n.dataset.linkId||n.dataset.groupId)`);
  const undo=async()=>{await app.evaluate(`[...document.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);};
  await wait(()=>app.evaluate(`document.querySelectorAll('.collection').length===2&&document.querySelectorAll('#tabs .tab-row').length===2`),'Fixture did not render');
  await app.send('Input.setInterceptDrags',{enabled:true});
  const start=async selector=>{
    await wait(()=>app.evaluate(`!document.getAnimations().some(a=>a.playState==='running')`),'Previous animation did not settle');
    await app.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);
    const r=await rect(selector),p={x:r.left+r.width*.45,y:r.top+r.height/2};app.dragEvents.length=0;
    await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
    await app.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});
    for(let i=1;i<=4;i++)await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+i*10,y:p.y+i,button:'left',buttons:1});
    await wait(()=>app.dragEvents.length,'Group drag did not start');return app.dragEvents.at(-1).data;
  };
  const over=async(data,p,modifiers=0)=>{for(const type of ['dragEnter','dragOver'])await app.send('Input.dispatchDragEvent',{type,...p,data,modifiers});await delay(35);};
  const end=async(data,p,{cancel=false,copy=false}={})=>{
    await app.send('Input.dispatchDragEvent',{type:cancel?'dragCancel':'drop',...p,data,modifiers:copy?2:0});
    await app.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
    await wait(()=>app.evaluate(`!document.querySelector('.drop-insertion')`),'Insertion line did not clear');await delay(180);
  };
  const before=async selector=>{await app.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const r=await rect(selector);return {x:r.left+60,y:r.top+2};};

  for(const zoom of [1,1.25,1.5]) {
    await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,${zoom}))`);await delay(160);
    const data=await start(`.open-tab-group[data-group-id="${nativeGroup}"] .open-group-header .editable-name`);
    const p=await before(row(target,'B'));await over(data,p);const stable=await marker();
    assert.equal(stable?.height,2,'A group needs an insertion line between loose tabs');
    for(const dx of [0,20,40]) {await over(data,{x:p.x+dx,y:p.y+1});assert.deepEqual(await marker(),stable);}
    await fs.writeFile(path.join(out,`group-between-tabs-${zoom}.png`),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
    await end(data,p);
    await wait(async()=> (await load(target.id)).groups.length===1,'Browser group did not save');
    const c=await load(target.id),gid=c.groups[0].id;
    assert.deepEqual(await displayed(),[target.links[0].id,gid,target.links[1].id,target.links[2].id]);
    assert.deepEqual(c.links.map(l=>l.groupId),[null,gid,gid,null,null]);
    assert.equal(c.groups[0].name,'Browser group');
    await undo();await wait(async()=> !(await load(target.id)).groups.length,'Undo did not restore standalone tabs');
  }
  results.push('Browser groups insert between loose tabs with stable geometry at 100%, 125% and 150% and working Undo');
  await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,1))`);await delay(150);
  const savedId=source.groups[0].id;
  let data=await start(group(savedId,source)+' .editable-name'),p=await before(row(target,'B'));
  await over(data,p);await end(data,p);
  await wait(async()=> (await load(target.id)).groups.length===1,'Saved group did not move');
  assert.equal((await load(source.id)).groups.length,0);
  assert.deepEqual(await displayed(),[target.links[0].id,savedId,target.links[1].id,target.links[2].id]);
  for(const title of ['A','C']) {
    data=await start(group(savedId)+' .editable-name');p=await before(row(target,title));await over(data,p);await end(data,p);
    const order=title==='A'?[savedId,...target.links.map(l=>l.id)]:[target.links[0].id,target.links[1].id,savedId,target.links[2].id];
    await wait(async()=> JSON.stringify(await displayed())===JSON.stringify(order),'Saved group did not follow the insertion line');
  }
  // A loose row can cross that group without joining it when the gap is outside it.
  data=await start(row(target,'A')+' .link-open');p=await before(row(target,'C'));await over(data,p);await end(data,p);
  await wait(async()=> JSON.stringify(await displayed())===JSON.stringify([target.links[1].id,savedId,target.links[0].id,target.links[2].id]),'Loose row could not cross the group');
  assert.equal((await load(target.id)).links.find(l=>l.title==='A').groupId,null);
  const placed=await load(target.id);
  await app.send('Page.reload');await wait(()=>app.evaluate(`document.querySelectorAll('.collection').length===2`),'Reload did not finish');
  assert.deepEqual((await load(target.id)).itemOrder,placed.itemOrder);
  assert.deepEqual(await displayed(),[target.links[1].id,savedId,target.links[0].id,target.links[2].id]);
  results.push('Saved groups and loose tabs can cross each other; group identity, membership and mixed order survive reload');
  data=await start(group(savedId)+' .editable-name');p=await before(row(target,'B'));await over(data,p,2);await end(data,p,{copy:true});
  await wait(async()=> (await load(target.id)).groups.length===2,'Ctrl-drag did not copy the group');
  const copied=(await load(target.id)).groups.find(g=>g.id!==savedId);
  assert.equal(copied.name,'Saved group');assert.equal((await load(target.id)).links.filter(l=>l.groupId===copied.id).length,2);
  assert.equal((await displayed())[0],copied.id);
  await undo();await wait(async()=> (await load(target.id)).groups.length===1,'Copy Undo did not remove copied group');
  assert.deepEqual((await load(target.id)).links,placed.links);
  results.push('Ctrl-copy inserts an independent whole group at the shown position and Undo restores the prior order');

  await rpc('switch',{windowId:tabs[0].windowId,destinationId:target.id,outgoing:'keep'});
  await delay(1300);
  assert.deepEqual((await load(target.id)).itemOrder,placed.itemOrder,'Resuming must not discard the mixed order during live mirroring');
  results.push('Switching to the collection preserves its mixed order when live tracking resumes');
}

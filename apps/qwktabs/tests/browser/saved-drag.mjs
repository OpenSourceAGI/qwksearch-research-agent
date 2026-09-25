
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkSavedDrag({app,rpc,results,delay,origin,out}) {
 const wait=async(fn,message)=>{for(let i=0;i<100;i++){if(await fn())return;await delay(60);}throw Error(message);};
 const rect=selector=>app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()`);
 const marker=()=>app.evaluate(`(()=>{const n=document.querySelector('.drop-insertion');if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()`);
 const shot=async name=>fs.writeFile(path.join(out,name+'.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
 await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await rpc('settings',{settings:{autoGroup:false,theme:'dark'}});
 const link=(id,groupId=null)=>({id,title:id,url:origin+'/'+id,groupId});
 await rpc('import',{collections:[{name:'Saved drag fixture',note:'Notes are not insertion targets',groups:[
   {id:'a',name:'Folded A',collapsed:true},{id:'b',name:'Folded B',collapsed:true},{id:'c',name:'Expanded C',collapsed:false}],
   links:[link('Loose'),link('Hidden A','a'),link('Hidden B','b'),link('First C','c'),link('Second C','c')]},
   {name:'Other collection',note:'Keep this note unchanged',groups:[],links:[]}]});
 const collection=(await rpc('load')).state.collections.find(c=>c.name==='Saved drag fixture');
 const card=`.collection[data-collection-id="${collection.id}"]`;
 const row=title=>card+` .saved-row[data-link-id="${collection.links.find(l=>l.title===title).id}"]`;
 const group=i=>card+` .saved-group[data-group-id="${collection.groups[i].id}"]`;
 const load=()=>rpc('load').then(r=>r.state.collections.find(c=>c.id===collection.id));
 await wait(()=>app.evaluate(`!!document.querySelector('${row('Loose')}')`),'Fixture missing');
 await app.send('Input.setInterceptDrags',{enabled:true});
 const start=async selector=>{
   await wait(()=>app.evaluate(`!document.getAnimations().some(a=>a.playState==='running')`),'Animation running');
   await app.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);
   const r=await rect(selector),p={x:r.left+r.width*.45,y:r.top+r.height/2};app.dragEvents.length=0;
   await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
   await app.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});
   for(let i=1;i<=4;i++)await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+i*10,y:p.y+i,button:'left',buttons:1});
   await wait(()=>app.dragEvents.length,'Drag missing');return app.dragEvents.at(-1).data;
 };
 const over=async(data,p,modifiers=0)=>{for(const type of ['dragEnter','dragOver'])await app.send('Input.dispatchDragEvent',{type,...p,data,modifiers});await delay(25);};
 const end=async(data,p,cancel=false,modifiers=0)=>{
   await app.send('Input.dispatchDragEvent',{type:cancel?'dragCancel':'drop',...p,data,modifiers});
   await app.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await delay(220);
   assert.equal(await marker(),null,'Drag feedback remains after drop');
 };
 for(const zoom of [1,1.25,1.5]) {
   await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,${zoom}))`);await delay(200);
   await app.evaluate(`document.querySelector('#main').scrollTop=0`);
   const before=await load();let data=await start(row('Loose')+' .link-open');
   let r=await rect(row('First C')),p={x:r.left+70,y:r.top+3};await over(data,p);
   assert.equal((await marker())?.height,2,'Explicit row target needs a line');
   const a=await rect(group(0)),b=await rect(group(1));
   for(const y of [(a.bottom+b.top)/2,(b.bottom+(await rect(group(2))).top)/2]) {
     await over(data,{x:b.left+70,y});assert.equal(await marker(),null,'Gap between groups must not jump to loose tabs');
   }
   r=await rect(row('First C'));
   for(const offset of [-2,1,-1,2,0]) {
     await over(data,{x:r.left+70,y:r.top+r.height/2+offset});assert.equal(await marker(),null,'Uncertain row midpoint must be neutral');
   }
   const next=await rect(row('Second C')),y=(r.bottom+next.top)/2;let stable;
   for(const dy of [-2,1,-1,2,0]) {
     await over(data,{x:r.left+70,y:y+dy});const line=await marker();assert.equal(line?.height,2);
     if(stable)assert.deepEqual(line,stable,'Same boundary changed with pointer jitter');stable=line;
   }
   r=await rect(card+' textarea');p={x:r.left+70,y:r.top+12};await over(data,p);
   await shot('saved-drag-neutral-'+zoom);
   assert.equal(await marker(),null,'Notes must not activate a distant loose-tab target');
   await end(data,p);assert.deepEqual((await load()).links,before.links,'A drop without a line must not change tabs');
 }
 results.push('Saved groups, notes and row midpoints have neutral zones at 100%, 125% and 150%; valid gaps remain fixed and neutral drops do nothing');
 await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,1))`);await delay(150);
 let data=await start(row('Loose')+' .link-open'),r=await rect(row('Second C')),p={x:r.left+70,y:r.top+3};
 await over(data,p);await shot('saved-drag-valid');await end(data,p);
 await wait(async()=> (await load()).links.find(l=>l.title==='Loose').groupId===collection.groups[2].id,'Valid drop lost group intent');
 assert.deepEqual((await load()).links.filter(l=>l.groupId===collection.groups[2].id).map(l=>l.title),['First C','Loose','Second C']);
 results.push('Dropping on a clear group-member boundary uses precisely the shown order and group');
 data=await start(group(0)+' .editable-name');r=await rect(group(2));p={x:r.left+70,y:r.top+r.height/2};await over(data,p);
 assert.equal(await marker(),null,'Whole-group drag over a tall group center must not jump between remote edges');await end(data,p,true);
 results.push('Whole-group placement requires a nearby group edge');

 const destination=(await rpc('load')).state.collections.find(c=>c.name==='Other collection');
 const target=`.collection[data-collection-id="${destination.id}"]`,empty=target+' .collection-body > .empty';
 const loadTarget=()=>rpc('load').then(r=>r.state.collections.find(c=>c.id===destination.id));
 // An existing card with no tabs has a real content target, not just a header target.
 for(const zoom of [1,1.25,1.5]) {
   await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,${zoom}))`);await delay(150);
   const before=await load();data=await start(row('Loose')+' .link-open');
   await app.evaluate(`document.querySelector(${JSON.stringify(empty)}).scrollIntoView({block:'center'})`);
   r=await rect(empty);let stable;
   for(const [dx,dy] of [[.1,.1],[.5,.5],[.9,.9],[.5,.49],[.5,.51]]) {
     p={x:r.left+r.width*dx,y:r.top+r.height*dy};await over(data,p);
     const current=await marker();assert.equal(current?.height,2,'Empty collection content needs an insertion line');
     if(stable)assert.deepEqual(current,stable,'An empty collection has only one insertion position');stable=current;
   }
   const actions=await rect(target+' .collection-primary-actions');
   p={x:r.right-25,y:actions.top+actions.height/2};await over(data,p);
   assert.deepEqual(await marker(),stable,'Blank space beside Open/Switch is the same empty-card target');
   const open=await rect(target+' .collection-primary-actions button');
   await over(data,{x:open.left+open.width/2,y:open.top+open.height/2});
   assert.equal(await marker(),null,'The Open button is not an insertion target');
   await over(data,p);
   await shot('empty-collection-drop-'+zoom);
   const note=await rect(target+' textarea');
   await over(data,{x:note.left+30,y:note.top+10});
   assert.equal(await marker(),null,'Empty-card notes must not accept tab drops');
   await over(data,p);await end(data,p);
   await wait(async()=> (await loadTarget()).links.length===1,'Saved tab did not move into the empty card');
   const moved=await loadTarget();assert.equal(moved.links[0].title,'Loose');assert.equal(moved.links[0].groupId,null);
   assert.equal(moved.groups.length,0);assert.equal(moved.note,destination.note);
   assert.equal((await load()).links.length,before.links.length-1);
   await app.evaluate(`document.querySelector('#toast button').click()`);
   await wait(async()=> (await loadTarget()).links.length===0&&(await load()).links.length===before.links.length,'Undo did not restore the empty destination');
   assert.deepEqual((await load()).links,before.links);
   await wait(()=>app.evaluate(`!!document.querySelector(${JSON.stringify(empty)})`),'Empty-state target did not return after Undo');
 }
 results.push('Saved tabs move into an empty card at 100%, 125% and 150% zoom with a fixed line, no inherited group, and working Undo');

 await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,1))`);await delay(150);
 await app.evaluate(`document.querySelector('${card} .collection-select').click();document.querySelector('${row('First C')} input').click();document.querySelector('${row('Loose')} input').click()`);
 const before=await load();
 for(const copy of [true,false]) {
   data=await start(row('Loose')+' .link-open');
   const payload=JSON.parse(data.items.find(item=>item.mimeType==='application/x-neo').data);
   assert.equal(payload.type,'links');assert.equal(payload.linkIds.length,2);
   r=await rect(empty);p={x:r.left+r.width/2,y:r.top+r.height/2};await over(data,p,copy?2:0);
   assert.equal((await marker())?.height,2);await end(data,p,false,copy?2:0);
   await wait(async()=> (await loadTarget()).links.length===2,'Selected saved tabs did not reach the empty card');
   const moved=await loadTarget();assert.deepEqual(moved.links.map(l=>l.title),['First C','Loose']);
   assert(moved.links.every(l=>l.groupId===null));assert.equal(moved.groups.length,0);
   assert.equal((await load()).links.length,before.links.length-(copy?0:2));
   await app.evaluate(`document.querySelector('#toast button').click()`);
   await wait(async()=> !(await loadTarget()).links.length&&(await load()).links.length===before.links.length,'Undo did not restore the selection move/copy');
   await wait(()=>app.evaluate(`!!document.querySelector(${JSON.stringify(empty)})`),'Empty state did not return');
 }
 await app.evaluate(`document.querySelector('${card} .collection-select').click()`);
 results.push('Selected saved tabs move or Ctrl-copy into an empty card in order without carrying their source group');

 data=await start(group(0)+' .editable-name');r=await rect(empty);p={x:r.left+r.width/2,y:r.top+r.height/2};
 await over(data,p);assert.equal((await marker())?.height,2);await end(data,p);
 await wait(async()=> (await loadTarget()).groups.length===1,'Whole group did not move into the empty card');
 const moved=await loadTarget();assert.equal(moved.groups[0].name,'Folded A');
 assert.equal(moved.links[0].title,'Hidden A');assert.equal(moved.links[0].groupId,moved.groups[0].id);
 assert(!(await load()).groups.some(g=>g.id===collection.groups[0].id));
 results.push('A whole saved-group drag into an empty collection preserves its name and membership');
}

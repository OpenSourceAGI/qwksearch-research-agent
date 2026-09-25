
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkCollectionDrag({app,rpc,results,delay,origin,out}) {
 const wait=async(fn,message)=>{for(let i=0;i<100;i++){if(await fn())return;await delay(60);}throw Error(message);};
 const rect=selector=>app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()`);
 const marker=()=>app.evaluate(`(()=>{const n=document.querySelector('.drop-insertion');if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()`);
 const shot=async name=>fs.writeFile(path.join(out,name+'.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
 await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:760,deviceScaleFactor:1,mobile:false});
 await rpc('settings',{settings:{autoGroup:false,theme:'dark'}});
 const fixture=(spaceId,i)=>({spaceId,name:spaceId+' '+i,note:'Collection notes. '.repeat(i%2?6:18),groups:[],
   links:Array.from({length:8},(_,j)=>({title:'Page '+j,url:origin+'/'+spaceId+'/'+i+'/'+j}))});
 await rpc('import',{spaces:[{id:'Coding',name:'Coding'},{id:'Game',name:'Game'}],
   collections:[...Array.from({length:2},(_,i)=>fixture('Coding',i)),...Array.from({length:6},(_,i)=>fixture('Game',i))]});
 const state=(await rpc('load')).state;
 const card=id=>`.collection[data-collection-id="${id}"]`;
 const ids=space=>state.collections.filter(c=>c.spaceId===state.spaces.find(s=>s.name===space).id).map(c=>c.id);
 const order=async space=>(await rpc('load')).state.collections.filter(c=>ids(space).includes(c.id)).map(c=>c.id);
 const choose=async space=>{
   await wait(()=>app.evaluate(`!!document.querySelector('.space-tab[data-space-id="${state.spaces.find(s=>s.name===space).id}"] button')`),'Space tab missing');
   await app.evaluate(`document.querySelector('.space-tab[data-space-id="${state.spaces.find(s=>s.name===space).id}"] button').click();document.querySelector('#main').scrollTop=0`);
   await wait(()=>app.evaluate(`document.querySelectorAll('#board>.collection').length===${ids(space).length}`),'Space not rendered');
 };
 await app.send('Input.setInterceptDrags',{enabled:true});
 const start=async id=>{
   await wait(()=>app.evaluate(`!document.getAnimations().some(a=>a.playState==='running')`),'Animation running');
   const selector=card(id)+' .collection-name';
   await app.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
   const r=await rect(selector),p={x:r.left+r.width*.45,y:r.top+r.height/2};app.dragEvents.length=0;
   await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
   await app.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});
   for(let i=1;i<=4;i++)await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+i*10,y:p.y+i,button:'left',buttons:1});
   await wait(()=>app.dragEvents.length,'Drag missing');return app.dragEvents.at(-1).data;
 };
 const over=async(data,p)=>{for(const type of ['dragEnter','dragOver'])await app.send('Input.dispatchDragEvent',{type,...p,data});await delay(25);};
 const end=async(data,p,cancel=false)=>{
   await app.send('Input.dispatchDragEvent',{type:cancel?'dragCancel':'drop',...p,data});
   await app.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await delay(220);
   assert.equal(await marker(),null,'Feedback remains after drop');
 };
 for(const space of ['Coding','Game']) {
   await choose(space);const initial=ids(space);
   const data=await start(initial[0]);const r=await rect(card(initial[1])),p={x:r.right-5,y:r.top+22};
   await over(data,p);await shot(space.toLowerCase()+'-right-edge');
   const line=await marker();assert(line,'Right edge indicator disappeared in '+space);
   assert.equal(line.width,2);assert(Math.abs(line.left+1-r.right-14)<1,'Right edge indicator moved to another row in '+space);
   assert(line.top<=p.y&&line.top+line.height>=p.y,'Indicator is not visible beside the pointer');
   await end(data,p);await wait(async()=> (await order(space))[1]===initial[0],'Right-edge drop did not place the collection after its target');
   assert.deepEqual(await order(space),[initial[1],initial[0],...initial.slice(2)]);
 }
 results.push('Two-card Coding and six-card Game spaces show the same local right edge and commit the correct order');
 const game=await order('Game');
 // A second-row right edge has another row after it as well.
 let data=await start(game[2]),r=await rect(card(game[3])),p={x:r.right-5,y:r.top+22};
 await over(data,p);let line=await marker();assert(line&&Math.abs(line.left+1-r.right-14)<1,'Second-row right edge is missing');
 await shot('second-row-right-edge');await end(data,p);
 await wait(async()=> (await order('Game'))[3]===game[2],'Second-row drop order incorrect');
 // Both sides of an internal column gap must paint the same line.
 const current=await order('Game');data=await start(current[5]);await app.evaluate(`document.querySelector('#main').scrollTop=0`);
 const a=await rect(card(current[0])),b=await rect(card(current[1]));let stable;
 for(const x of [a.right-3,(a.right+b.left)/2,b.left+3,a.right-1]) {
   p={x,y:Math.max(a.top,b.top)+22};await over(data,p);line=await marker();assert(line);
   if(stable)assert.deepEqual(line,stable,'Column gap changed when approached from opposite sides');stable=line;
 }
 await shot('stable-column-gap');await end(data,p,true);
 results.push('Wrapped second-row edges remain visible and shared column gaps have stable geometry across unequal card heights');
 // The neutral center must not silently become append when dropped on a card.
 data=await start(current[5]);await app.evaluate(`document.querySelector('#main').scrollTop=0`);
 r=await rect(card(current[0]));p={x:(r.left+r.right)/2,y:r.top+22};await over(data,p);
 assert.equal(await marker(),null,'Ambiguous card center needs no indicator');await end(data,p);
 assert.deepEqual(await order('Game'),current,'Neutral drop changed collection order');
 results.push('Uncertain collection centers clear feedback and dropping there leaves order unchanged');
 // Responsive columns and browser zoom must not move a wrapped boundary offscreen.
 for(const zoom of [1,1.25,1.5]) {
   await app.send('Emulation.setDeviceMetricsOverride',{width:1800,height:1000,deviceScaleFactor:1,mobile:false});
   await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,${zoom}))`);await delay(180);
   const before=await order('Game');data=await start(before[0]);await app.evaluate(`document.querySelector('#main').scrollTop=0`);
   const columns=await app.evaluate(`getComputedStyle(document.querySelector('#board')).gridTemplateColumns.split(' ').length`);
   assert(columns>=2);r=await rect(card(before[columns-1]));p={x:r.right-5,y:r.top+22};
   await over(data,p);line=await marker();assert(line&&Math.abs(line.left+1-r.right-14)<1,'Wrapped edge missing at zoom '+zoom);
   await shot('wrapped-edge-'+columns+'col-'+zoom);await end(data,p);
   const expected=[...before.slice(1,columns),before[0],...before.slice(columns)];
   await wait(async()=>JSON.stringify(await order('Game'))===JSON.stringify(expected),'Responsive drop order incorrect');
 }
 results.push('Right edges and resulting order verified in two and three columns at 100%, 125% and 150% zoom');
 await app.evaluate(`chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,1))`);
 await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await rpc('settings',{settings:{view:'list',theme:'light'}});await delay(180);
 let before=await order('Game');data=await start(before[2]);
 await app.evaluate(`(()=>{const main=document.querySelector('#main'),r=document.querySelector('${card(before[0])}').getBoundingClientRect();main.scrollTop+=r.bottom-innerHeight/2})()`);
 r=await rect(card(before[0]));p={x:r.left+60,y:r.bottom-3};await over(data,p);line=await marker();
 assert.equal(line?.height,2,'List view needs a visible horizontal insertion line');
 const next=await rect(card(before[1]));assert(Math.abs(line.top+1-(r.bottom+next.top)/2)<1);
 await shot('list-edge');await end(data,p);
 await wait(async()=> (await order('Game'))[1]===before[2],'List drop order incorrect');
 results.push('Scrolled light/list view shows the horizontal gap and places the collection in that position');
 await rpc('settings',{settings:{view:'board',theme:'dark'}});
 for(const id of await order('Game'))await rpc('edit',{kind:'collection',collectionId:id,collapsed:true});await delay(180);
 before=await order('Game');data=await start(before[0]);r=await rect(card(before[1]));p={x:r.right-5,y:r.top+15};
 await over(data,p);line=await marker();assert(line&&Math.abs(line.left+1-r.right-14)<1,'Folded card right edge missing');await end(data,p);
 await wait(async()=> (await order('Game'))[1]===before[0],'Folded card drop order incorrect');
 results.push('Folded collections retain the same visible edge and reorder behavior');
 const finalOrder=await order('Game');
 await app.send('Page.reload');await wait(()=>app.evaluate(`document.querySelectorAll('#board>.collection').length===6`),'Reload failed');
 assert.deepEqual(await order('Game'),finalOrder);
 results.push('Collection order persists after reloading');
}

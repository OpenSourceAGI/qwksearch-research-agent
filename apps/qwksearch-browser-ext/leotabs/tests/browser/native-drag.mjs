
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkNativeDrag({app,rpc,results,delay,origin,out}) {
  const wait=async(fn,msg)=>{for(let i=0;i<60;i++){if(await fn())return;await delay(100);}throw Error(msg);};
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await rpc('settings',{settings:{autoGroup:false}});
  const ts=await app.evaluate(`Promise.all(Array.from({length:5},(_,i)=>chrome.tabs.create({url:${JSON.stringify(origin)}+'/drag/'+i,active:false})))`);
  const groups=await app.evaluate(`Promise.all([${JSON.stringify(ts.slice(0,2).map(t=>t.id))},${JSON.stringify(ts.slice(2,4).map(t=>t.id))}].map(tabIds=>chrome.tabs.group({tabIds})))`);
  await app.evaluate(`Promise.all(${JSON.stringify(groups)}.map((id,i)=>chrome.tabGroups.update(id,{title:i?'Destination':'Source',color:i?'green':'blue'})))`);
  const row=id=>`.tab-row[data-tab-id="${id}"]`;
  await wait(()=>app.evaluate(`document.querySelectorAll('#tabs .tab-row').length===5`),'Rows not loaded');
  await delay(700);
  await app.evaluate(`window.__dragLog=[];for(const type of ['mousedown','mousemove','dragstart','dragend','dragover','drop'])document.addEventListener(type,e=>{window.__dragLog.push({type,target:e.target.className,x:e.clientX,y:e.clientY,draggable:e.target.draggable,defaultPrevented:e.defaultPrevented});},true)`);
  await app.send('Input.setInterceptDrags',{enabled:true});
  const point=selector=>app.evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const drag=async(from,to)=>{
    await wait(()=>app.evaluate(`!document.getAnimations().some(a=>a.playState==='running')`),'Previous move animation did not settle');
    app.dragEvents.length=0;
    const start=await point(from);
    await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',...start});
    await app.send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1});
    for(let i=1;i<=4;i++)await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:start.x+12*i,y:start.y+3*i,button:'left',buttons:1});
    try{await wait(()=>app.dragEvents.length,'Mouse dragging the tab title did not start a native drag');}catch(error){await fs.writeFile(path.join(out,'drag-log.json'),JSON.stringify(await app.evaluate('window.__dragLog'),null,2));await fs.writeFile(path.join(out,'drag-failure.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));throw error;}
    const data=app.dragEvents.at(-1).data;
    assert(data.items.some(i=>i.mimeType==='application/x-neo'),'Native drag lost the tab payload');
    const current=await point(from);
    assert.equal(current.y,start.y,'Drag-start controls shifted the source row');
    const end=await point(to);
    for(const type of ['dragEnter','dragOver'])await app.send('Input.dispatchDragEvent',{type,...end,data});
    await fs.writeFile(path.join(out,'drag-target.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
    await app.send('Input.dispatchDragEvent',{type:'drop',...end,data});
    await app.send('Input.dispatchMouseEvent',{type:'mouseReleased',...end,button:'left',clickCount:1});
  };
  await drag(row(ts[0].id)+' .tab-open',`.open-tab-group[data-group-id="${groups[1]}"] .open-group-header`);
  await wait(()=>app.evaluate(`chrome.tabs.get(${ts[0].id}).then(t=>t.groupId===${groups[1]})`),'Native drop on group header did not change membership');
  results.push('A real mouse drag from a tab title changes the actual browser group');
  await wait(()=>app.evaluate(`document.querySelector('#toast')?.textContent.includes('Moved 1 tab')`),'Move did not finish');
  await app.evaluate(`document.querySelector('#library-select-mode').click();document.querySelector('${row(ts[2].id)} .tab-select').click();document.querySelector('${row(ts[3].id)} .tab-select').click()`);
  await drag(row(ts[2].id)+' .tab-open',`.open-tab-group[data-group-id="${groups[0]}"] .open-group-header`);
  await wait(()=>app.evaluate(`Promise.all(${JSON.stringify(ts.slice(2,4).map(t=>t.id))}.map(id=>chrome.tabs.get(id))).then(ts=>ts.every(t=>t.groupId===${groups[0]}))`),'Dragging selected rows did not move both tabs');
  await wait(()=>app.evaluate(`document.querySelector('#toast')?.textContent.includes('Moved 2 tabs')`),'Multi move did not finish');
  await drag(row(ts[2].id)+' .tab-open','.native-ungroup-drop');
  await wait(()=>app.evaluate(`Promise.all(${JSON.stringify(ts.slice(2,4).map(t=>t.id))}.map(id=>chrome.tabs.get(id))).then(ts=>ts.every(t=>t.groupId===-1))`),'Dragging out did not ungroup both selected tabs');
  await wait(()=>app.evaluate(`${JSON.stringify(ts.slice(2,4).map(t=>t.id))}.every(id=>{const r=document.querySelector('.tab-row[data-tab-id="'+id+'"]');return r&&!r.closest('.open-tab-group')})`),'Sidebar did not finish showing the ungrouped rows');
  await wait(()=>app.evaluate(`!document.body.classList.contains('dragging-open-tabs')`),'Ungroup target stayed visible after dropping');
  await app.evaluate(`document.querySelector('#library-select-mode').click()`);
  await drag(row(ts[3].id)+' .tab-open',row(ts[2].id)+' .tab-open');
  await wait(()=>app.evaluate(`Promise.all([${ts[2].id},${ts[3].id}].map(id=>chrome.tabs.get(id))).then(([a,b])=>b.index<a.index)`),'Native drag did not reorder ungrouped tabs');
  await wait(()=>app.evaluate(`document.querySelector('#toast')?.textContent.includes('Moved 1 tab')`),'Reorder did not finish');
  await app.evaluate(`[...document.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
  await wait(()=>app.evaluate(`Promise.all([${ts[2].id},${ts[3].id}].map(id=>chrome.tabs.get(id))).then(([a,b])=>a.index<b.index)`),'Reorder Undo did not restore native order');
  results.push('Real selected-row dragging moves multiple tabs between groups and into Ungroup; real row-to-row dragging reorders tabs and Undo restores order');
}

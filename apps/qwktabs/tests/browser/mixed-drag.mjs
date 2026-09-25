
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkMixedDrag({app,rpc,results,delay,origin,out}) {
  const wait=async(fn,message)=>{for(let i=0;i<100;i++){if(await fn())return;await delay(50);}throw Error(message);};
  const rect=selector=>app.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})()`);
  const marker=()=>rect('.drop-insertion');
  const shot=async name=>fs.writeFile(path.join(out,name+'.png'),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await rpc('settings',{settings:{autoGroup:false,theme:'dark'}});
  const tabs=await app.evaluate(`Promise.all(Array.from({length:10},(_,i)=>chrome.tabs.create({url:${JSON.stringify(origin)}+'/mixed-drag/'+i,active:false})))`);
  // Source group, loose row, tall middle group, loose rows, last group:
  // precisely the layout omitted by the previous regression fixture.
  const groups=await app.evaluate(`Promise.all([${JSON.stringify(tabs.slice(0,2).map(t=>t.id))},${JSON.stringify(tabs.slice(3,6).map(t=>t.id))},${JSON.stringify(tabs.slice(8).map(t=>t.id))}].map(tabIds=>chrome.tabs.group({tabIds})))`);
  await app.evaluate(`Promise.all(${JSON.stringify(groups)}.map((id,i)=>chrome.tabGroups.update(id,{title:['Source','Middle group','Last group'][i],color:'blue'})))`);
  const row=id=>`.tab-row[data-tab-id="${id}"]`;
  const group=id=>`.open-tab-group[data-group-id="${id}"]`;
  await wait(()=>app.evaluate(`document.querySelectorAll('#tabs .tab-row').length===10`),'Mixed rows not rendered');
  await app.send('Input.setInterceptDrags',{enabled:true});
  const start=async()=>{
    // Browser tab APIs finish before the library's refresh/animation does.
    // Wait for the displayed order and groups before measuring the next drag.
    await wait(()=>app.evaluate(`chrome.tabs.query({}).then(all=>{
      const ids=${JSON.stringify(tabs.map(t=>t.id))};
      const live=all.filter(t=>ids.includes(t.id)).sort((a,b)=>a.index-b.index).map(t=>[t.id,t.groupId]);
      const shown=[...document.querySelectorAll('#tabs .tab-row')].map(n=>[Number(n.dataset.tabId),Number(n.closest('.open-tab-group')?.dataset.groupId??-1)]);
      return JSON.stringify(live)===JSON.stringify(shown);
    })`),'Library did not refresh to match the browser tab layout');
    await wait(()=>app.evaluate(`!document.getAnimations().some(a=>a.playState==='running')`),'Previous move animation did not settle');
    await app.evaluate(`document.querySelector('${row(tabs[0].id)}').scrollIntoView({block:'nearest'})`);
    const r=await rect(row(tabs[0].id)+' .tab-open'),p={x:r.left+50,y:r.top+r.height/2};
    app.dragEvents.length=0;
    await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
    await app.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});
    for(let i=1;i<=4;i++)await app.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+i*10,y:p.y+i,button:'left',buttons:1});
    await wait(()=>app.dragEvents.length,'Native drag did not start');
    const payload=JSON.parse(app.dragEvents.at(-1).data.items.find(item=>item.mimeType==='application/x-neo').data);
    assert.deepEqual(payload.ids,[tabs[0].id],'Browser drag started from a different row than the source');
    return app.dragEvents.at(-1).data;
  };
  const over=async(data,p)=>{
    for(const type of ['dragEnter','dragOver'])await app.send('Input.dispatchDragEvent',{type,...p,data});
    await delay(25);
  };
  const end=async(data,p,cancel=true)=>{
    await app.send('Input.dispatchDragEvent',{type:cancel?'dragCancel':'drop',...p,data});
    await app.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
    await wait(()=>app.evaluate(`!document.querySelector('.drop-insertion')&&!document.body.classList.contains('dragging-open-tabs')`),'Drag did not clean up');
  };
  for(const zoom of [1,1.25,1.5]) {
    // Real Chromium page zoom, not only a change in screenshot pixel density.
    await app.evaluate(`chrome.tabs.getCurrent().then(tab=>chrome.tabs.setZoom(tab.id,${zoom}))`);
    await delay(100);
    const data=await start();
    await app.evaluate(`document.querySelector('${row(tabs[6].id)}').scrollIntoView({block:'center'})`);
    const a=await rect(group(groups[1])),b=await rect(row(tabs[6].id));
    const p={x:b.left+60,y:b.top+3};
    await over(data,p);
    const line=await marker();
    await shot('mixed-boundary-'+zoom);
    assert(Math.abs(line.top+line.height/2-(a.bottom+b.top)/2)<1.1,
      `Line must be in the actual gap after the middle group, not through its children: ${JSON.stringify({line,group:a,row:b,zoom})}`);
    for(let i=0;i<8;i++) {
      await over(data,{x:p.x+(i%2?25:0),y:p.y+(i%2?1:0)});
      const current=await marker();
      assert.equal(current.top,line.top,'Small horizontal/vertical pointer movement changed the boundary');
    }
    for(const y of [a.bottom+1,b.top-1]) {
      await over(data,{x:p.x,y});
      assert.equal((await marker()).top,line.top,'Moving into the real gap hid or moved the line');
    }
    // Both preceding and following ungrouped rows must use adjacent group edges.
    await app.evaluate(`document.querySelector('${row(tabs[2].id)}').scrollIntoView({block:'center'})`);
    const before=await rect(row(tabs[2].id)),next=await rect(group(groups[1]));
    const q={x:before.left+60,y:before.bottom-3};
    await over(data,q);
    const after=await marker();
    assert(Math.abs(after.top+after.height/2-(before.bottom+next.top)/2)<1.1,'Line crosses a following group');
    for(const y of [before.bottom+1,next.top-1]) {
      await over(data,{x:q.x,y});
      assert.equal((await marker()).top,after.top,'Line changes within the gap before a group');
    }
    await end(data,q);
  }
  results.push('Mixed grouped/ungrouped sidebar boundaries stay in their true gaps at 100%, 125% and 150% browser zoom, including scrolled positions');

  await app.evaluate(`chrome.tabs.getCurrent().then(tab=>chrome.tabs.setZoom(tab.id,1))`);
  for(const key of ['beforeTabId','afterTabId']) {
    await assert.rejects(rpc('move-open-tabs',{windowId:tabs[0].windowId,tabIds:[tabs[0].id],groupId:-1,[key]:tabs[4].id}),/drop target changed/,'An ungrouped drop must not split a group');
  }
  const data=await start();
  await app.evaluate(`document.querySelector('${row(tabs[6].id)}').scrollIntoView({block:'center'})`);
  const target=await rect(row(tabs[6].id)),edge=await rect(group(groups[1]));
  // Drop on the gap itself, on the group side of its midpoint. This uses
  // the group edge as the anchor and must not absorb/split its members.
  const p={x:target.left+60,y:edge.bottom+1};
  await over(data,p);await end(data,p,false);
  await wait(()=>app.evaluate(`Promise.all([${tabs[0].id},${tabs[6].id}].map(id=>chrome.tabs.get(id))).then(([a,b])=>a.groupId===-1&&a.index+1===b.index)`),'Drop did not land at the displayed boundary');
  assert.deepEqual(await app.evaluate(`chrome.tabs.query({groupId:${groups[1]}}).then(tabs=>tabs.map(t=>t.id))`),tabs.slice(3,6).map(t=>t.id),'Gap drop changed the neighboring group');
  const nextData=await start();
  await app.evaluate(`document.querySelector('${group(groups[1])}').scrollIntoView({block:'center'})`);
  const block=await rect(group(groups[1])),q={x:block.left+60,y:block.top-1};
  await over(nextData,q);await end(nextData,q,false);
  try {
    await wait(()=>app.evaluate(`Promise.all([${tabs[0].id},${tabs[3].id}].map(id=>chrome.tabs.get(id))).then(([a,b])=>a.groupId===-1&&a.index+1===b.index)`),'Drop before group did not land at the displayed boundary');
  } catch(error) {
    await shot('mixed-drop-failure');
    const state=await app.evaluate(`Promise.all([chrome.tabs.query({}),Promise.resolve(document.querySelector('#toast')?.textContent)]).then(([tabs,toast])=>({tabs:tabs.map(t=>({id:t.id,index:t.index,groupId:t.groupId})),toast}))`);
    throw Error(error.message+' '+JSON.stringify({q,block,state}));
  }
  assert.deepEqual(await app.evaluate(`chrome.tabs.query({groupId:${groups[1]}}).then(tabs=>tabs.map(t=>t.id))`),tabs.slice(3,6).map(t=>t.id),'Drop before group changed its members');
  results.push('Drops directly in gaps before and after groups match the line, preserve neighboring groups and reject group-splitting targets');
}


import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkRenameSelection({app,rpc,results,delay,origin,out}) {
  const wait=async(fn)=>{for(let i=0;i<80;i++){if(await fn())return;await delay(60);}throw Error('Rename UI did not settle');};
  await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await rpc('settings',{settings:{autoGroup:false,theme:'dark'}});
  await rpc('import',{collections:[{
    name:'Programming languages and runtimes',groups:[{id:'docs',name:'Documentation and learning resources'}],
    links:[{title:'Language guide',url:origin+'/language-guide',groupId:'docs'}],
  },{name:'Other collection',groups:[],links:[]}]});
  const collection=(await rpc('load')).state.collections.find(c=>c.name==='Programming languages and runtimes');
  const tabs=await app.evaluate(`Promise.all(['one','two'].map(p=>chrome.tabs.create({url:${JSON.stringify(origin)}+'/rename-'+p,active:false})))`);
  const nativeId=await app.evaluate(`chrome.tabs.group({tabIds:${JSON.stringify(tabs.map(t=>t.id))}})`);
  await app.evaluate(`chrome.tabGroups.update(${nativeId},{title:'Browser reference and documentation',color:'green'})`);
  await app.send('Page.reload');
  const card=`.collection[data-collection-id="${collection.id}"]`;
  const cases=[
    ['collection',card+' .collection-head','collection',()=>rpc('load').then(r=>r.state.collections.find(c=>c.id===collection.id).name)],
    ['saved-group',card+` .saved-group[data-group-id="${collection.groups[0].id}"] .group-header`,'group',()=>rpc('load').then(r=>r.state.collections.find(c=>c.id===collection.id).groups[0].name)],
    ['open-group',`.open-group-header[data-group-id="${nativeId}"]`,'tabs',()=>app.evaluate(`chrome.tabGroups.get(${nativeId}).then(g=>g.title)`) ],
  ];
  await app.send('Input.setInterceptDrags',{enabled:true});
  const mouse=async(type,p)=>app.send('Input.dispatchMouseEvent',{type,...p,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
  const key=async key=>{
    await app.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='Enter'?13:27});
    await app.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='Enter'?13:27});
  };
  const snapshot=async()=>({
    collections:(await rpc('load')).state.collections.map(c=>({id:c.id,groups:c.groups.map(g=>g.id),links:c.links.map(l=>[l.id,l.groupId])})),
    tabs:await app.evaluate(`chrome.tabs.query({}).then(ts=>ts.map(t=>[t.id,t.index,t.groupId]))`),
  });
  for(const [kind,header,type,name] of cases) {
    await wait(()=>app.evaluate(`!!document.querySelector(${JSON.stringify(header+' .editable-name')})`));
    const original=await name(),before=await snapshot();
    for(const direction of ['forward','backward']) {
      await app.evaluate(`document.querySelector(${JSON.stringify(header+' .editable-name')}).click()`);
      const bounds=await app.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(header+' input.inline-name')});input.scrollIntoView({block:'center'});input.setSelectionRange(0,0);const r=input.getBoundingClientRect();return {x:r.left+12,y:r.top+r.height/2};})()`);
      const start={...bounds,x:bounds.x+(direction==='backward'?90:0)},end={...bounds,x:bounds.x+(direction==='forward'?90:0)};
      app.dragEvents.length=0;
      await mouse('mouseMoved',start);await mouse('mousePressed',start);
      for(let i=1;i<=8;i++)await mouse('mouseMoved',{x:start.x+(end.x-start.x)*i/8,y:start.y});
      if(app.dragEvents.length)await app.send('Input.dispatchDragEvent',{type:'dragCancel',...end,data:app.dragEvents.at(-1).data});
      await mouse('mouseReleased',end);
      await fs.writeFile(path.join(out,`${kind}-${direction}.png`),Buffer.from((await app.send('Page.captureScreenshot')).data,'base64'));
      assert.equal(app.dragEvents.length,0,`${kind}: selecting name text started a drag`);
      const selection=await app.evaluate(`(()=>{const i=document.querySelector(${JSON.stringify(header+' input.inline-name')});return {start:i.selectionStart,end:i.selectionEnd,value:i.value,focused:document.activeElement===i,dragging:!!document.querySelector('.dragging,.drop-insertion,.item-drag-image')};})()`);
      assert(selection.focused&&!selection.dragging&&selection.end-selection.start>2&&selection.end-selection.start<original.length,`${kind}: mouse drag did not select part of the name: ${JSON.stringify(selection)}`);
      assert.deepEqual(await snapshot(),before,'Selecting text moved tabs or collections');
      await app.send('Input.insertText',{text:'Updated'});
      await key(direction==='forward'?'Escape':'Enter');
      const expected=direction==='forward'?original:original.slice(0,selection.start)+'Updated'+original.slice(selection.end);
      await wait(async()=>await name()===expected);
      await wait(()=>app.evaluate(`!!document.querySelector(${JSON.stringify(header+' .editable-name')})`));
    }
    // Finishing a rename must restore the real header drag and its original payload.
    const p=await app.evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(header+' .editable-name')});n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:r.left+30,y:r.top+r.height/2};})()`);
    app.dragEvents.length=0;await mouse('mouseMoved',p);await mouse('mousePressed',p);
    for(let i=1;i<=5;i++)await mouse('mouseMoved',{x:p.x+i*10,y:p.y+2});
    await wait(()=>app.dragEvents.length>0);
    const data=app.dragEvents.at(-1).data;
    assert.equal(JSON.parse(data.items.find(i=>i.mimeType==='application/x-neo').data).type,type);
    await app.send('Input.dispatchDragEvent',{type:'dragCancel',...p,data});await mouse('mouseReleased',p);
    assert.deepEqual(await snapshot(),before,'Cancelled header drag changed placement');
    results.push(`${kind}: real mouse selection in both directions, replacement, Escape/Enter, and restored header dragging`);
  }
}

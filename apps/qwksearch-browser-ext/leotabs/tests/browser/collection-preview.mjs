
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkCollectionPreview({ app, rpc, results, delay, out }) {
  const wait = async predicate => { for (let i=0;i<100;i++) { if(await predicate()) return; await delay(60); } throw Error('Preview did not settle: '+await app.evaluate(`JSON.stringify({focus:document.activeElement.outerHTML,cards:[...document.querySelectorAll('.collection')].map(c=>({name:c.querySelector('.collection-name')?.textContent,rows:c.querySelectorAll('.saved-row').length,more:c.querySelector('.more-links')?.textContent})),errors:document.querySelector('#toast')?.textContent})`)); };
  const link = (id, groupId=null) => ({ id:String(id), title:'Tab '+id, url:'https://example.org/'+id, groupId });
  const groups = Array.from({length:30},(_,i)=>({id:'g'+i,name:'Group '+i,collapsed:false}));
  await rpc('import', {collections:[
    {name:'Mixed preview',groups:groups.slice(0,4),links:[...Array.from({length:10},(_,i)=>link(i)),...Array.from({length:10},(_,i)=>link(i+10,'g'+i%4))]},
    {name:'Many groups',groups,links:groups.flatMap((g,i)=>[link(i*2,g.id),link(i*2+1,g.id)])},
    {name:'Empty groups',groups,links:[]},
    {name:'Large preview',groups:[],links:Array.from({length:190},(_,i)=>link(i))},
  ]});
  const before=(await rpc('load')).state.collections;
  const scope=name=>`document.querySelector('[data-collection-id="${before.find(c=>c.name===name).id}"]')`;
  await wait(()=>app.evaluate(`document.querySelectorAll('.collection').length>=4`));
  const rows=name=>app.evaluate(`${scope(name)}.querySelectorAll('.saved-row,.group-header').length`);
  for(const c of before)assert(await rows(c.name)<=8);
  assert.equal(await app.evaluate(`${scope('Mixed preview')}.querySelector('.more-links').textContent`),'Show more · 12 tabs remaining');
  for(const theme of ['light','dark']) {
    await rpc('settings',{settings:{theme}});
    await wait(()=>app.evaluate(`document.documentElement.dataset.theme===${JSON.stringify(theme)}`));
    await app.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await delay(160);
    await fs.writeFile(path.join(out,`preview-${theme}.png`),Buffer.from((await app.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  const mixed=scope('Mixed preview');
  await app.send('Page.bringToFront');
  await app.evaluate(`${mixed}.querySelector('.more-links').focus()`);
  await app.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
  await app.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await wait(()=>app.evaluate(`${mixed}.querySelectorAll('.saved-row').length===20`));
  assert.equal(await app.evaluate(`document.querySelectorAll('.collection').length`),4);
  assert(await app.evaluate(`${mixed}.querySelector('.more-links').getAttribute('aria-expanded')==='true'`));
  assert.equal(await app.evaluate(`document.activeElement.textContent`),'Show less');
  await app.evaluate(`${mixed}.querySelector('.more-links').click()`);
  assert.equal(await rows('Mixed preview'),8);
  assert(await app.evaluate(`document.activeElement===${mixed}.querySelector('.more-links')`));
  const large=scope('Large preview');
  await app.evaluate(`${large}.querySelector('.more-links').click()`);
  assert.equal(await rows('Large preview'),88);
  assert.equal(await app.evaluate(`${large}.querySelectorAll('.collection-disclosure button').length`),2);
  await app.evaluate(`${large}.querySelector('.collection-disclosure button:last-child').click()`);
  assert.equal(await rows('Large preview'),8);
  const search=value=>app.evaluate(`(()=>{const i=document.querySelector('#tab-search');i.value=${JSON.stringify(value)};i.dispatchEvent(new Event('input'));})()`);
  await search('Tab 59');
  await wait(()=>app.evaluate(`${scope('Many groups')}?.querySelectorAll('.saved-row').length===1`));
  assert(await app.evaluate(`${scope('Many groups')}.querySelector('.saved-row').textContent.includes('Tab 59')`));
  await search('');
  await wait(()=>app.evaluate(`document.querySelectorAll('.collection').length===4`));
  assert.deepEqual((await rpc('load')).state.collections,before);
  await app.evaluate(`[...${mixed}.querySelectorAll('button')].find(b=>b.textContent==='Add group').click()`);
  await wait(()=>app.evaluate(`document.activeElement.classList.contains('inline-name') && document.activeElement.value==='Group'`));
  assert(await rows('Mixed preview')>8);
  results.push('Shared eight-row previews cover mixed, grouped, empty and large collections; keyboard expansion is inline, Show less restores focus and cap, search finds hidden links, and new group editing stays visible');
}

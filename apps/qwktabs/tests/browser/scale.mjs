
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkScale({ app, rpc, out, results, delay }) {
  const tab = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('activate', { tabId: tab.id });
  const measurements = await app.evaluate(`(async()=>{
    const collections=Array.from({length:300},(_,i)=>({name:'Scale collection '+i,color:'blue',groups:[],links:Array.from({length:50},(_,j)=>({id:i+'-'+j,title:'Scale link '+j,url:'https://example.org/scale/'+i+'/'+j,note:'Continuation keyword '+i,groupId:null}))}));
    const start=performance.now();const result=await chrome.runtime.sendMessage({action:'import',data:{collections}});if(!result.ok)throw Error(result.error);
    const imported=performance.now(),loaded=await chrome.runtime.sendMessage({action:'load'}),end=performance.now();
    return {collections:loaded.value.state.collections.length,links:loaded.value.state.collections.reduce((n,c)=>n+c.links.length,0),importMs:imported-start,loadMs:end-imported};
  })()`);
  for (
    let i = 0;
    i < 40 &&
    !(await app.evaluate(
      `document.querySelector('#breadcrumbs').textContent.includes('${measurements.collections}')`,
    ));
    i++
  )
    await delay(100);
  measurements.renderedCollections = await app.evaluate(
    'document.querySelectorAll(".collection").length',
  );
  assert(measurements.renderedCollections <= 60);
  assert.equal(measurements.renderedCollections, 60);
  await app.evaluate('document.querySelector("#tab-search").focus()');
  measurements.searchMs = await app.evaluate(`(async()=>{
    const input=document.querySelector('#tab-search'),start=performance.now();input.value='Continuation keyword 299';input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,400));return performance.now()-start;
  })()`);
  assert(
    await app.evaluate(
      `document.querySelector('#board').textContent.includes('Scale link')`,
    ),
  );
  measurements.searchNodes = await app.evaluate(
    'document.querySelectorAll("#board .collection").length',
  );
  assert.equal(measurements.searchNodes, 1);
  await app.evaluate(`(()=>{const input=document.querySelector('#tab-search');input.value='Scale';input.dispatchEvent(new Event('input'));})()`);
  assert.equal(await app.evaluate(`document.querySelectorAll('#board .collection').length`),60);
  assert(await app.evaluate(`document.querySelector('#breadcrumbs').textContent.includes('15300 results across all spaces')`),'Search count should include matching names and links beyond the first page');
  await app.evaluate(`[...document.querySelectorAll('#board > button')].find(b=>b.textContent==='Show more collections').click()`);
  assert.equal(await app.evaluate(`document.querySelectorAll('#board .collection').length`),120);
  await app.evaluate(`const input=document.querySelector('#tab-search');input.value='';input.dispatchEvent(new Event('input'));`);
  assert.equal(await app.evaluate(`document.querySelectorAll('#board .collection').length`),60,'Clear search should restore the previous page size');
  await fs.writeFile(path.join(out, 'scale.json'), JSON.stringify(measurements, null, 2));
  results.push(
    '300 additional collections / 15,000 links traverse real import, storage, runtime messaging and search with bounded DOM',
  );
  console.log('Measured library scale:', measurements);
}

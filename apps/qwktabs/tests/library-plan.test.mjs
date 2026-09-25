import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLibraryPlan,applyLibraryPlan} from '../extension/lib/library-plan.js';
import {libraryAccess} from '../extension/lib/library-access.js';
const fixture=()=>({revision:3,spaces:[{id:'one'},{id:'two'}],collections:[
  {id:'a',name:'A',spaceId:'one',note:'Source note',groups:[{id:'g',name:'Research'}],links:[{id:'l',url:'https://a.test',title:'A link',groupId:'g'}]},
  {id:'b',name:'B',spaceId:'one',note:'Destination note',groups:[],links:[]},
  {id:'c',name:'C',spaceId:'two',note:'',groups:[],links:[]},
]});
test('space plans reject cross-scope references; All spaces is explicit',()=>{
  const s=fixture(),raw={actions:[{type:'merge',collectionId:'a',destinationId:'c'}]};
  assert.throws(()=>validateLibraryPlan(raw,s,{type:'space',id:'one'}),/destination/);
  assert.equal(validateLibraryPlan(raw,s,{type:'all'}).actions.length,1);
  assert.throws(()=>validateLibraryPlan({actions:[{type:'move',collectionId:'a',destinationId:'b',linkIds:['unknown']}]},s,{type:'all'}),/missing or repeated links/);
});
test('reviewed merges preserve links, groups and both notes; stale plans cannot apply',()=>{
  const s=fixture(),plan=validateLibraryPlan({actions:[{type:'rename',collectionId:'b',name:'Combined'},{type:'merge',collectionId:'a',destinationId:'b'}]},s,{type:'space',id:'one'});
  assert.throws(()=>applyLibraryPlan({...s,revision:4},plan),/changed/);
  applyLibraryPlan(s,plan);
  assert(!s.collections.some(c=>c.id==='a'));
  const dest=s.collections.find(c=>c.id==='b');
  assert.equal(dest.name,'Combined');assert.match(dest.note,/Source note/);assert.match(dest.note,/Destination note/);
  assert.equal(dest.links[0].url,'https://a.test');assert.equal(dest.links[0].groupId,dest.groups[0].id);
});
test('selected moves and collection order preserve other items',()=>{
  const s=fixture(),plan=validateLibraryPlan({actions:[{type:'move',collectionId:'a',destinationId:'b',linkIds:['l']},{type:'order',collectionIds:['b','a']}]},s,{type:'space',id:'one'});
  applyLibraryPlan(s,plan);
  assert.deepEqual(s.collections.map(c=>c.id),['b','a','c']);
  assert.equal(s.collections[1].links.length,0);assert.equal(s.collections[0].links.length,1);
});
test('omnibox handler uses encoded search and respects new-tab disposition; standalone Library uses popup window',async()=>{
  let entered;const calls=[];
  const browser={runtime:{getURL:p=>'chrome-extension://neo/'+p},omnibox:{setDefaultSuggestion:v=>calls.push(v),onInputEntered:{addListener:fn=>entered=fn}},tabs:{query:async()=>[{id:1}],update:async(id,v)=>calls.push({id,...v}),create:async v=>calls.push(v)},windows:{create:async v=>calls.push(v)}};
  const access=libraryAccess(browser);access.register();
  await entered('a & b','currentTab');
  assert.equal(calls.at(-1).url,'chrome-extension://neo/app.html#q=a%20%26%20b');
  await access.open('test','newBackgroundTab');assert.equal(calls.at(-1).active,false);
  await access.open('','window');assert.equal(calls.at(-1).type,'popup');
});

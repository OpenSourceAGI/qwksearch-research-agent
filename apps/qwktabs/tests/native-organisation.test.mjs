
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeOrganisation} from '../extension/lib/native-organisation.js';
import {initialState} from '../extension/lib/model.js';

function fixture() {
  const state=initialState(), tabs=[], groups=[], session={}, local={};
  const area=store=>({get:async key=>({[key]:structuredClone(store[key])}),set:async value=>Object.assign(store,structuredClone(value))});
  const browser={storage:{session:area(session),local:area(local)},windows:{getAll:async()=>[{id:1},{id:2}]},
    tabs:{get:async id=>structuredClone(tabs.find(t=>t.id===id)),group:async({tabIds,groupId})=>{
      if(groupId===undefined){groupId=groups.length+1;groups.push({id:groupId,windowId:1,title:'',color:'blue'});}
      for(const t of tabs)if(tabIds.includes(t.id))t.groupId=groupId;
      return groupId;
    }},tabGroups:{query:async({windowId})=>structuredClone(groups.filter(g=>g.windowId===windowId)),update:async(id,values)=>Object.assign(groups.find(g=>g.id===id),values)}};
  const organiser=()=>nativeOrganisation({browser,db:{getState:async()=>state},ops:{live:async()=>structuredClone(tabs)},sessions:{list:async()=>({active:{}})}});
  const add=(id,url='https://example.com/'+id)=>{const tab={id,url,title:'Page '+id,windowId:1,index:tabs.length,groupId:-1,pinned:false};tabs.push(tab);return tab;};
  return {tabs,groups,organiser,add};
}

test('auto-created groups retain membership and order across URL/title changes and singleton destinations',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.organiser().run(1);
  const id=a.groupId;assert(id>=0);const before=f.tabs.map(t=>t.id);
  a.url='https://elsewhere.test/new';a.title='New project';
  await f.organiser().run(1);
  assert.equal(a.groupId,id);assert.equal(b.groupId,id);assert.deepEqual(f.tabs.map(t=>t.id),before);
  f.add(3,'https://elsewhere.test/a');f.add(4,'https://elsewhere.test/b');await f.organiser().run(1);
  assert.equal(a.groupId,id);assert.notEqual(f.tabs[2].groupId,id);
});
test('manual ungroup survives navigation, worker recreation, and moving windows without excluding another URL copy',async()=>{
  const f=fixture(),a=f.add(1);f.add(2);await f.organiser().run(1);
  a.groupId=-1;a.url='https://elsewhere.test/a';await f.organiser().run(1);
  a.url='https://example.com/2';await f.organiser().run(1);assert.equal(a.groupId,-1);
  const copy=f.add(3,a.url);await f.organiser().run(1);assert(copy.groupId>=0);assert.equal(a.groupId,-1);
  a.windowId=2;await f.organiser().run(2);assert.equal(a.groupId,-1);
});
test('manual and AI groups are protected and a new ungrouped tab can join an existing matching group',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);await f.organiser().run(1);
  f.groups[0].title='My project';a.url='https://other.example/a';b.title='Another title';await f.organiser().run(1);
  assert.equal(a.groupId,b.groupId);assert.equal(f.groups[0].title,'My project');
  const c=f.add(3,'https://new.example/a');await f.organiser().run(1);assert.equal(c.groupId,-1);
  const d=f.add(4,'https://new.example/b');await f.organiser().run(1);assert.equal(c.groupId,d.groupId);
  const e=f.add(5,'https://new.example/c');await f.organiser().run(1);assert.equal(e.groupId,c.groupId);
});
test('tabs left independent by an explicit arrangement stay independent after navigation',async()=>{
  const f=fixture(),a=f.add(1),b=f.add(2);
  await f.organiser().remember(1,'unassigned',[a.id,b.id]);
  await f.organiser().run(1);assert.equal(a.groupId,-1);assert.equal(b.groupId,-1);
  a.url='https://new.example/a';b.url='https://new.example/b';
  await f.organiser().run(1);assert.equal(a.groupId,-1);assert.equal(b.groupId,-1);
});

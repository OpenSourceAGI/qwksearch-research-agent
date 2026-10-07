
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionItems,placeCollectionItems,syncCollectionOrder} from '../extension/lib/collection-order.js';
import {validateCollections} from '../extension/lib/model.js';
import {sortCollection} from '../extension/lib/collection-arrangement.js';
import {collectionPreview} from '../extension/ui/collection-preview.js';
import {mirrorCollection} from '../extension/lib/collection-workflow.js';

const fixture=()=>({name:'Mixed',groups:[{id:'g',name:'Group'},{id:'empty',name:'Empty'}],links:[
  {id:'a',title:'A',url:'https://example.org/a',groupId:null},
  {id:'b',title:'B',url:'https://example.org/b',groupId:null},
  {id:'c',title:'C',url:'https://example.org/c',groupId:'g'},
  {id:'d',title:'D',url:'https://example.org/d',groupId:'g'},
]});
const keys=c=>collectionItems(c).map(item=>`${item.type}:${item.id}`);

test('whole groups interleave with loose tabs and members stay together in the saved link order',()=>{
  const c=fixture();placeCollectionItems(c,['group:g'],'b');
  assert.deepEqual(keys(c),['link:a','group:g','link:b','group:empty']);
  assert.deepEqual(c.links.map(l=>l.id),['a','c','d','b']);
  placeCollectionItems(c,['group:empty'],'a');
  assert.deepEqual(keys(c),['group:empty','link:a','group:g','link:b']);
  placeCollectionItems(c,['group:g']);
  assert.deepEqual(keys(c),['group:empty','link:a','link:b','group:g']);
});

test('loose tabs can move around an interleaved group without changing membership',()=>{
  const c=fixture();placeCollectionItems(c,['group:g'],'b');
  placeCollectionItems(c,['link:b'],'g');
  assert.deepEqual(keys(c),['link:a','link:b','group:g','group:empty']);
  assert.deepEqual(c.links.map(l=>l.groupId),[null,null,'g','g']);
});

test('manual order survives validation and fresh-ID backup import or duplication',()=>{
  const c=fixture();placeCollectionItems(c,['group:g'],'b');
  for(const freshIds of [false,true]) {
    const restored=validateCollections(JSON.parse(JSON.stringify([c])),{freshIds})[0];
    assert.deepEqual(collectionItems(restored).map(item=>item.value.title||item.value.name),['A','Group','B','Empty']);
    assert.equal(new Set(restored.itemOrder).size,4);
    if(freshIds)assert(restored.links.every(l=>!c.links.some(old=>old.id===l.id)));
  }
});

test('removed items and stale order references are pruned without losing new tabs',()=>{
  const c=fixture();placeCollectionItems(c,['group:g'],'b');
  c.links=c.links.filter(l=>l.id!=='a');c.itemOrder.push('link:missing','group:g');
  c.links.push({id:'new',groupId:null},{id:'orphan',groupId:'missing-group'});
  syncCollectionOrder(c);
  assert.deepEqual(keys(c),['group:g','link:b','group:empty','link:new']);
  assert(c.links.some(l=>l.id==='orphan'),'Order normalization must not discard pre-existing data');
});

test('explicit sorting resets manual interleaving and puts ungrouped tabs first',()=>{
  const c=fixture();placeCollectionItems(c,['group:g'],'b');sortCollection(c);
  assert.equal(c.itemOrder,undefined);
  assert.deepEqual(keys(c),['link:a','link:b','group:empty','group:g']);
});

test('mixed previews follow manual order and do not skip a truncated group to show later loose tabs',()=>{
  const c=fixture();placeCollectionItems(c,['group:g'],'b');
  const groups=c.groups.map(group=>({group,links:c.links.filter(l=>l.groupId===group.id),collapsed:false}));
  const preview=limit=>collectionPreview(c.links.filter(l=>!l.groupId),groups,limit,c.itemOrder);
  const short=preview(3);
  assert.deepEqual(short.items.map(item=>item.id),['a','g']);
  assert.equal(short.hiddenTabs,2);assert.equal(short.hiddenGroups,1);
  assert.deepEqual(preview(10).items.map(item=>item.id),['a','g','b','empty']);
});

test('live mirroring retains mixed order with remapped saved identities',()=>{
  const c=fixture();placeCollectionItems(c,['group:g'],'b');
  const snapshot={groups:[{id:'live',name:'Group'}],links:c.links.map(link=>({...link,id:'live-'+link.id,groupId:link.groupId?'live':null}))};
  const next=mirrorCollection(c,snapshot);
  assert.deepEqual(keys(next),['link:a','group:g','link:b']);
  assert.deepEqual(next.links.map(l=>l.id),['a','c','d','b']);
});

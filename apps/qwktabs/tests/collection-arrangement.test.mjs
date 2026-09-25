import test from 'node:test';
import assert from 'node:assert/strict';
import { groupAndSortCollection } from '../extension/lib/collection-arrangement.js';

const fixture = () => ({name:'My work',note:'Keep notes',groups:[{id:'old',name:'Mixed',color:'rose'}],links:[
  {id:'z',title:'Zebra',url:'https://example.org/z',groupId:'old',note:'Important'},
  {id:'s',title:'Single',url:'https://single.test/',groupId:'old'},
  {id:'a',title:'Apple',url:'https://example.org/a',groupId:null},
]});
test('collection group and sort uses websites, flattens singletons and preserves content', () => {
  const c = groupAndSortCollection(fixture());
  assert.equal(c.groups.length,1);
  assert.equal(c.groups[0].name,'Example');
  assert.deepEqual(c.links.map(l=>l.id),['s','a','z'],'Standalone tabs precede alphabetically earlier groups');
  assert.equal(c.links.find(l=>l.id==='s').groupId,null);
  assert.equal(c.links.find(l=>l.id==='z').note,'Important');
  assert.equal(c.name,'My work');assert.equal(c.note,'Keep notes');
  const group = structuredClone(c.groups[0]);
  groupAndSortCollection(c);
  assert.deepEqual(c.groups[0],group,'Repeated grouping keeps colour and identity');
});
test('excluding existing groups keeps their membership', () => {
  const c = groupAndSortCollection(fixture(),{regroupExisting:false});
  assert.deepEqual(c.groups,[{id:'old',name:'Mixed',color:'rose'}]);
  assert.equal(c.links.find(l=>l.id==='z').groupId,'old');
  assert.equal(c.links.find(l=>l.id==='s').groupId,'old');
  assert.equal(c.links.find(l=>l.id==='a').groupId,null);
  assert.equal(c.links.length,3);
});

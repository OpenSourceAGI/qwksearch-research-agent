
import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCollection, countCollectionMatches} from '../extension/ui/library-search.js';
test('collection filtering finds names, groups, URLs and notes without changing saved content',()=>{
  const collection={id:'a',name:'Reference',note:'Plant research',collapsed:true,
    groups:[{id:'g',name:'Orchid guides',collapsed:true}],
    links:[{id:'l',title:'Useful page',url:'https://example.com/botany',note:'Water weekly',groupId:'g'}]};
  const before=structuredClone(collection);
  for (const query of ['reference','plant research','ORCHID','useful','example.com/botany','water weekly',' '])
    assert.equal(matchesCollection(collection,query),true,query);
  assert.equal(matchesCollection(collection,'plant unrelated'),false);
  assert.equal(matchesCollection(collection,'[.*]'),false,'Queries must match literal text');
  assert.deepEqual(collection,before);
});

test('result counts include matching collection metadata, groups and links once each',()=>{
  const collection={name:'Orchid',note:'Orchid notes',groups:[{name:'Orchid guides'}],
    links:[{title:'Orchid care',url:'https://example.com/orchid',note:'Water orchids'}]};
  assert.equal(countCollectionMatches(collection,'orchid'),3);
  assert.equal(countCollectionMatches(collection,'water'),1);
  assert.equal(countCollectionMatches(collection,'unrelated'),0);
  assert.equal(countCollectionMatches(collection,' '),0);
});

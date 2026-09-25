
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionDropPlan } from '../extension/ui/collection-drop.js';

const node = (dataset, top, height=40) => ({
  dataset,
  getBoundingClientRect: () => ({left:20,right:320,top,bottom:top+height,width:300,height}),
});
const card = ({rows=[],groups=[],empty=null,controls=[]}={}) => ({
  querySelector: selector => selector === '.collection-body'
    ? {querySelectorAll: () => rows, querySelector: () => empty}
    : node({},20),
  querySelectorAll: selector => selector === '.saved-group' ? groups : controls,
});

test('an empty collection accepts tabs, selections and whole groups throughout its empty area', () => {
  const empty = node({}, 110, 70), control = node({},75,25);
  control.getBoundingClientRect = () => ({left:20,right:100,top:75,bottom:100,width:80,height:25});
  const target = card({empty,controls:[control]});
  const collection = {id:'empty',groups:[],links:[]};
  for (const payload of [
    {type:'link',collectionId:'source',linkId:'one'},
    {type:'links',collectionId:'source',linkIds:['one','two']},
    {type:'tabs',ids:[1]},
    {type:'tabs',ids:[1,2],wholeGroup:true},
    {type:'group',collectionId:'source',groupId:'group'},
  ]) {
    for (const point of [{x:25,y:40},{x:160,y:90},{x:25,y:111},{x:160,y:145},{x:315,y:179}]) {
      const plan = collectionDropPlan(target,collection,point,payload);
      assert.ok(plan,'The empty-state prompt must accept drops');
      assert.equal(plan.rect.top,109,'The only insertion position stays fixed');
      assert.equal(plan.beforeId,undefined);
      assert.equal(plan.group,payload.type==='group'||payload.wholeGroup===true);
      if (!plan.group) assert.equal(plan.groupId,null);
    }
    for (const point of [{x:10,y:145},{x:330,y:145},{x:40,y:90},{x:160,y:200}])
      assert.equal(collectionDropPlan(target,collection,point,payload),null,'Notes, controls and outside space remain neutral');
  }
});

test('hidden or filtered content is not treated as an empty collection', () => {
  const target=card({empty:node({},110,70)}),point={x:40,y:145};
  for(const collection of [
    {id:'c',groups:[],links:[{id:'hidden'}]},
    {id:'c',groups:[{id:'hidden'}],links:[]},
  ]) assert.equal(collectionDropPlan(target,collection,point,{type:'tabs'}),null);
});

test('a whole-group drop after the last visible group inserts before hidden groups', () => {
  const groups=[node({groupId:'visible'},100,80)];
  const collection={id:'c',groups:[{id:'visible'},{id:'hidden'}],links:[]};
  const plan=collectionDropPlan(card({groups}),collection,{x:40,y:179},{type:'tabs',wholeGroup:true});
  assert.equal(plan.beforeId,'hidden');
  assert.equal(plan.group,true);
  assert.equal(plan.rect.top,179);
});

test('row gaps choose one insertion boundary and position before hidden links', () => {
  const rows=[node({linkId:'one'},100),node({linkId:'two'},150)];
  const collection={id:'c',groups:[],links:[{id:'one'},{id:'two'},{id:'hidden'}]};
  const a=collectionDropPlan(card({rows}),collection,{x:40,y:141},{type:'tabs'});
  const b=collectionDropPlan(card({rows}),collection,{x:40,y:149},{type:'tabs'});
  for (const key of ['left','top','width','height']) assert.equal(a.rect[key],b.rect[key]);
  assert.equal(a.beforeId,'two');assert.equal(b.beforeId,'two');
  const after=collectionDropPlan(card({rows}),collection,{x:40,y:189},{type:'tabs'});
  assert.equal(after.beforeId,'hidden');assert.equal(after.groupId,null);
});

test('moving the first saved row onto its own position leaves the insertion before the next survivor', () => {
  const rows=[node({linkId:'one'},100),node({linkId:'two'},150)];
  const collection={id:'c',groups:[],links:[{id:'one'},{id:'two'}]};
  const plan=collectionDropPlan(card({rows}),collection,{x:40,y:101},{type:'link',collectionId:'c',linkId:'one'});
  assert.equal(plan.beforeId,'two');
  assert.equal(plan.rect.top,99,'Source still occupies its original visual row');
});

test('uncertain midpoints and points outside a saved list have no target', () => {
  const rows=[node({linkId:'one'},100),node({linkId:'two'},150)];
  const collection={id:'c',groups:[],links:[{id:'one'},{id:'two'}]};
  for(const y of [117,118,120,122,123,200,300])
    assert.equal(collectionDropPlan(card({rows}),collection,{x:40,y},{type:'tabs'}),null);
  assert.equal(collectionDropPlan(card({rows}),collection,{x:330,y:151},{type:'tabs'}),null);
});

test('gaps between groups never fall back to a distant loose row', () => {
  const rows=[node({linkId:'one'},100)];
  const groups=[node({groupId:'g1'},180,40),node({groupId:'g2'},230,120)];
  const collection={id:'c',groups:[{id:'g1'},{id:'g2'}],links:[{id:'one'}]};
  for(const y of [221,225,229,360,450])
    assert.equal(collectionDropPlan(card({rows,groups}),collection,{x:40,y},{type:'link',collectionId:'c',linkId:'one'}),null);
});

test('copy uses the source as an anchor while move skips selected source IDs', () => {
  const rows=[node({linkId:'one'},100),node({linkId:'two'},150),node({linkId:'three'},200)];
  const collection={id:'c',groups:[],links:rows.map(n=>({id:n.dataset.linkId}))};
  const payload={type:'links',collectionId:'c',linkIds:['one','two']},point={x:40,y:101};
  const move=collectionDropPlan(card({rows}),collection,point,payload);
  const copy=collectionDropPlan(card({rows}),collection,point,payload,{copy:true});
  assert.equal(move.beforeId,'three');assert.equal(copy.beforeId,'one');assert.deepEqual(move.rect,copy.rect);
});

test('whole-group geometry includes the visible source and rejects tall group centers', () => {
  const groups=[node({groupId:'g1'},100,80),node({groupId:'g2'},190,200)];
  const collection={id:'c',groups:[{id:'g1'},{id:'g2'},{id:'hidden'}],links:[]};
  const payload={type:'group',collectionId:'c',groupId:'g1'};
  const plan=collectionDropPlan(card({groups}),collection,{x:40,y:101},payload);
  assert.equal(plan.rect.top,99);assert.equal(plan.beforeId,'g2');
  assert.equal(collectionDropPlan(card({groups}),collection,{x:40,y:290},payload),null);
  assert.equal(collectionDropPlan(card({groups}),collection,{x:40,y:500},payload),null);
});

test('a whole group can be inserted between ungrouped tabs without nesting', () => {
  const rows=[node({linkId:'one'},100),node({linkId:'two'},150)];
  const collection={id:'c',groups:[],links:[{id:'one'},{id:'two'}]};
  for (const payload of [{type:'group',collectionId:'source',groupId:'g'},{type:'tabs',wholeGroup:true}]) {
    const plan=collectionDropPlan(card({rows}),collection,{x:40,y:149},payload);
    assert.ok(plan,'The gap between loose tabs must accept a whole group');
    assert.equal(plan.group,true);assert.equal(plan.beforeId,'two');
  }
});


import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionSlot, collectionReorderPlan, rowSlot } from '../extension/ui/insertion.js';
const rect = (left, top, width, height) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});
test('one gap produces one centred bar from either side and spans unequal card heights', () => {
  const items = [
    { id: 'a', rect: rect(100, 100, 300, 180) },
    { id: 'b', rect: rect(428, 100, 300, 510) },
  ];
  const a = collectionSlot(items, 'a', { x: 399, y: 120 }),
    b = collectionSlot(items, 'b', { x: 429, y: 120 });
  assert.deepEqual(a, b);
  assert.deepEqual(a, { beforeId: 'b', left: 413, top: 100, width: 2, height: 510 });
});
test('wrapped grid boundary stays beside the hovered card even when the next row is offscreen', () => {
  const items = [
    { id: 'a', rect: rect(428, 100, 300, 80) },
    { id: 'b', rect: rect(100, 1210, 300, 240) },
  ];
  const after=collectionSlot(items,'a',{x:700,y:120});
  const before=collectionSlot(items,'b',{x:101,y:1230});
  assert.equal(after.beforeId,before.beforeId,'Both edges insert before the next item');
  assert.equal(after.left,741,'After the rightmost card needs a local right-edge indicator');
  assert.equal(after.top,100);assert.equal(after.height,80);
  assert.equal(before.left,85);assert.equal(before.top,1210);
});
test('list insertion centres a horizontal bar in the vertical gap', () => {
  const items = [
    { id: 'a', rect: rect(100, 100, 480, 130) },
    { id: 'b', rect: rect(100, 260, 480, 30) },
  ];
  const a = collectionSlot(items, 'a', { x: 200, y: 229 }, { list: true }),
    b = collectionSlot(items, 'b', { x: 200, y: 261 }, { list: true });
  assert.deepEqual(a, b);
  assert.deepEqual(a, { beforeId: 'b', left: 100, top: 244, width: 480, height: 2 });
});
test('row insertion stays centred for different heights and indented content widths', () => {
  const a = { getBoundingClientRect: () => rect(24, 60, 280, 40) },
    b = { getBoundingClientRect: () => rect(24, 104, 280, 60) };
  const after = rowSlot([a, b], a, 99),
    before = rowSlot([a, b], b, 105);
  for (const key of ['left', 'top', 'width', 'height', 'next'])
    assert.equal(after[key], before[key]);
  assert.equal(after.top, 101);
  assert.equal(after.width, 280);
  assert(after.after);
  assert(!before.after);
});

test('three-column wraps and an incomplete final row use the approached outer edge', () => {
  const items=Array.from({length:5},(_,i)=>({id:String(i),rect:rect(100+(i%3)*328,100+Math.floor(i/3)*600,300,500)}));
  const wrapped=collectionReorderPlan(items,{x:1050,y:120},{sourceId:'0'});
  assert.equal(wrapped.beforeId,'3');assert.equal(wrapped.left,1069);assert.equal(wrapped.top,100);
  const tail=collectionReorderPlan(items,{x:725,y:720},{sourceId:'0'});
  assert.equal(tail.beforeId,undefined);assert.equal(tail.left,741);assert.equal(tail.top,700);
});

test('source geometry remains visible while no-op insertion boundaries are suppressed', () => {
  const items=[{id:'a',rect:rect(100,100,300,200)},{id:'source',rect:rect(428,100,300,500)},{id:'b',rect:rect(100,630,300,100)}];
  assert.equal(collectionReorderPlan(items,{x:399,y:120},{sourceId:'source'}),null);
  assert.equal(collectionReorderPlan(items,{x:725,y:120},{sourceId:'source'}),null);
  const before=collectionReorderPlan(items,{x:101,y:120},{sourceId:'source'});
  assert.equal(before.beforeId,'a');assert.equal(before.left,85);
});

test('empty areas and ambiguous centers cannot become append targets', () => {
  const items=[{id:'a',rect:rect(100,100,300,200)},{id:'b',rect:rect(428,100,300,500)},{id:'source',rect:rect(100,630,300,100)}];
  for(const point of [{x:250,y:120},{x:250,y:500},{x:950,y:200},{x:250,y:900}])
    assert.equal(collectionReorderPlan(items,point,{sourceId:'source'}),null);
});

test('list placement requires a nearby visible edge and uses the shared gap', () => {
  const items=[{id:'a',rect:rect(100,100,600,500)},{id:'b',rect:rect(100,630,600,500)},{id:'source',rect:rect(100,1160,600,100)}];
  assert.equal(collectionReorderPlan(items,{x:200,y:300},{sourceId:'source',list:true}),null);
  const a=collectionReorderPlan(items,{x:200,y:598},{sourceId:'source',list:true});
  const b=collectionReorderPlan(items,{x:200,y:632},{sourceId:'source',list:true});
  assert.deepEqual(a,b);assert.equal(a.beforeId,'b');assert.equal(a.top,614);
});

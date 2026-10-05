
import test from 'node:test';
import assert from 'node:assert/strict';
import { installAltKeyGuard } from '../extension/ui/alt-key.js';

function key(target, type, props = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { key: 'Alt', ctrlKey: false, metaKey: false,
    getModifierState: () => false, ...props });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

test('repeated Alt presses and an opening-shortcut release cancel browser menu focus', () => {
  const target = new EventTarget();
  installAltKeyGuard(target);
  assert.equal(key(target, 'keyup'), true);
  for (let i=0;i<2;i++) {
    assert.equal(key(target, 'keydown'), true);
    assert.equal(key(target, 'keyup'), true);
  }
});

test('Alt shortcuts, normal navigation and AltGr typing keep their default behavior', () => {
  const target = new EventTarget();
  installAltKeyGuard(target);
  for (const type of ['keydown','keyup']) {
    for (const props of [{key:'q',altKey:true},{key:'ArrowRight'}, {key:'Escape'},
      {key:'AltGraph'}, {ctrlKey:true}, {metaKey:true}, {getModifierState:()=>true}])
      assert.equal(key(target,type,props),false);
  }
});

test('closing the switcher restores normal Alt handling', () => {
  const target = new EventTarget(), dispose = installAltKeyGuard(target);
  dispose();
  assert.equal(key(target,'keydown'),false);
  assert.equal(key(target,'keyup'),false);
});

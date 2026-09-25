import test from 'node:test';
import assert from 'node:assert/strict';
import {updateIdentity,invalidateIdentity} from '../extension/lib/identity.js';
import {colorHex} from '../extension/lib/colors.js';

test('toolbar identity restores invalidated colours, isolates windows and retries failed writes', async t => {
  const original=globalThis.OffscreenCanvas;
  const originalPath=globalThis.Path2D;
  globalThis.Path2D=class {constructor(path){this.path=path;}};
  globalThis.OffscreenCanvas=class {
    getContext() {
      return {clearRect(){},save(){},restore(){},scale(){},translate(){},stroke(){},fill(){this.ink=this.fillStyle;},getImageData(){return {ink:this.ink};}};
    }
  };
  t.after(()=>{globalThis.OffscreenCanvas=original;globalThis.Path2D=originalPath;});
  const icons=new Map(),titles=new Map();
  let writes=0,fail=false,duringWrite;
  const browser={
    tabs:{query:async()=>[{id:901,windowId:1},{id:902,windowId:2}]},
    action:{
      setIcon:async options=>{writes++;if(fail){fail=false;throw Error('tab temporarily unavailable');}icons.set(options.tabId,options);duringWrite?.(options.tabId);},
      setTitle:async ({tabId,title})=>titles.set(tabId,title),
    },
  };
  const library={collections:[{id:'green',name:'Research',color:'mint'},{id:'pink',name:'Writing',color:'rose'}]};
  const active={1:{collectionId:'green'},2:{collectionId:'pink'}};
  await updateIdentity(browser,library,active);
  assert.equal(icons.get(901).imageData[16].ink,colorHex('mint'));
  assert.equal(icons.get(902).imageData[16].ink,colorHex('rose'));
  const previous=writes;
  await updateIdentity(browser,library,active);
  assert.equal(writes,previous,'unchanged tabs should avoid redundant icon writes');
  icons.delete(901);titles.delete(901); // Browser navigation resets per-tab state.
  invalidateIdentity(901);
  await updateIdentity(browser,library,active);
  assert.equal(icons.get(901).imageData[32].ink,colorHex('mint'));
  assert.match(titles.get(901),/Research/);
  assert.equal(writes,previous+1,'navigation must not recolour unrelated windows');

  invalidateIdentity(901);fail=true;
  await updateIdentity(browser,library,active);
  const failed=writes;
  await updateIdentity(browser,library,active);
  assert.equal(writes,failed+1,'a failed browser call must remain retryable');

  invalidateIdentity(901);
  duringWrite=id=>invalidateIdentity(id);
  await updateIdentity(browser,library,active);
  duringWrite=undefined;
  const invalidated=writes;
  await updateIdentity(browser,library,active);
  assert.equal(writes,invalidated+1,'in-flight invalidation must not become a valid cached write');

  delete active[1];
  await updateIdentity(browser,library,active);
  assert.equal(icons.get(901).path[16],'icons/16.png');
  assert.equal(icons.get(902).imageData[16].ink,colorHex('rose'));
});

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkMediaStability({
  app,
  rpc,
  results,
  out,
  delay,
  origin,
  triggerSwitcher,
}) {
  await rpc('settings', { settings: { previewCapture: false, autoGroup: false } });
  const lateInvalidation = await app.evaluate(`(async()=>{
    const db=await import('./lib/db.js');const previews=await import('./lib/previews.js?late-race');
    const url='https://preview-race.test/';const c=document.createElement('canvas');c.width=c.height=32;c.getContext('2d').fillRect(0,0,32,32);
    const data=c.toDataURL();const blob=await(await fetch(data)).blob();await db.write('previews',{id:url,blob,bytes:blob.size,at:Date.now()});
    const get=chrome.tabs.get, capture=chrome.tabs.captureVisibleTab,put=IDBObjectStore.prototype.put;
    chrome.tabs.get=async()=>({id:567,windowId:1,active:true,incognito:false,url});chrome.tabs.captureVisibleTab=async()=>data;
    IDBObjectStore.prototype.put=function(value,...args){const request=put.call(this,value,...args);if(this.name==='previews'&&value.id===url)request.addEventListener('success',()=>previews.invalidatePreviews());return request;};
    try{await previews.capture(567);}finally{chrome.tabs.get=get;chrome.tabs.captureVisibleTab=capture;IDBObjectStore.prototype.put=put;}
    return !!await db.read('previews',url);
  })()`);
  assert(lateInvalidation, 'A tab-change invalidation after the cache write deleted the thumbnail');
  const url = origin + '/media-target';
  const seed = () =>
    app.evaluate(
      `(async()=>{const c=new OffscreenCanvas(64,48);const x=c.getContext('2d');x.fillStyle='#19af79';x.fillRect(0,0,64,48);const blob=await c.convertToBlob({type:'image/png'});const db=await import('./lib/db.js');await db.write('previews',{id:${JSON.stringify(url)},blob,bytes:blob.size,at:Date.now()});return true;})()`,
    );
  await seed();
  results.push(
    'A tab-change invalidation after the preview write preserves the committed thumbnail',
  );
  const tab = await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(url)},active:false})`);
  for (const route of ['/media-plain', '/media-strict', '/media-retry', '/media-corrupt']) {
    const retry = route === '/media-retry' || route === '/media-corrupt';
    if (retry)
      await app.evaluate(
        `(async()=>{const db=await import('./lib/db.js');await db.remove('previews',${JSON.stringify(url)});${route === '/media-corrupt' ? `const blob=new Blob(['corrupt PNG'],{type:'image/png'});await db.write('previews',{id:${JSON.stringify(url)},blob,bytes:blob.size,at:Date.now()});` : ''}})()`,
      );
    let host = await app.evaluate(
      `chrome.tabs.create({windowId:${tab.windowId},url:${JSON.stringify(origin + route)},active:false})`,
    );
    for (let n = 0; n < 50; n++) {
      host = await app.evaluate(`chrome.tabs.get(${host.id})`);
      if (host.status === 'complete' && host.url === origin + route) break;
      await delay(100);
    }
    await rpc('activate', { tabId: host.id });
    await triggerSwitcher(host);
    const read = (code) =>
      app.evaluate(
        `chrome.scripting.executeScript({target:{tabId:${host.id}},func:()=>{const root=globalThis.__neoSurface;${code}}}).then(r=>r[0].result)`,
      );
    await read(
      "const s=root.querySelector('#quick-search');s.value='media-target';s.dispatchEvent(new Event('input',{bubbles:true}));",
    );
    await delay(250);
    await read(
      `root.querySelector('[data-key*=":tab:${tab.id}:"]')?.scrollIntoView({block:'center'});`,
    );
    if (retry) {
      await delay(750);
      assert(
        await read(
          `return !!root.querySelector('[data-key*=\":tab:${tab.id}:\"] .preview-missing');`,
        ),
        'Missing/corrupt thumbnail must retain its fallback',
      );
      await seed();
    }
    let visual;
    for (let n = 0; n < 80; n++) {
      visual = await read(
        `const f=root.querySelector('[data-key*=\":tab:${tab.id}:\"] .preview-image');const img=f?.querySelector(':scope > img');const c=f?.querySelector(':scope > canvas');return {image:!!img,loaded:!!img?.naturalWidth,canvas:!!c,pixel:c?[...c.getContext('2d').getImageData(0,0,1,1).data]:null,text:f?.textContent};`,
      );
      if (visual.loaded || visual.canvas) break;
      await delay(100);
    }
    await fs.writeFile(
      path.join(out, route.slice(1) + '.json'),
      JSON.stringify({ visual, stored: !!(await rpc('preview', { url })), transport: await read(`return chrome.runtime.sendMessage({action:'preview',data:{url:${JSON.stringify(url)}},overlayToken:globalThis.__neoOverlayContext?.token}).then(r=>({ok:r.ok,error:r.error,data:r.value?.data?.slice(0,80),frame:root.querySelector('.preview-image')?.getBoundingClientRect().toJSON(),view:root.querySelector('.task-view')?.getBoundingClientRect().toJSON()}))`) }, null, 2),
    );
    assert(visual.loaded || visual.canvas, 'Cached thumbnail disappeared on ' + route);
    if (visual.canvas) assert.deepEqual(visual.pixel, [25, 175, 121, 255]);
    await read('globalThis.__neoCloseOverlay()');
    if (retry)
      results.push(
        route.slice(1) +
          ': thumbnail becomes visible after cache recovers without reopening the overlay',
      );
  }
  results.push(
    'Same cached thumbnail renders when opening the overlay on ordinary and strict-image-CSP pages',
  );
}

import assert from 'node:assert/strict';
export async function checkFaviconStability({ app, results, origin, delay }) {
  const url = origin + '/pinned';
  const tab = await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(url)},active:false})`);
  for (let i = 0; i < 100; i++) {
    if (await app.evaluate(`chrome.tabs.get(${tab.id}).then(t=>t.status==='complete'&&!!t.favIconUrl)`)) break;
    await delay(100);
  }
  const generic = await app.evaluate(
    `(async()=>{const u=new URL(chrome.runtime.getURL('_favicon/'));u.searchParams.set('pageUrl','https://never-visited.invalid/');u.searchParams.set('size','32');const b=new Uint8Array(await (await fetch(u)).arrayBuffer());return btoa(String.fromCharCode(...b));})()`,
  );
  const render = () =>
    app.evaluate(
      `(async()=>{const {favicon}=await import('./ui/shared.js');document.querySelector('#icon-repro')?.remove();const box=document.createElement('div');box.id='icon-repro';box.style='position:fixed;top:10px;left:10px;z-index:99999;padding:20px;background:white';box.append(favicon({url:${JSON.stringify(url)},title:'Pinned fixture'}));document.body.append(box);})()`,
    );
  const pixels = () =>
    app.evaluate(
      `(()=>{const source=document.querySelector('#icon-repro .favicon canvas,#icon-repro .favicon img');if(!source || (source.tagName==='IMG'&&!source.naturalWidth))return null;const c=document.createElement('canvas');c.width=c.height=32;c.getContext('2d').drawImage(source,0,0,32,32);return c.toDataURL();})()`,
    );
  await app.send('Page.bringToFront');
  await render();
  let before;
  for (let n = 0; n < 60 && !(before = await pixels()); n++) await delay(100);
  assert(before, 'Initial real site icon missing');
  assert.notEqual(before, 'data:image/png;base64,' + generic);
  // Inject failures at the native-cache transport boundary; do not rely on CDP
  // interception of browser-internal favicon URLs (which is browser-dependent).
  const faults = await app.evaluate(`(async()=>{
    const db=await import('./lib/db.js');const url=${JSON.stringify(url)};
    const saved=await db.read('favicons',url);if(!saved?.data)throw Error('Real icon was not persisted');
    await db.write('favicons',{...saved,at:1});
    const original=globalThis.fetch;let genericCalls=0,failedCalls=0,corruptCalls=0;
    const bytes=Uint8Array.from(atob(${JSON.stringify(generic)}),c=>c.charCodeAt(0));
    try{
      globalThis.fetch=async()=>{genericCalls++;return new Response(bytes,{headers:{'Content-Type':'image/png'}});};
      const genericCache=await import('./lib/favicons.js?generic-fault');
      const genericResult=await genericCache.favicon(url);
      globalThis.fetch=async()=>{failedCalls++;throw Error('Simulated native-cache outage');};
      const failedCache=await import('./lib/favicons.js?unavailable-fault');
      const failedResult=await failedCache.favicon(url);
      globalThis.fetch=async()=>{corruptCalls++;return new Response('not an image');};
      const corruptCache=await import('./lib/favicons.js?corrupt-fault');
      const corruptResult=await corruptCache.favicon(url);
      return {genericCalls,failedCalls,corruptCalls,corruptKept:corruptResult===saved.data,genericKept:genericResult===saved.data,failedKept:failedResult===saved.data,storedKept:(await db.read('favicons',url)).data===saved.data};
    }finally{globalThis.fetch=original;}
  })()`);
  assert.deepEqual(faults, {
    genericCalls: 2,
    failedCalls: 1,
    corruptCalls: 1,
    corruptKept: true,
    genericKept: true,
    failedKept: true,
    storedKept: true,
  });
  await render();
  // A known decoded image should be available synchronously during rerenders.
  assert.equal(await pixels(), before, 'A rerender lost the previously rendered site icon');
  await app.evaluate("document.querySelector('#icon-repro')?.remove()");
  results.push(
    'Real site favicon is persisted and survives simulated generic/unavailable/corrupt native-cache responses; rerenders retain identical pixels',
  );
}

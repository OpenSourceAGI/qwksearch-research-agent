
import assert from 'node:assert/strict';
export async function checkPreviews({ app, results }) {
  const sample = await app.evaluate(`(async()=>{
    const db=await import('./lib/db.js'); const entries=await db.all('previews');
    const source=entries.find(p=>p.width); if(!source)return null;
    const bitmap=await createImageBitmap(source.blob);const sizes=[];
    for(const width of [480,960]){
      const scale=Math.min(1,width/bitmap.width,720/bitmap.height);
      const canvas=new OffscreenCanvas(Math.round(bitmap.width*scale),Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      const times=[];let blob;
      for(let i=0;i<5;i++){const start=performance.now();blob=await canvas.convertToBlob({type:'image/webp',quality:width===480?.7:.8});times.push(performance.now()-start);}
      times.sort((a,b)=>a-b);sizes.push({width:canvas.width,height:canvas.height,bytes:blob.size,medianEncodeMs:Math.round(times[2]*10)/10});
    }
    bitmap.close();return {sourceWidth:source.width,sourceHeight:source.height,sizes};
  })()`);
  assert(sample && sample.sourceWidth <= 960 && sample.sourceHeight <= 720);
  results.push(
    'Cached real-page preview encoding sample (5 runs, not a site-wide benchmark): ' +
      JSON.stringify(sample),
  );
  const checked = await app.evaluate(`(async()=>{
    const db=await import('./lib/db.js');const previews=await import('./lib/previews.js');
    for(const row of await db.all('previews'))await db.remove('previews',row.id);
    for(const [id,at]of [['old',Date.now()-15*86400000],['first',Date.now()-1000],['new',Date.now()]]){
      const blob=new Blob([new Uint8Array(700)],{type:'image/webp'});await db.write('previews',{id,at,bytes:blob.size,blob});
    }
    await previews.trimPreviews(1000);const kept=(await db.all('previews')).map(x=>x.id);
    const originalGet=chrome.tabs.get,originalCapture=chrome.tabs.captureVisibleTab;
    let captured=0,step=0;chrome.tabs.captureVisibleTab=async()=>{captured++;previews.invalidatePreviews();return 'data:image/png;base64,broken';};
    chrome.tabs.get=async()=>({id:123,active:true,incognito:false,windowId:1,url:'https://example.org/capture-race'});
    try{await previews.capture(123);}finally{chrome.tabs.get=originalGet;chrome.tabs.captureVisibleTab=originalCapture;}
    const race=await db.read('previews','https://example.org/capture-race');
    const privateModule=await import('./lib/previews.js?private-check');
    chrome.tabs.get=async()=>({id:123,active:true,incognito:true,windowId:1,url:'https://example.org/private'});
    chrome.tabs.captureVisibleTab=async()=>{captured++;return 'broken';};
    try{await privateModule.capture(123);}finally{chrome.tabs.get=originalGet;chrome.tabs.captureVisibleTab=originalCapture;}
    const expired=await previews.preview('old');return {kept,captured,race:!!race,expired};
  })()`);
  assert.deepEqual(checked, { kept: ['new'], captured: 1, race: false, expired: null });
  results.push(
    'Real preview storage prunes by byte budget and age; injected navigation race/private state never persists a capture',
  );
}

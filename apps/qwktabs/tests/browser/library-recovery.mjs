
import assert from 'node:assert/strict';

export async function checkLibraryRecovery({app,rpc,results,delay,origin}) {
  const wait=async(fn,message)=>{
    for(let i=0;i<100;i++){if(await fn())return;await delay(100);}
    throw Error(message);
  };
  await rpc('settings',{settings:{autoGroup:false}});
  await app.send('Page.enable');
  const injection=await app.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const send=chrome.runtime.sendMessage.bind(chrome.runtime);
    globalThis.__failLoads=1;
    chrome.runtime.sendMessage=(message,...args)=>{
      if(message?.action==='load' && globalThis.__stallLoads) return new Promise(()=>{});
      if(message?.action==='load' && globalThis.__failLoads-->0) return Promise.reject(new Error('Test: temporary connection failure'));
      return send(message,...args);
    };
  `});
  await app.send('Page.reload');
  await wait(()=>app.evaluate('typeof globalThis.__failLoads==="number" && globalThis.__failLoads<=0'),'Load failure was not injected');
  await wait(()=>app.evaluate('!!document.querySelector("#tab-tools button") && !!document.querySelector("#spaces .active")'),'A single failed initial load left the Library stuck');
  await app.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});
  const tab=await app.evaluate(`chrome.tabs.create({url:${JSON.stringify(origin+'/recovery-tab')},active:false})`);
  await wait(()=>app.evaluate(`!!document.querySelector('[data-tab-id="${tab.id}"]')`),'Recovered Library did not subscribe to new tabs');
  results.push('A failed first load recovers and live tab subscriptions are installed');

  await app.evaluate('globalThis.__failLoads=1');
  await app.evaluate(`chrome.tabs.update(${tab.id},{url:${JSON.stringify(origin+'/recovery-renamed')}})`);
  await wait(()=>app.evaluate('globalThis.__failLoads<0'),'Refresh did not retry after a transient failure');
  await app.evaluate(`chrome.tabs.remove(${tab.id})`);
  await wait(()=>app.evaluate(`!document.querySelector('[data-tab-id="${tab.id}"]')`),'Recovered refresh kept a closed tab');
  results.push('A transient refresh failure retries and later tab closure stays in sync');
  await app.evaluate('globalThis.__failLoads=100');
  await rpc('settings',{settings:{autoGroup:false}});
  await wait(()=>app.evaluate('!!document.querySelector(".load-error:not([hidden])")'),'Persistent failure has no recovery control');
  assert(await app.evaluate('!!document.querySelector("#spaces .active")'),'Refresh failure erased the last loaded view');
  await app.evaluate('globalThis.__failLoads=0; document.querySelector(".load-error button").click()');
  await wait(()=>app.evaluate('!!document.querySelector(".load-error[hidden]")'),'Retry did not restore the Library');
  results.push('Persistent failures keep existing content and offer a working Retry button');

  await app.evaluate('globalThis.__stallLoads=true');
  await rpc('settings',{settings:{autoGroup:false}});
  await wait(()=>app.evaluate('!!document.querySelector(".load-error:not([hidden])")'),'A hung read never offered recovery');
  await app.evaluate('globalThis.__stallLoads=false; document.querySelector(".load-error button").click()');
  await wait(()=>app.evaluate('!!document.querySelector(".load-error[hidden]")'),'Timed-out read blocked later recovery');
  results.push('A hung read times out; retry recovers without repeating a mutation');
  assert.equal(app.events.length,0,JSON.stringify(app.events));
}

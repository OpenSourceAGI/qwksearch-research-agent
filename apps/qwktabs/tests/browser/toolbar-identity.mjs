import assert from 'node:assert/strict';

export async function checkToolbarIdentity({app,rpc,results,delay,origin}) {
  const wait = async (fn, message) => {
    for(let i=0;i<60;i++) { if(await fn()) return; await delay(100); }
    throw Error(message);
  };
  const own = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('import',{collections:[{id:'identity',name:'Identity green',color:'#64851c',autoUpdate:false,groups:[],links:[{id:'identity-link',title:'Identity',url:origin+'/identity-start'}]}]});
  const collection = (await rpc('load')).state.collections.find(c=>c.name==='Identity green');
  await rpc('switch',{windowId:own.windowId,destinationId:collection.id,tracking:false});
  const tab = await app.evaluate(`chrome.tabs.create({windowId:${own.windowId},url:${JSON.stringify(origin+'/identity-start')},active:true})`);
  assert(tab);
  const restored = () => app.evaluate(`chrome.action.getTitle({tabId:${tab.id}}).then(t=>t.includes('Identity green'))`);
  await wait(restored,'initial toolbar identity absent');
  await app.evaluate(`chrome.tabs.update(${tab.id},{active:true,url:${JSON.stringify(origin+'/identity-next')}})`);
  await wait(()=>app.evaluate(`chrome.tabs.get(${tab.id}).then(t=>t.status==='complete')`),'navigation did not finish');
  await delay(500);
  assert(await restored(),'navigation reset the toolbar identity and Neo did not restore it');
  await app.evaluate(`chrome.tabs.reload(${tab.id})`);
  await delay(500);
  await wait(restored,'same-URL reload lost the toolbar identity');
  await app.evaluate(`chrome.tabs.update(${own.id},{active:true})`);
  await app.evaluate(`chrome.tabs.update(${tab.id},{active:true})`);
  await wait(restored,'tab activation lost the toolbar identity');
  results.push('Per-tab toolbar identity survives navigation, same-URL reload and switching between Library and content tabs');
}

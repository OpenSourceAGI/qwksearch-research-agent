import assert from 'node:assert/strict';
import http from 'node:http';

export async function checkOverlayAI({app,rpc,read,click,wait,results,triggerSwitcher,pin}) {
  let requests=0;
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const part of req)raw+=part;
    const context=JSON.parse(JSON.parse(raw).messages[0].content.split('\nData: ')[1]);
    requests++;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({name:'Overlay research',note:'Research references.',groups:[{name:'Overlay research',ids:context.groupable}]})}}]}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const endpoint=`http://127.0.0.1:${server.address().port}/chat/completions`;
    await rpc('settings',{settings:{autoGroup:false,provider:'compatible',model:'fixture',aiEndpoint:endpoint}});
    await rpc('credentials',{aiProvider:'compatible',aiEndpoint:endpoint,aiKey:'local-fixture-key'});
    await read('globalThis.__neoCloseOverlay()');
    await triggerSwitcher(pin);
    await wait(()=>read(`return !!root?.querySelector('.tab-more-button')`));
    await click('Group and sort tabs');
    await read(`[...root.querySelectorAll('[role="menuitem"]')].find(b=>b.textContent==='Group by topic with AI').click()`);
    await wait(()=>read(`return !!root.querySelector('.topic-apply')`));
    assert(await read('return chrome.permissions===undefined'),'Reproduce in the actual content-script API environment');
    const layout=()=>app.evaluate(`(async()=>{const gs=await chrome.tabGroups.query({});return (await chrome.tabs.query({})).map(t=>[t.id,gs.find(g=>g.id===t.groupId)?.title||null]).sort((a,b)=>a[0]-b[0]);})()`);
    const before=await layout();
    await read(`root.querySelector('.topic-apply').click()`);
    await wait(()=>requests===1);
    await wait(()=>read(`return !root.querySelector('#dialog[open]') && root.querySelector('#toast')?.textContent.includes('Grouped')`));
    const groups=await app.evaluate('chrome.tabGroups.query({})');
    assert(groups.some(g=>g.title==='Overlay research'));
    await read(`[...root.querySelectorAll('#toast button')].find(b=>b.textContent==='Undo').click()`);
    await wait(async()=>JSON.stringify(await layout())===JSON.stringify(before));
    results.push('Injected overlay topic Apply sends one local provider request, groups native tabs and supports Undo without using content-script permissions APIs');
    const missing='https://no-ai-permission.invalid/chat/completions';
    await rpc('settings',{settings:{aiEndpoint:missing}});
    await rpc('credentials',{aiProvider:'compatible',aiEndpoint:missing,aiKey:'local-fixture-key'});
    assert.equal(await rpc('ai-connection-access'),false);
    await read('globalThis.__neoCloseOverlay()');
    await triggerSwitcher(pin);
    await wait(()=>read(`return !!root?.querySelector('.tab-more-button')`));
    await click('Group and sort tabs');
    await read(`[...root.querySelectorAll('[role="menuitem"]')].find(b=>b.textContent==='Group by topic with AI').click()`);
    await wait(()=>read(`return !!root.querySelector('.topic-apply')`));
    await read(`root.querySelector('.topic-apply').click()`);
    await wait(()=>read('return !root'));
    await wait(()=>app.evaluate(`!!document.querySelector('#dialog[open]')?.textContent.includes('AI connection')`));
    assert.equal(requests,1);
    results.push('Missing provider permission opens the Library AI connection settings without making a provider request or crashing');
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}

import assert from 'node:assert/strict';

export async function checkModelDefaults({app,rpc,results,delay}) {
  const expected={gemini:'gemini-3.8-flash',deepseek:'deepseek-v4-flash',claude:'claude-sonnet-5',openai:'gpt-5.6-luna'};
  assert.equal((await rpc('load')).state.settings.model,expected.gemini);
  await app.evaluate(`location.hash='#action=ai-connection';window.dispatchEvent(new Event('hashchange'))`);
  for(let i=0;i<60;i++) {if(await app.evaluate(`!!document.querySelector('dialog[open] select')`))break;await delay(50);}
  for(const [provider,model] of Object.entries(expected)) {
    await app.evaluate(`{const select=document.querySelector('dialog[open] select');select.value=${JSON.stringify(provider)};select.dispatchEvent(new Event('change'));}`);
    assert.equal(await app.evaluate(`document.querySelector('dialog[open] input').value`),model);
  }
  await app.evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent==='Save settings').click()`);
  for(let i=0;i<60;i++){if((await rpc('load')).state.settings.provider==='openai')break;await delay(50);}
  assert.equal((await rpc('load')).state.settings.model,expected.openai);
  await app.evaluate('location.reload()');
  for(let i=0;i<60;i++){if(await app.evaluate(`!!document.querySelector('#settings')`))break;await delay(50);}
  assert.equal((await rpc('load')).state.settings.model,expected.openai);
  results.push('AI connection fills all four current model defaults on provider selection; Save and reload preserve GPT-5.6 Luna');
}

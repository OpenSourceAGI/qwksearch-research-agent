
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkNotesUX({ app, rpc, out, results, delay }) {
  const wait = async (fn) => {
    for (let i = 0; i < 100; i++) {
      if (await fn()) return;
      await delay(100);
    }
    throw Error('Note UI did not settle');
  };
  const own = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('activate', { tabId: own.id });
  await rpc('edit', { kind: 'create', name: 'Notes fixture' });
  const c = (await rpc('load')).state.collections.find((c) => c.name === 'Notes fixture');
  const selector = `[data-collection-id="${c.id}"]`;
  const read = (code) =>
    app.evaluate(
      `(()=>{const card=document.querySelector(${JSON.stringify(selector)});${code}})()`,
    );
  const click = (label) =>
    read(`card.querySelector(${JSON.stringify('button[aria-label="' + label + '"]')}).click()`);
  await app.send('Page.reload');
  await wait(() => read('return !!card'));
  const count = await app.evaluate('document.querySelectorAll(".collection").length');
  await click('Add note');
  assert.equal(await app.evaluate('document.querySelectorAll(".collection").length'), count);
  assert.equal(
    await app.evaluate('document.querySelector("#board").classList.contains("detail")'),
    false,
  );
  assert(await read('return document.activeElement===card.querySelector(".collection-note")'));
  await read(
    'const n=card.querySelector(".collection-note");n.value="A note to keep";n.dispatchEvent(new Event("input",{bubbles:true}));n.dispatchEvent(new Event("change",{bubbles:true}));',
  );
  await wait(
    async () =>
      (await rpc('load')).state.collections.find((x) => x.id === c.id).note === 'A note to keep',
  );
  await app.send('Page.reload');
  await wait(() =>
    read('return card?.querySelector(".collection-note")?.value==="A note to keep"'),
  );
  await read('card.scrollIntoView({block:"center"})');
  await fs.writeFile(
    path.join(out, 'note-in-card.png'),
    Buffer.from((await app.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
  );
  await click('Delete note');
  await wait(() => read('return !card.querySelector(".collection-note")'));
  assert.equal((await rpc('load')).state.collections.find((x) => x.id === c.id).note, '');
  assert(
    await read('return [...card.querySelectorAll("button")].some(b=>b.textContent==="Add note")'),
  );
  await app.evaluate(
    '(()=>{const undo=[...document.querySelectorAll("#toast button")].find(b=>b.textContent==="Undo");if(!undo)throw Error("Missing Undo");undo.click();})()',
  );
  await wait(() => read('return card.querySelector(".collection-note")?.value==="A note to keep"'));
  await click('Delete note');
  await wait(() => read('return !card.querySelector(".collection-note")'));
  await click('Expand Notes fixture');
  assert.equal(await read('return !!card.querySelector(".collection-note")'), false);
  await click('Add note');
  await click('Delete note');
  assert.equal(await read('return !!card.querySelector(".collection-note")'), false);
  results.push(
    'Notes: Add focuses inline without expanding; saved text survives reload; Delete removes it and offers Undo; expanded collections do not invent empty notes; empty drafts can be deleted',
  );
}

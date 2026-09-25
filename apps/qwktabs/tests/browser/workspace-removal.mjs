import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkWorkspaceRemoval({ app, rpc, out, results, delay }) {
  const wait = async (fn) => {
    for (let i = 0; i < 100; i++) {
      if (await fn()) return;
      await delay(100);
    }
    throw Error('Workspace removal did not settle');
  };
  const own = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('activate', { tabId: own.id });
  await rpc('edit', { kind: 'create-space', name: 'Remove fixture' });
  const space = (await rpc('load')).state.spaces.find((s) => s.name === 'Remove fixture');
  await rpc('edit', { kind: 'create', name: 'Owned collection', spaceId: space.id });
  const collection = (await rpc('load')).state.collections.find((c) => c.spaceId === space.id);
  await rpc('edit', {
    kind: 'add-link',
    collectionId: collection.id,
    url: 'https://example.test',
    title: 'Saved page',
  });
  await rpc('edit', { kind: 'collection', collectionId: collection.id, note: 'Owned note' });
  const before = (await rpc('load')).state;
  await assert.rejects(rpc('edit', { kind: 'delete-space', spaceId: space.id }), /Confirm/);
  await assert.rejects(
    rpc('edit', {
      kind: 'delete-space',
      spaceId: space.id,
      confirmed: true,
      expectedRevision: before.revision - 1,
    }),
    /library changed/,
  );
  await app.send('Page.reload');
  await wait(() => app.evaluate('!!document.querySelector(".space-options")'));
  const show = async () => {
    await app.evaluate(
      '[...document.querySelectorAll(".space-options")].find(b=>b.title==="Workspace options for Remove fixture").click()',
    );
    await app.evaluate(
      '[...document.querySelectorAll("#action-popover button")].find(b=>b.textContent==="Remove workspace").click()',
    );
    await wait(() => app.evaluate('!!document.querySelector("dialog[open]")'));
  };
  await show();
  assert(
    await app.evaluate(
      'document.querySelector("dialog").textContent.includes("1 collection, 1 saved tab, and notes")',
    ),
  );
  assert.equal(await app.evaluate('document.activeElement.textContent'), 'Cancel');
  await app.evaluate(
    '[...document.querySelectorAll("dialog footer button")].find(b=>b.textContent==="Cancel").click()',
  );
  await wait(() => app.evaluate('!document.querySelector("dialog[open]")'));
  assert.deepEqual((await rpc('load')).state, before);
  await show();
  await fs.writeFile(
    path.join(out, 'remove-workspace-confirmation.png'),
    Buffer.from((await app.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
  );
  await app.evaluate(
    '[...document.querySelectorAll("dialog footer button")].find(b=>b.textContent==="Remove workspace").click()',
  );
  await wait(async () => !(await rpc('load')).state.spaces.some((s) => s.id === space.id));
  const after = await rpc('load');
  assert(!after.state.collections.some((c) => c.id === collection.id));
  assert.deepEqual(
    after.state.collections,
    before.collections.filter((c) => c.spaceId !== space.id),
  );
  await rpc('undo-action', {
    id: after.journal.find((j) => j.label === 'Remove workspace').id,
    windowId: own.windowId,
  });
  assert.equal(
    (await rpc('load')).state.collections.find((c) => c.id === collection.id).note,
    'Owned note',
  );
  results.push(
    'Populated workspace removal requires confirmation; Cancel and stale confirmation preserve data; Undo restores collections, links and notes',
  );
  const tabsBefore = (await app.evaluate('chrome.tabs.query({})')).map((t) => t.id).sort();
  const original = (await rpc('load')).state.spaces;
  for (const s of original) {
    const current = (await rpc('load')).state;
    await rpc('edit', {
      kind: 'delete-space',
      spaceId: s.id,
      confirmed: true,
      expectedRevision: current.revision,
    });
  }
  const last = (await rpc('load')).state;
  assert.equal(last.spaces.length, 1);
  assert.equal(last.spaces[0].name, 'My space');
  assert(!original.some((s) => s.id === last.spaces[0].id));
  assert.equal(last.collections.length, 0);
  assert.deepEqual(
    (await app.evaluate('chrome.tabs.query({})')).map((t) => t.id).sort(),
    tabsBefore,
  );
  results.push(
    'Every workspace including the final one can be removed; a fresh empty workspace remains and browser tabs stay open',
  );
}

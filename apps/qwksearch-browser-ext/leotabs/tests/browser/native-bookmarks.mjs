
import assert from 'node:assert/strict';
export async function checkBookmarks({ app, rpc, results, delay }) {
  const tab = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('activate', { tabId: tab.id });
  const fixture = {
    name: 'Native bookmark fixture',
    groups: [
      { id: 'r', name: 'References', collapsed: true },
      { id: 'empty', name: 'Empty group', collapsed: false },
    ],
    links: [
      { id: 'r1', title: 'Research', url: 'https://example.org/reference', groupId: 'r' },
      { id: 'r2', title: 'Overview', url: 'https://example.org/overview', groupId: null },
    ],
  };
  const imported = await rpc('import', { collections: [fixture] }),
    c = imported.state.collections.at(-1);
  const tree = await rpc('bookmarks-read'),
    parent = tree[0].children.find((n) => !n.url);
  const exported = await rpc('bookmarks-export', { collectionId: c.id, parentId: parent.id }),
    root = await app.evaluate(
      `chrome.bookmarks.getSubTree(${JSON.stringify(exported.bookmarkRoot)})`,
    );
  assert.equal(root[0].title, fixture.name);
  assert.equal(
    root[0].children.find((n) => n.title === 'References').children[0].url,
    fixture.links[0].url,
  );
  assert.equal(root[0].children.find((n) => n.title === 'Empty group').children.length, 0);
  assert.equal(exported.status, 'complete');
  await app.evaluate('document.getElementById("imports").click()');
  await app.evaluate(
    `[...document.querySelectorAll('#dialog button')].find(b=>b.textContent==='Import browser bookmarks').click()`,
  );
  for (
    let i = 0;
    i < 30 &&
    !(await app.evaluate(`document.querySelector('#dialog h2')?.textContent==='Review import'`));
    i++
  )
    await delay(100);
  assert(await app.evaluate('document.querySelector("#dialog").textContent.includes("2 links")'));
  await app.evaluate(
    `[...document.querySelectorAll('#dialog button')].find(b=>b.textContent==='Import collections').click()`,
  );
  await delay(300);
  const restored = (await rpc('load')).state.collections.find((x) => x.name === parent.title);
  assert(restored?.links.some((l) => l.url === fixture.links[0].url));
  assert(restored.groups.some((g) => g.name.endsWith('Empty group')));
  await app.evaluate(`chrome.bookmarks.removeTree(${JSON.stringify(exported.bookmarkRoot)})`);
  results.push(
    'Native bookmark export and UI import preserve links, hierarchy and empty groups with fixture-granted access',
  );
}

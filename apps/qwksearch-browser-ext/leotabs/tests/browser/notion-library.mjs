
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkNotionLibrary({ app, rpc, results, delay, out, notionCalls }) {
  const wait = async predicate => {
    for (let i = 0; i < 160; i++) { if (await predicate()) return; await delay(50); }
    throw Error('Notion library UI did not settle: ' + await app.evaluate(`document.querySelector('dialog[open]')?.textContent`));
  };
  const click = label => app.evaluate(`(()=>{const b=[...document.querySelectorAll('dialog[open] button,#action-popover button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b)throw Error('Missing button: '+${JSON.stringify(label)});b.click();})()`);
  const close = () => app.evaluate(`document.querySelector('dialog[open]')?.close();document.querySelector('#action-popover')?.hidePopover()`);
  await rpc('credentials', { notionKey: 'fixture-only-notion' });
  await rpc('settings', { settings: { notionParent: 'a'.repeat(32) } });
  await rpc('import', { collections: [
    { name: 'Long collection', note: 'Collection notes', groups: [{ id: 'group', name: 'Reading' }], links: Array.from({length: 120}, (_, i) => ({ title: 'Link ' + i, url: 'https://example.org/' + i, groupId: 'group', note: i === 0 ? 'Link note' : '' })) },
    { name: 'Empty collection', links: [], groups: [] },
  ] });
  const collections = (await rpc('load')).state.collections;
  for (const theme of ['light', 'dark']) {
    await rpc('settings', { settings: { theme } });
    await wait(() => app.evaluate(`document.documentElement.dataset.theme===${JSON.stringify(theme)}`));
    for (const width of [1440, 390]) {
      await app.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await close();
      await app.evaluate(`document.querySelector('#settings').click()`);
      await click('Export & import');
      await delay(150);
      const metrics = await app.evaluate(`(()=>{const d=document.querySelector('dialog[open]');return {title:d.querySelector('h2').textContent,folds:d.querySelectorAll('details').length,buttons:[...d.querySelectorAll('.transfer-options button')].map(b=>{const r=b.getBoundingClientRect();return {label:b.textContent.trim(),x:r.x,y:r.y,width:r.width,bottom:r.bottom}}),overflow:d.scrollWidth>d.clientWidth}})()`);
      assert.equal(metrics.title, 'Export & import');
      assert.equal(metrics.folds, 0);
      assert.equal(metrics.overflow, false);
      assert.deepEqual(metrics.buttons.map(b => b.label), ['Backup JSON', 'Bookmark HTML', 'Markdown', 'Send to Notion…', 'Import data']);
      assert(metrics.buttons.every((b, i, rows) => !i || b.y >= rows[i-1].bottom));
      assert(metrics.buttons.every(b => Math.abs(b.width - metrics.buttons[0].width) < 1));
      await fs.writeFile(path.join(out, `export-import-${theme}-${width}.png`), Buffer.from((await app.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    }
  }
  await click('Send to Notion…');
  assert(await app.evaluate(`document.querySelector('dialog[open]').textContent.includes('across all spaces')`));
  await click('Create Notion pages');
  await wait(async () => (await rpc('load')).journal.some(j => j.kind === 'notion' && j.cursor > 0));
  await click('Pause');
  await delay(700);
  const partial = (await rpc('load')).journal.find(j => j.kind === 'notion');
  assert.notEqual(partial.status, 'complete');
  assert(partial.pages.every(p => !('blocks' in p)));
  await app.send('Page.reload');
  await wait(() => app.evaluate(`!!document.querySelector('#spaces .active') && !!document.querySelector('[data-collection-id]')`));
  await app.evaluate(`document.querySelector('#recovery').click()`);
  await click('Continue export');
  await wait(async () => (await rpc('load')).journal.some(j => j.id === partial.id && j.status === 'complete'));
  await wait(() => app.evaluate(`document.querySelector('dialog[open]').textContent.includes('Exported 2 collections to Notion')`));
  const posts = notionCalls.filter(c => c.path === '/v1/pages');
  assert.equal(posts.length, collections.length);
  assert.deepEqual(posts.map(c => c.body.properties.title.title[0].text.content), collections.map(c => c.name));
  assert(posts.every(c => c.body.parent.page_id === 'a'.repeat(32)));
  assert(notionCalls.some(c => c.path.endsWith('/children')));
  assert.equal(await app.evaluate(`document.querySelectorAll('dialog[open] a').length`), collections.length);
  results.push('Export & import options stack at desktop/mobile in both themes; library Notion export pauses, reloads and resumes with one page per collection, all links and no duplicate pages');
}

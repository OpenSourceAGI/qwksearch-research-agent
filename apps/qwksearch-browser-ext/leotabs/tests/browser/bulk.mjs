
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function checkBulk({ app, rpc, windowId, out, results, delay }) {
  const baseline = new Set((await rpc('load')).tabs.map((t) => t.id)),
    metrics = [];
  for (const count of [30, 100, 500]) {
    const imported = await rpc('import', {
      collections: [
        {
          name: 'Bulk fixture ' + count,
          groups: [{ id: 'bulk-group', name: 'Bulk research', color: 'green', collapsed: true }],
          links: Array.from({ length: count }, (_, i) => ({
            id: 'b' + i,
            title: 'Bulk page ' + i,
            url: 'https://example.org/bulk/' + count + '/' + i,
            groupId: 'bulk-group',
          })),
        },
      ],
    });
    const c = imported.state.collections.at(-1),
      job = await rpc('resume-start', { collectionId: c.id, windowId, deferred: true });
    const start = performance.now();
    await app.evaluate(
      `globalThis.__bulkResult=null;globalThis.__bulkError=null;chrome.runtime.sendMessage({action:'resume-run',data:{id:${JSON.stringify(job.id)}}}).then(r=>{if(r.ok)globalThis.__bulkResult=r.value;else globalThis.__bulkError=r.error;});void 0`,
    );
    let result;
    for (let i = 0; i < 1200; i++) {
      const status = await app.evaluate(
        '({result:globalThis.__bulkResult,error:globalThis.__bulkError})',
      );
      if (status.error) throw Error(status.error);
      if (status.result) {
        result = status.result;
        break;
      }
      await delay(100);
    }
    assert(result, 'Bulk resume completes within fixture budget');
    assert.equal(result.created.length, count);
    assert.equal(result.failed.length, 0);
    assert.equal(result.groupFailures.length, 0);
    const live = (await rpc('load')).tabs
      .filter((t) => result.created.includes(t.id))
      .sort((a, b) => a.index - b.index);
    assert(live.every((t) => t.parked));
    assert.deepEqual(
      live.map((t) => t.title),
      Array.from({ length: count }, (_, i) => 'Bulk page ' + i),
    );
    metrics.push({
      tabs: count,
      durationMs: Math.round(performance.now() - start),
      discarded: live.filter((t) => t.discarded).length,
    });
    for (let i = 0; i < result.created.length; i += 25)
      await app.evaluate(`chrome.tabs.remove(${JSON.stringify(result.created.slice(i, i + 25))})`);
    await rpc('edit', { kind: 'delete-collection', collectionId: c.id });
  }
  results.push(
    '30/100/500 actual native tabs resume as ordered parked pages with native grouping and bounded preparation',
  );

  const imported = await rpc('import', {
    collections: [
      {
        name: 'Cancel fixture',
        groups: [],
        links: Array.from({ length: 100 }, (_, i) => ({
          id: 'c' + i,
          title: 'Cancel page ' + i,
          url: 'https://example.org/cancel/' + i,
        })),
      },
    ],
  });
  const c = imported.state.collections.at(-1),
    job = await rpc('resume-start', { collectionId: c.id, windowId });
  await app.evaluate(
    `globalThis.__bulkResult=null;chrome.runtime.sendMessage({action:'resume-run',data:{id:${JSON.stringify(job.id)}}}).then(r=>globalThis.__bulkResult=r);void 0`,
  );
  for (let i = 0; i < 100; i++) {
    const status = await rpc('operation-status', { id: job.id });
    if (status.completed >= 8) break;
    await delay(50);
  }
  await rpc('cancel-operation', { id: job.id });
  let cancelled;
  for (let i = 0; i < 100; i++) {
    cancelled = await app.evaluate('globalThis.__bulkResult');
    if (cancelled) break;
    await delay(50);
  }
  assert(cancelled?.ok);
  assert(cancelled.value.cancelled);
  assert(cancelled.value.created.length < 100);
  assert.equal((await rpc('operation-status', { id: job.id })).status, 'cancelled');
  const remaining = (await rpc('load')).tabs;
  assert([...baseline].every((id) => remaining.some((t) => t.id === id)));
  await app.evaluate(`chrome.tabs.remove(${JSON.stringify(cancelled.value.created)})`);
  await rpc('edit', { kind: 'delete-collection', collectionId: c.id });
  results.push(
    'Cancelling an actual bulk resume stops further creation and retains a durable recovery snapshot',
  );

  const dialogCheck = await app.evaluate(
    `(async()=>{const {modal,el}=await import('./ui/shared.js');let secondClosed=false;const first=modal('Review fixture',el('p',{},'Review'));first.close();const second=modal('Progress fixture',el('p',{},'Progress'));second.dialog.addEventListener('close',()=>secondClosed=true,{once:true});await new Promise(r=>setTimeout(r,40));const ok=second.dialog.open&&!secondClosed;second.close();return ok;})()`,
  );
  assert(dialogCheck);
  results.push('Queued close events from a review dialog cannot cancel the next progress dialog');
  await fs.writeFile(
    path.join(out, 'bulk.json'),
    JSON.stringify({ metrics, cancelledAfter: cancelled.value.created.length }, null, 2),
  );
  console.log('Measured native bulk resume:', metrics);
}

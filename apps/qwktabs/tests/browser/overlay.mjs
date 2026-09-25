
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function checkOverlay({
  app,
  rpc,
  targets,
  connect,
  pin,
  triggerSwitcher,
  out,
  results,
  delay,
}) {
  const read = async (code) =>
    app.evaluate(
      `chrome.scripting.executeScript({target:{tabId:${pin.id}},func:()=>{const root=globalThis.__neoSurface;${code}}}).then(r=>r[0].result)`,
    );
  const commands = await app.evaluate('chrome.commands.getAll()');
  assert.equal(commands.find((c) => c.name === 'open-switcher').shortcut, 'Alt+Q');
  assert.equal(commands.find((c) => c.name === 'open-search').shortcut, 'Alt+Shift+K');
  assert.equal(commands.find((c) => c.name === 'open-library').shortcut, 'Alt+Shift+Q');
  assert.equal(await app.evaluate('chrome.runtime.getManifest().action.default_popup'), undefined);
  let mounted;
  for (let i = 0; i < 100; i++) {
    await delay(100);
    mounted = await read('return !!root?.querySelector(".preview-tile")');
    if (mounted) break;
  }
  if (!mounted)
    await fs.writeFile(
      path.join(out, 'overlay-targets.json'),
      JSON.stringify(await targets(), null, 2),
    );
  if (!mounted)
    console.log(
      'Overlay diagnostic',
      await read(
        'return { root: !!root, context: !!globalThis.__neoOverlayContext, tail: root?.textContent.slice(-700), view: root?.querySelector(".task-view")?.textContent }',
      ),
    );
  assert(mounted, 'Action shortcut mounts a switcher on the original page');
  assert(
    await read(
      'const b=root.querySelector(".task-view").getBoundingClientRect(); return b.left >= 16 && b.top >= 16 && b.right <= innerWidth-16 && b.bottom <= innerHeight-16;',
    ),
    'Floating switcher leaves the current page visible on every side',
  );
  for (
    let i = 0;
    i < 30 && !(await read('return !!root.querySelector(".preview-image > :is(img, canvas)")'));
    i++
  )
    await delay(100);
  if (!(await read('return !!root.querySelector(".preview-image > :is(img, canvas)")'))) {
    // The UI intentionally doesn't wait indefinitely for Chrome's compositor.
    // Capture explicitly with the action's grant, then verify displaying it.
    await read('globalThis.__neoCloseOverlay()');
    await delay(1100);
    await rpc('capture');
    await triggerSwitcher(pin);
    for (
      let i = 0;
      i < 100 && !(await read('return !!root?.querySelector(".preview-image > :is(img, canvas)")'));
      i++
    )
      await delay(100);
  }
  assert(
    await read('return !!root?.querySelector(".preview-image > :is(img, canvas)")'),
    'Actual captured page screenshot is displayed',
  );
  const nativePage = await connect(
    (await targets()).find((t) => t.url.endsWith('/pinned')).webSocketDebuggerUrl,
  );
  assert.equal(
    await nativePage.evaluate('document.querySelector("[popover]")?.shadowRoot'),
    null,
    'Page cannot read private overlay DOM',
  );
  await nativePage.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await delay(200);
  await (
    await import('./switcher-ux.mjs')
  ).checkSwitcherUX({ read, rpc, app, pin, nativePage, out, results, delay });
  await fs.writeFile(
    path.join(out, 'switcher.png'),
    Buffer.from(
      (await nativePage.send('Page.captureScreenshot', { format: 'png' })).data,
      'base64',
    ),
  );
  await read(
    'const input=root.querySelector("#quick-search");input.value="@Capstone";input.dispatchEvent(new Event("input"));',
  );
  assert(
    await read('return root.querySelector(".search-results").textContent.includes("Capstone")'),
  );
  await read('root.querySelector("[role=option]").click()');
  await delay(100);
  assert(
    await read('return root.querySelectorAll("[role=option]").length===3'),
    '@ scope shows exactly its three saved links',
  );
  await read(
    'const input=root.querySelector("#quick-search");input.value="/switch";input.dispatchEvent(new Event("input"));',
  );
  assert(
    await read(
      'return root.querySelector("#quick-results").textContent.includes("Switch collection")',
    ),
  );
  await read('root.querySelector("[role=option]").click()');
  await delay(100);
  assert(
    await read(
      'const p=root.querySelector("#action-popover"); return p?.matches(":popover-open") && !!p.querySelector("input[type=search]") && !!p.querySelector("input[type=checkbox]") && !p.querySelector("select") && !root.querySelector("dialog[open]")',
    ),
    '/switch opens the shared searchable picker with optional saving and no destination form',
  );
  await read(
    'const p=root.querySelector("#action-popover"); const s=p.querySelector("input[type=search]"); s.value="Capstone"; s.dispatchEvent(new Event("input"));',
  );
  assert(
    await read('return root.querySelector(".switch-choices").textContent.includes("Capstone")'),
  );
  await read('root.querySelector("#action-popover").hidePopover();globalThis.__neoCloseOverlay();');
  assert.equal(await read('return !!root'), false);
  const groupTab = (await rpc('load')).tabs.find((t) => t.groupId >= 0 && !t.parked);
  if (groupTab) {
    await delay(1100);
    await rpc('activate', { tabId: groupTab.id });
    await triggerSwitcher(groupTab);
    const inspect = (code) =>
      app.evaluate(
        `chrome.scripting.executeScript({target:{tabId:${groupTab.id}},func:()=>{const root=globalThis.__neoSurface;${code}}}).then(r=>r[0].result)`,
      );
    for (let i = 0; i < 30; i++) {
      await delay(100);
      if (
        await inspect(
          'return !!root?.querySelector(".group-tile .preview-image > :is(img, canvas)")',
        )
      )
        break;
    }
    assert(
      await inspect('return !!root.querySelector(".group-tile .preview-image > :is(img, canvas)")'),
    );
    assert(
      await inspect(
        'const p=root.querySelector(".group-tile .preview-image");return p.clientHeight>150&&p.clientWidth>250;',
      ),
    );
    const groupPage = await connect(
      (await targets()).find((t) => t.url === groupTab.url).webSocketDebuggerUrl,
    );
    await groupPage.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(150);
    await fs.writeFile(
      path.join(out, 'switcher-group.png'),
      Buffer.from(
        (await groupPage.send('Page.captureScreenshot', { format: 'png' })).data,
        'base64',
      ),
    );
    const beforePreview = await rpc('preview', { url: groupTab.url });
    await triggerSwitcher(groupTab);
    for (let i = 0; i < 100 && (await inspect('return !!root')); i++) await delay(100);
    assert.equal(await inspect('return !!root'), false);
    assert.equal(
      (await rpc('preview', { url: groupTab.url })).at,
      beforePreview.at,
      'Toggling closed must not capture the overlay itself',
    );
    results.push(
      'Group tiles show a full-size real page preview; shortcut toggles off without polluting the preview cache',
    );
  }
  results.push(
    'Alt+Q action opens a floating overlay with a real capture, shared @ scope, commands, and Escape/close cleanup',
  );
  // Protected chrome-extension pages use the full-window fallback.
  const ownTab = await app.evaluate('chrome.tabs.getCurrent()');
  await rpc('activate', { tabId: ownTab.id });
  // Device emulation changes the viewport, not the headless display's native
  // work area. Keep the source window inside that display before testing popups.
  await app.evaluate(`chrome.windows.update(${ownTab.windowId},{state:'normal',left:0,top:0,width:800,height:600})`);
  await triggerSwitcher(ownTab);
  let fallback;
  for (let i = 0; i < 30; i++) {
    await delay(100);
    fallback = (await targets()).find((t) => t.url.includes('/quick.html?window='));
    if (fallback) break;
  }
  assert(fallback, 'Protected page fallback opens');
  const full = await connect(fallback.webSocketDebuggerUrl);
  for (let i = 0; i < 100 && !(await full.evaluate('!!document.querySelector(".task-view")')); i++)
    await delay(100);
  assert(await full.evaluate('document.querySelector(".task-view").offsetHeight<innerHeight'));
  const info = await full.evaluate('chrome.windows.getCurrent()');
  assert.equal(info.state, 'normal');
  assert(info.width <= 1180 && info.height <= 760, JSON.stringify(info));
  await app.evaluate(`chrome.windows.remove(${info.id})`);
  results.push('Protected pages use a bounded switcher window tied to the original browser window');
}

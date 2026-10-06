
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { scenarios } from './scenarios.mjs';

const name = process.argv[2], scenario = scenarios[name];
if (!scenario) throw Error('Run browser checks through npm run test:browser.');
const root = fileURLToPath(new URL('../../', import.meta.url));
const edge = process.argv.includes('--edge');
const option = key => process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3);
const executable = option('executable') || (edge
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe');
await fs.access(executable);
let extensionPath = path.resolve(option('extension') || path.join(root, 'extension'));
const outputRoot = path.join(root, 'output/browser');
await fs.mkdir(outputRoot, { recursive: true });
const out = await fs.mkdtemp(path.join(outputRoot, `${name}-`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hits = [], notionCalls = [], clients = [], results = [];
let proc, stderr = '', browserClient, app, failure;
const server = http.createServer(async (req, res) => {
  try {
    hits.push(req.url);
    if (scenario.site && req.url.startsWith('/leotabs/')) {
      const siteRoot=path.resolve(root,'output/site');
      let target=path.resolve(siteRoot,decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice('/leotabs/'.length)));
      if(target!==siteRoot && !target.startsWith(siteRoot+path.sep))throw Error('Invalid fixture path');
      if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');
      const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'}[path.extname(target)]||'text/plain';
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
      return res.end(await fs.readFile(target));
    }
    if (req.url === '/identity-icon.png') {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public,max-age=3600' });
      return res.end(await fs.readFile(path.join(root, 'tests/fixtures/site-icon.png')));
    }
    if (req.url.startsWith('/v1/')) {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      notionCalls.push({ path: req.url, body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(req.url === '/v1/pages'
        ? { id: notionCalls.length.toString(16).padStart(32, '0'), url: 'https://app.notion.com/p/' + notionCalls.length.toString(16).padStart(32, '0') }
        : { results: body.children }));
    }
    res.writeHead(200, {
      'Content-Type': 'text/html', 'Cache-Control': 'no-store',
      ...(req.url === '/media-strict' ? { 'Content-Security-Policy': "img-src 'none'" } : {}),
    });
    const title = scenario.pathTitles ? req.url.slice(1).replace(/[^a-z]/gi, '')
      : req.url.includes('research') ? 'Research paper' : 'Project brief';
    res.end(`<!doctype html><link rel="icon" href="/identity-icon.png"><title>${title}</title><style>body{font:24px system-ui;padding:50px;background:#f3f5ef}h1{color:#426b61}</style><h1>Browser test fixture</h1><p>Local integration-test page.</p>`);
  } catch {
    res.writeHead(500);
    res.end('Invalid fixture request');
  }
});

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map(), events = [], dragEvents = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data), request = pending.get(message.id);
    if (request) {
      clearTimeout(request.timer);
      pending.delete(message.id);
      message.error ? request.reject(Error(JSON.stringify(message.error))) : request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') events.push(message.params);
    else if (message.method === 'Input.dragIntercepted') dragEvents.push(message.params);
  };
  ws.onclose = () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(Error('Browser connection closed'));
    }
    pending.clear();
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) return reject(Error('Browser connection is not open'));
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(Error(`Timed out: ${method}`)); }, 45000);
    pending.set(next, { resolve, reject, timer });
    ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const client = { ws, send, evaluate, events, dragEvents };
  clients.push(client);
  return client;
}

// Chrome may choose a debugging port that Fetch reserves for other protocols
// (for example 2049). This is a local CDP HTTP endpoint, so use Node's HTTP client.
function debugJSON(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) throw Error(`Debugging endpoint returned ${response.statusCode}`);
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (error) { reject(error); }
      });
    });
    request.setTimeout(5000, () => request.destroy(Error('Debugging endpoint timed out')));
    request.on('error', reject);
  });
}

try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  if (scenario.permissions?.length || scenario.localServices || scenario.site) {
    const fixture = path.join(out, 'extension');
    await fs.cp(extensionPath, fixture, { recursive: true });
    extensionPath = fixture;
    const manifest = JSON.parse(await fs.readFile(path.join(fixture, 'manifest.json'), 'utf8'));
    for (const permission of scenario.permissions || []) {
      manifest.permissions.push(permission);
      manifest.optional_permissions = manifest.optional_permissions.filter(value => value !== permission);
    }
    if (scenario.localServices) manifest.host_permissions = ['http://127.0.0.1/*'];
    await fs.writeFile(path.join(fixture, 'manifest.json'), JSON.stringify(manifest, null, 2));
    if (scenario.site) {
      // Exercise the real uninstall event against local generated pages only.
      const file=path.join(fixture,'lib/lifecycle.js');
      const source=await fs.readFile(file,'utf8');
      assert.equal(source.split('https://ringlochid.me/leotabs/uninstalled/').length-1,1);
      await fs.writeFile(file,source.replace('https://ringlochid.me/leotabs/uninstalled/',origin+'/leotabs/uninstalled/'));
    }
    if (name === 'notion-library') {
      // Redirect only this disposable fixture; no test writes to a real account.
      const file = path.join(fixture, 'lib/notion.js');
      const source = await fs.readFile(file, 'utf8');
      assert.equal(source.split('https://api.notion.com').length - 1, 2);
      await fs.writeFile(file, source.replaceAll('https://api.notion.com', origin));
      manifest.host_permissions.push('https://api.notion.com/*');
      await fs.writeFile(path.join(fixture, 'manifest.json'), JSON.stringify(manifest, null, 2));
    }
  }
  const profile = path.join(out, 'profile');
  let launchError;
  proc = spawn(executable, [
    '--enable-unsafe-extension-debugging', '--headless=new', '--no-first-run',
    '--disable-gpu', '--disable-background-networking', '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    // Keep Edge's compatibility launcher from exiting and orphaning a second
    // browser process before the runner can attach or clean up this profile.
    ...(edge ? ['--edge-skip-compat-layer-relaunch', `--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] : []),
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  proc.on('error', error => { launchError = error; });
  proc.stderr.on('data', data => { stderr += data; });
  let port;
  for (let i = 0; i < 100; i++) {
    if (launchError) throw launchError;
    try { port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch {}
    if (proc.exitCode !== null) throw Error('Browser exited before starting');
    await delay(100);
  }
  if (!port) throw Error('Browser did not start');
  const targets = () => debugJSON(`http://127.0.0.1:${port}/json/list`);
  let version;
  // The port file can appear before the HTTP debugging endpoint is listening.
  for (let i = 0; i < 100; i++) {
    try { version = await debugJSON(`http://127.0.0.1:${port}/json/version`); break; } catch {}
    await delay(100);
  }
  if (!version) throw Error('Browser debugging endpoint did not start');
  browserClient = await connect(version.webSocketDebuggerUrl);
  let loadedId;
  if (!edge) loadedId = (await browserClient.send('Extensions.loadUnpacked', { path: extensionPath, enableInIncognito: false })).id;
  let available, worker;
  for (let i = 0; i < 100; i++) {
    available = await targets();
    worker = available.find(target => target.type === 'service_worker' && target.url.endsWith('/background.js'));
    if (worker || loadedId) break;
    await delay(100);
  }
  if (!loadedId && !worker) throw Error('Extension worker did not load');
  loadedId ||= new URL(worker.url).host;
  const extensionOrigin = `chrome-extension://${loadedId}`;
  app = await connect(available.find(target => target.type === 'page' && !target.url.startsWith(extensionOrigin)).webSocketDebuggerUrl);
  await app.send('Runtime.enable');
  await app.send('Page.navigate', { url: `${extensionOrigin}/app.html` });
  for (let i = 0; i < 100 && !await app.evaluate('!!document.querySelector("#spaces .active")'); i++) await delay(100);
  assert.equal(await app.evaluate('document.querySelector("#spaces .active")?.textContent'), 'My space');
  const rpc = (action, data = {}) => app.evaluate(`chrome.runtime.sendMessage(${JSON.stringify({ action, data })}).then(r=>{if(!r.ok)throw Error(r.error);return r.value})`);
  const own = await app.evaluate('chrome.tabs.getCurrent()');
  if(name!=='onboarding') {
    // Other scenarios start at the library, independently of the first-run guide.
    await app.evaluate(`chrome.tabs.query({url:${JSON.stringify(extensionOrigin+'/app.html*')}}).then(tabs=>Promise.all(tabs.filter(tab=>tab.url.endsWith('#onboarding')).map(tab=>chrome.tabs.remove(tab.id))))`);
  }
  const triggerSwitcher = async (tab, mode = 'switcher') => {
    // tabs.create may return a pending URL; use the settled tab to find its CDP target.
    tab = await app.evaluate(`chrome.tabs.get(${tab.id})`);
    await rpc('activate', { tabId: tab.id });
    if (edge) {
      // Edge cannot grant activeTab through Extensions.triggerAction. The fixture
      // requests only the local origin used by this suite, never general access.
      assert(scenario.localServices, 'Overlay tests on Edge require the local fixture');
    } else {
      const { targetInfos } = await browserClient.send('Target.getTargets', { filter: [{ type: 'tab' }, { exclude: true }] });
      const target = targetInfos.find(item => item.url === tab.url);
      if (target) {
        await browserClient.send('Extensions.triggerAction', { id: loadedId, targetId: target.targetId });
        // triggerAction dispatches the toolbar event but does not await its async
        // handler. Let the Library visit finish before returning to the test page.
        for (let i = 0; i < 100; i++) {
          if (await app.evaluate(`chrome.tabs.query({active:true,lastFocusedWindow:true}).then(t=>t[0]?.url===${JSON.stringify(extensionOrigin + '/app.html')})`)) break;
          await delay(50);
        }
      }
    }
    await rpc('activate', { tabId: tab.id });
    await delay(1200);
    return app.evaluate(`import(chrome.runtime.getURL('lib/overlay.js')).then(m=>m.openSwitcher(${JSON.stringify(tab)},${JSON.stringify({ mode })}))`);
  };
  const context = { app, rpc, results, delay, origin, out, hits, notionCalls, connect, targets,
    extensionOrigin, windowId: own.windowId, extensionClient: browserClient, loadedId, triggerSwitcher, edge };
  results.push('Extension page and service worker load in a fresh profile');
  await (await import(`./${scenario.file}.mjs`))[scenario.run](context);
  assert.equal(app.events.length, 0, JSON.stringify(app.events));
  console.log(`PASS ${name} (${results.length} checks)`);
} catch (error) {
  failure = error;
  console.error(`FAIL ${name}: ${error.stack}`);
  if (app) {
    await fs.writeFile(path.join(out, 'failure-page.txt'), await app.evaluate('document.body.innerText').catch(() => '')).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ name, results, error: failure?.stack, exceptions: clients.flatMap(client => client.events), hits }, null, 2));
  await fs.writeFile(path.join(out, 'browser-stderr.log'), stderr);
  if (browserClient) await browserClient.send('Browser.close').catch(() => {});
  for (const client of clients) client.ws.close();
  if (proc) {
    for (let i = 0; i < 30 && proc.exitCode === null; i++) await delay(100);
    if (proc.exitCode === null) proc.kill();
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  console.log(`Results: ${out}`);
}

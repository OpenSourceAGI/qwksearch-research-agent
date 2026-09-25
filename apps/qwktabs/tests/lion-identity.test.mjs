import test from 'node:test';
import assert from 'node:assert/strict';
import { drawIdentity, updatePageIdentity, identitySvg, identityColor, identityOutline, DEFAULT_IDENTITY_COLOR } from '../extension/lib/identity.js';
import { readFile } from 'node:fs/promises';
import { IDENTITY_PATHS, IDENTITY_VIEWBOX } from '../extension/lib/identity-art.js';

test('the default lion is amber with a contrasting contour on a transparent canvas, without a tile or letter', t => {
  const previous = globalThis.Path2D;
  globalThis.Path2D = class { constructor(path) { this.path = path; } };
  t.after(() => { globalThis.Path2D = previous; });
  const fills = [], strokes = [], backgrounds = [], letters = [], cleared = [];
  const context = {
    clearRect: (...args) => cleared.push(args), save() {}, restore() {}, scale() {}, translate() {},
    beginPath() {}, roundRect: (...args) => backgrounds.push(args),
    fill(path, rule) { fills.push({ color: this.fillStyle, path, rule }); },
    stroke(path) { strokes.push({color:this.strokeStyle,path,width:this.lineWidth}); },
    fillText: (...args) => letters.push(args),
  };
  drawIdentity(context, 16);
  assert.deepEqual(cleared, [[0, 0, 16, 16]]);
  assert.equal(backgrounds.length, 0, 'the toolbar icon must have no background tile');
  assert.equal(letters.length, 0, 'the old n must be replaced with the selected lion');
  assert.equal(fills.length, 2);
  assert(fills.every(fill => fill.color === '#d18b2c' && fill.rule === 'evenodd' && fill.path.path));
  assert.equal(strokes.length,2);
  assert(strokes.every(stroke => stroke.color === '#26313d' && stroke.width === 5));
  fills.length = 0;
  drawIdentity(context, 32, '#eadb99');
  assert(fills.every(fill => fill.color === '#eadb99'), 'recolour the lion itself, including pale colours');
});

test('favicon follows active collection colour, survives a stale href, and returns to amber on close', () => {
  let link;
  const document = {
    querySelector: () => link,
    createElement: () => ({attributes:{}, getAttribute(name){return this.attributes[name];}, setAttribute(name,value){this.attributes[name]=value;}}),
    head: {append(node){link=node;}},
  };
  const svg = () => decodeURIComponent(link.getAttribute('href').split(',')[1]);
  updatePageIdentity(document);
  assert(svg().includes('color:'+DEFAULT_IDENTITY_COLOR));
  assert.equal(document.title,'LeoTabs · Library');
  for(const color of ['#a4d9bc','#eadb99','#123456']) {
    updatePageIdentity(document,{name:'Research',color});
    assert(svg().includes('color:'+color));
    assert.equal(document.title,'LeoTabs · Research');
  }
  link.setAttribute('href','icons/128.png');
  updatePageIdentity(document,{name:'Research',color:'#123456'});
  assert(svg().includes('color:#123456'),'restore a browser-reset href even when the collection has not changed');
  updatePageIdentity(document,null);
  assert(svg().includes('color:'+DEFAULT_IDENTITY_COLOR));
  assert(!svg().includes('<rect'));
  assert.equal(link.type,'image/svg+xml');
  assert.equal(link.attributes.sizes,'any');
});

test('contrasting outline supports light and dark collections without changing their fill colour', () => {
  for(const color of ['#ffffff','#eadb99','mint']) assert.equal(identityOutline(color),'#26313d');
  for(const color of ['#000000','#173b70']) assert.equal(identityOutline(color),'#f7f9fc');
  for(const color of ['#ffffff','#000000','#173b70','#eadb99']) {
    assert.equal(identityColor(color),color);
    assert(identitySvg(color).includes('stroke="'+identityOutline(color)+'"'));
  }
});

test('page favicon, runtime paths and manifest fallback share the canonical Soft lion', async () => {
  const canonical=await readFile(new URL('../extension/icons/lion.svg',import.meta.url),'utf8');
  assert(canonical.includes('color:'+DEFAULT_IDENTITY_COLOR));
  assert(canonical.includes(`viewBox="${IDENTITY_VIEWBOX.join(' ')}"`));
  for(const path of IDENTITY_PATHS) assert(canonical.includes(path));
  const html=await readFile(new URL('../extension/app.html',import.meta.url),'utf8');
  assert.match(html,/<link rel="icon"[^>]*href="icons\/lion.svg"/);
  assert(identitySvg('invalid').includes('color:'+DEFAULT_IDENTITY_COLOR));
  const manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.name,'LeoTabs — Tab Manager & Switcher');
  assert.equal(manifest.action.default_icon[16],manifest.icons[16]);
  assert.equal(manifest.action.default_icon[32],manifest.icons[32]);
});

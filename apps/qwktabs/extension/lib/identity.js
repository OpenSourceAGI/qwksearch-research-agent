
import {colorHex, colorInk, validColor} from './colors.js';
import {DEFAULT_IDENTITY_COLOR, IDENTITY_VIEWBOX, IDENTITY_PATHS, IDENTITY_STROKE_WIDTH} from './identity-art.js';
export {DEFAULT_IDENTITY_COLOR} from './identity-art.js';
export const identityColor = color => validColor(color) ? colorHex(color) : DEFAULT_IDENTITY_COLOR;
// Preserve the collection's exact fill; only the fine contour adapts for contrast.
export const identityOutline = color => colorInk(identityColor(color)) === '#ffffff' ? '#f7f9fc' : '#26313d';
let lionPaths;
export function drawIdentity(context, size, color) {
  context.clearRect(0,0,size,size);
  lionPaths ||= IDENTITY_PATHS.map(path => new Path2D(path));
  const [x,y,width,height] = IDENTITY_VIEWBOX;
  context.save();
  context.scale(size/width,size/height);
  context.translate(-x,-y);
  context.fillStyle=identityColor(color);
  context.strokeStyle=identityOutline(color);
  context.lineWidth=IDENTITY_STROKE_WIDTH;
  context.lineJoin='round';context.lineCap='round';
  for(const path of lionPaths) {context.stroke(path);context.fill(path,'evenodd');}
  context.restore();
}
export function identitySvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${IDENTITY_VIEWBOX.join(' ')}" style="color:${identityColor(color)}"><g fill="currentColor" stroke="${identityOutline(color)}" stroke-width="${IDENTITY_STROKE_WIDTH}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill">${IDENTITY_PATHS.map(path=>`<path fill-rule="evenodd" d="${path}"/>`).join('')}</g></svg>`;
}
export function updatePageIdentity(document, collection) {
  const color=identityColor(collection?.color);
  const href='data:image/svg+xml,'+encodeURIComponent(identitySvg(color));
  let favicon=document.querySelector('link[rel="icon"]');
  if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.append(favicon);}
  favicon.type='image/svg+xml';
  favicon.setAttribute('sizes','any');
  if(favicon.getAttribute('href')!==href) favicon.setAttribute('href',href);
  document.title=collection?'LeoTabs · '+collection.name:'LeoTabs · Library';
}
export async function updateIdentity(browser, library, active) {
  const present = new Set();
  for (const tab of await browser.tabs.query({})) {
    if(tab.incognito) continue;
    const c=library.collections.find(c=>c.id===active[tab.windowId]?.collectionId);
    const title=c ? `LeoTabs · ${c.name} · Open library` : 'Open LeoTabs library';
    present.add(tab.id);
    const signature=title+':'+c?.color;
    if(identityCache.get(tab.id)?.signature===signature && identityCache.get(tab.id).applied)continue;
    const entry={signature,applied:false};
    identityCache.set(tab.id,entry);
    const images={};
    if(c) for(const size of [16,20,24,32]) {
      const canvas=new OffscreenCanvas(size,size), context=canvas.getContext('2d');
      drawIdentity(context,size,c.color); images[size]=context.getImageData(0,0,size,size);
    }
    try {
      await browser.action.setIcon({tabId:tab.id,...(c?{imageData:images}:{path:{16:'icons/16.png',20:'icons/20.png',24:'icons/24.png',32:'icons/32.png'}})});
      await browser.action.setTitle({tabId:tab.id,title});
      // Navigation can invalidate this entry while the browser calls are pending.
      if(identityCache.get(tab.id)===entry) entry.applied=true;
    } catch {
      if(identityCache.get(tab.id)===entry) identityCache.delete(tab.id);
    }
  }
  for(const id of identityCache.keys())if(!present.has(id))identityCache.delete(id);
}
const identityCache=new Map();
export function invalidateIdentity(tabId) { identityCache.delete(tabId); }

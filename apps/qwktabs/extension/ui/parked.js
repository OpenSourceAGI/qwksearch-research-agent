
import { $, rpc } from './shared.js';
import { parkedTitle } from '../lib/parked.js';
function showError(message) {
  $('#loading').hidden = true;
  $('#description').textContent = message;
  $('#error').hidden = false;
}
async function start() {
  $('#library').onclick = () => rpc('open-library');
  const id = new URLSearchParams(location.search).get('id');
  const record = await rpc('parked-info', { id });
  if (!record) {
    showError(
      'The saved page could not be found. Open your library or Recovery to find its saved copy.',
    );
    return;
  }
  document.title = parkedTitle(record);
  // Read the browser's local favicon cache; never wake the destination website for its icon.
  const faviconURL = new URL(chrome.runtime.getURL('_favicon/'));
  faviconURL.searchParams.set('pageUrl', record.url);
  faviconURL.searchParams.set('size', '32');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  try {
    const response = await fetch(faviconURL);
    if (!response.ok) throw Error('Icon unavailable');
    const bitmap = await createImageBitmap(await response.blob());
    ctx.drawImage(bitmap, 0, 0, 32, 32);
    bitmap.close();
  } catch {
    ctx.fillStyle = '#606b85';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(parkedTitle(record).slice(0, 1).toUpperCase(), 16, 24);
  }
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/png';
  favicon.href = canvas.toDataURL('image/png');
  document.head.append(favicon);
  const tab = await chrome.tabs.getCurrent();
  const load = async () => {
    $('#error').hidden = true;
    $('#loading').hidden = false;
    try {
      await rpc('parked-load', { tabId: tab.id });
    } catch (e) {
      showError(e.message);
    }
  };
  $('#load').hidden = false;
  $('#load').onclick = load;
  if (tab.active) await load();
}
start().catch((e) => showError(e.message));

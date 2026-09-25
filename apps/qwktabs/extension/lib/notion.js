
import { uid, stamp, text } from './model.js';
import { notionBlocks } from './integrations.js';
import { serviceError } from './messages.js';

export const NOTION_VERSION = '2026-03-11';
const pageID = /^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i;
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

export function prepareNotion(collection, parent) {
  if (!pageID.test(parent)) throw new Error('Enter the destination Notion page ID (32 hex characters)');
  const blocks = notionBlocks(collection);
  return {
    id: uid(),
    at: stamp(),
    kind: 'notion',
    label: 'Notion export · ' + collection.name,
    status: 'ready',
    collectionId: collection.id,
    parent,
    name: collection.name,
    blocks,
    total: blocks.length,
    cursor: 0,
    attempts: 0,
  };
}
export function prepareNotionLibrary(collections, parent) {
  if (!collections.length) throw new Error('No collections to export');
  const pages = collections.map((collection) => prepareNotion(collection, parent));
  return {
    id: uid(), at: stamp(), kind: 'notion',
    label: `Notion export · ${pages.length} collections`,
    status: 'ready', parent, pages,
    total: pages.reduce((sum, page) => sum + page.total, 0),
    cursor: 0, pageTotal: pages.length, pageCursor: 0,
  };
}

// Persist the whole queue at every child checkpoint, including before a write.
// Completed pages are never sent again when continuing from Recovery.
async function notionLibraryStep(job, key, options) {
  const index = job.pages.findIndex((page) => page.status !== 'complete');
  const pages = [...job.pages];
  const savePage = async (page) => {
    pages[index] = page;
    const pageCursor = pages.filter((item) => item.status === 'complete').length;
    job = {
      ...job, pages, pageCursor,
      cursor: pages.reduce((sum, item) => sum + item.cursor, 0),
      status: pageCursor === pages.length ? 'complete' : page.status === 'complete' ? 'ready' : page.status,
      retryAt: page.retryAt, error: page.error,
    };
    await options.save(job);
  };
  let page = pages[index];
  if (job.status === 'ready' && ['partial', 'failed'].includes(page.status))
    page = { ...page, status: 'ready', attempts: 0 };
  await notionStep(page, key, { ...options, save: savePage });
  return job;
}
export function notionBatch(job) {
  const batch = [];
  let size = 2;
  for (const block of job.blocks.slice(job.cursor, job.cursor + 100)) {
    // Leave space for the page properties and JSON envelope, below Notion's 500 KB cap.
    const length = bytes(block) + (batch.length ? 1 : 0);
    if (size + length > 400000) break;
    batch.push(block);
    size += length;
  }
  if (!batch.length && job.cursor < job.total)
    throw new Error('A note or bookmark is too large for Notion');
  return batch;
}

// Exactly one durable batch per invocation. A fresh worker never replays a pending write.
export async function notionStep(job, key, { save, fetcher = fetch, now = Date.now } = {}) {
  if (!key) throw new Error('Add a Notion token in Settings');
  if (job.status === 'complete') return job;
  if (['sending', 'uncertain'].includes(job.status))
    throw new Error(
      'Export not confirmed. Check Notion before retrying.',
    );
  if (!['ready', 'waiting', 'partial', 'failed'].includes(job.status))
    throw new Error('Can\'t resume this export');
  if (job.retryAt > now()) return job;
  if (job.pages) return notionLibraryStep(job, key, { save, fetcher, now });
  const children = notionBatch(job),
    creating = !job.remoteId;
  const url = creating
    ? 'https://api.notion.com/v1/pages'
    : `https://api.notion.com/v1/blocks/${job.remoteId}/children`;
  const body = creating
    ? {
        parent: { page_id: job.parent },
        properties: { title: { title: [{ type: 'text', text: { content: job.name } }] } },
        children,
      }
    : { children };
  job = {
    ...job,
    status: 'sending',
    pending: { start: job.cursor, count: children.length, creating },
    error: undefined,
  };
  await save(job); // If this fails, no network write has happened.
  let response;
  try {
    response = await fetcher(url, {
      method: creating ? 'POST' : 'PATCH',
      headers: {
        Authorization: `Bearer ${key}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    job.status = 'uncertain';
    job.error = 'Export not confirmed. Check Notion before retrying.';
    await save(job);
    return job;
  }
  if ([429, 529].includes(response.status)) {
    const attempts = job.attempts + 1,
      header = response.headers.get('Retry-After');
    const seconds =
      header !== null && Number.isFinite(Number(header))
        ? Math.max(0, Number(header))
        : 2 ** attempts;
    job = {
      ...job,
      status: attempts >= 3 ? (job.remoteId ? 'partial' : 'failed') : 'waiting',
      attempts,
      retryAt: now() + seconds * 1000 + 250,
      pending: null,
      error: attempts >= 3 ? 'Notion is busy. Resume the export later.' : undefined,
    };
    await save(job);
    return job;
  }
  if (!response.ok) {
    const uncertain = response.status >= 500 || response.status === 408;
    job = {
      ...job,
      status: uncertain ? 'uncertain' : job.remoteId ? 'partial' : 'failed',
      pending: uncertain ? job.pending : null,
      error: uncertain ? 'Export not confirmed. Check Notion before retrying.' : serviceError('Notion', response.status),
    };
    await save(job);
    return job;
  }
  try {
    const raw = await response.text();
    if (raw.length > 2 * 1024 * 1024) throw new Error('Oversized response');
    const result = JSON.parse(raw);
    if (creating) {
      if (!pageID.test(result.id)) throw new Error('Missing page ID');
      job.remoteId = result.id;
      try {
        const link = new URL(result.url);
        if (link.protocol === 'https:') job.remoteURL = link.href;
      } catch {}
    } else if (!Array.isArray(result.results) || result.results.length !== children.length)
      throw new Error('Incomplete block response');
    job.cursor += children.length;
    job.pending = null;
    job.attempts = 0;
    job.retryAt = now() + 350;
    job.status = job.cursor >= job.total ? 'complete' : 'ready';
  } catch {
    job.status = 'uncertain';
    job.error =
      'Export not confirmed. Check Notion before retrying.';
  }
  await save(job);
  return job;
}

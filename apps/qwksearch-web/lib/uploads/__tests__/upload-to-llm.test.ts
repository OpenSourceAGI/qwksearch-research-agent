/**
 * @fileoverview Guards the "uploaded file reaches the LLM" behaviour and the
 * composer/home-page UI affordances that go with it:
 *
 *  1. `rerankDocs` (chat-agent-toolkit) must fold uploaded file content into
 *     the answer context for every query — including the "summarize"
 *     shortcut that previously dropped attachments.
 *  2. `canSubmitMessage` must enable the composer's submit control when a file
 *     is attached even with no typed text.
 *  3. `formatRelativeTime` must render home-page history times without a
 *     trailing "ago".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registerUploadFileLoader,
  rerankDocs,
  processDocs,
} from 'chat-agent-toolkit';
// Pure UI helpers imported directly from the research-agent-ui source.
import { canSubmitMessage } from '../../../../../packages/research-agent-ui/src/lib/composer';
import { formatRelativeTime } from '../../../../../packages/research-agent-ui/src/lib/relative-time';

afterEach(() => {
  // Reset the module-level loader so tests don't leak into one another.
  registerUploadFileLoader(async () => null);
});

describe('rerankDocs: uploaded files reach the LLM context', () => {
  it('includes extracted file content for a normal query', async () => {
    registerUploadFileLoader(async (fileId: string) => ({
      title: 'Report',
      content: `EXTRACTED_${fileId}`,
    }));

    const result = await rerankDocs('analyze', [], ['f1'], 'balanced');

    expect(result[0].pageContent).toBe('EXTRACTED_f1');
    expect(result[0].metadata.url).toBe('File');
    expect(processDocs(result)).toContain('EXTRACTED_f1');
  });

  it('keeps uploaded file content for a "summarize" query (regression)', async () => {
    registerUploadFileLoader(async () => ({
      title: 'Notes',
      content: 'FILE_BODY',
    }));

    const webDocs = [
      { pageContent: 'WEB_BODY', metadata: { title: 'Web', url: 'https://x.test' } },
    ];

    const result = await rerankDocs('summarize', webDocs, ['f1'], 'balanced');

    // File content is present and ordered ahead of web results.
    expect(result[0].pageContent).toBe('FILE_BODY');
    expect(processDocs(result)).toContain('FILE_BODY');
  });

  it('resolves uploads for a "summarize" query with no web docs', async () => {
    registerUploadFileLoader(async () => ({ title: 'Doc', content: 'ONLY_FILE' }));

    const result = await rerankDocs('Summarize', [], ['only'], 'balanced');

    expect(result).toHaveLength(1);
    expect(result[0].pageContent).toBe('ONLY_FILE');
  });
});

describe('canSubmitMessage: file-only sends are valid', () => {
  it('is false with no text and no files', () => {
    expect(canSubmitMessage('', [])).toBe(false);
    expect(canSubmitMessage('   ', [])).toBe(false);
    expect(canSubmitMessage('', undefined)).toBe(false);
  });

  it('is true with text only', () => {
    expect(canSubmitMessage('hello', [])).toBe(true);
  });

  it('is true with an attached file and no text', () => {
    expect(canSubmitMessage('', ['file-1'])).toBe(true);
    expect(canSubmitMessage('   ', ['file-1'])).toBe(true);
  });
});

describe('formatRelativeTime: no trailing "ago"', () => {
  const NOW = Date.now();

  afterEach(() => vi.useRealTimers());

  it('omits "ago" for every bucket', () => {
    expect(formatRelativeTime(NOW - 30 * 1000)).toBe('30 sec');
    expect(formatRelativeTime(NOW - 3 * 60 * 1000)).toBe('3 min');
    expect(formatRelativeTime(NOW - 2 * 60 * 60 * 1000)).toBe('2 hr');
    expect(formatRelativeTime(NOW - 3 * 24 * 60 * 60 * 1000)).toBe('3 days');
    expect(formatRelativeTime(NOW - 1 * 24 * 60 * 60 * 1000)).toBe('1 day');
  });

  it('keeps "just now" and handles invalid input', () => {
    expect(formatRelativeTime(NOW)).toBe('just now');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
});

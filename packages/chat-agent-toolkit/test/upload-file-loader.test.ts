/**
 * @fileoverview Tests for uploaded-file resolution in the search pipeline.
 *
 * Verifies that when a chat request carries uploaded `fileIds`, the registered
 * upload loader is used to resolve them and the extracted file content is
 * folded into the answer context (i.e. it is transferred over to the LLM).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  registerUploadFileLoader,
  rerankDocs,
  processDocs,
} from '../src/tools/search/doc-utils';
import type { Document } from '../src/tools/search/document';

describe('rerankDocs with an uploaded file loader', () => {
  it('resolves fileIds via the registered loader and includes their content', async () => {
    const loader = vi.fn(async (fileId: string) => ({
      title: `Title ${fileId}`,
      content: `Extracted content for ${fileId}`,
    }));
    registerUploadFileLoader(loader);

    const result = await rerankDocs('analyze', [], ['file-abc'], 'balanced');

    expect(loader).toHaveBeenCalledWith('file-abc');
    expect(result).toHaveLength(1);
    expect(result[0].pageContent).toBe('Extracted content for file-abc');
    expect(result[0].metadata.title).toBe('Title file-abc');
    expect(result[0].metadata.url).toBe('File');
  });

  it('places uploaded file docs ahead of web results in the context', async () => {
    registerUploadFileLoader(async (fileId) => ({
      title: 'Uploaded',
      content: 'FILE_BODY',
    }));

    const webDocs: Document[] = [
      { pageContent: 'WEB_BODY', metadata: { title: 'Web', url: 'https://x.test' } },
    ];

    const result = await rerankDocs('analyze', webDocs, ['file-1'], 'speed');

    expect(result[0].pageContent).toBe('FILE_BODY');
    expect(result[1].pageContent).toBe('WEB_BODY');

    // The formatted context handed to the LLM contains the file content.
    const context = processDocs(result);
    expect(context).toContain('FILE_BODY');
  });

  it('skips files whose loader returns null', async () => {
    registerUploadFileLoader(async () => null);
    const result = await rerankDocs('analyze', [], ['missing'], 'balanced');
    expect(result).toHaveLength(0);
  });

  it('tolerates a loader that throws and yields no file docs', async () => {
    registerUploadFileLoader(async () => {
      throw new Error('loader boom');
    });
    const result = await rerankDocs('analyze', [], ['bad'], 'balanced');
    expect(result).toHaveLength(0);
  });

  it('returns docs unchanged when there are no docs and no fileIds', async () => {
    const result = await rerankDocs('analyze', [], [], 'balanced');
    expect(result).toEqual([]);
  });
});

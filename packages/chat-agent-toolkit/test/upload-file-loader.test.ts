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
  loadUploads,
  loadUploadImages,
  selectUploadImages,
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

  it('keeps uploaded file content for a "summarize" query', async () => {
    // Regression: a "summarize" query (typed by the user, or emitted by the
    // query rephraser for link-only requests) used to early-return only the
    // web docs, dropping uploaded attachments before they reached the LLM.
    registerUploadFileLoader(async (fileId) => ({
      title: `Title ${fileId}`,
      content: `FILE_${fileId}`,
    }));

    const webDocs: Document[] = [
      { pageContent: 'WEB_BODY', metadata: { title: 'Web', url: 'https://x.test' } },
    ];

    const result = await rerankDocs('summarize', webDocs, ['abc'], 'balanced');

    // File content comes first and is present in the LLM context.
    expect(result[0].pageContent).toBe('FILE_abc');
    const context = processDocs(result);
    expect(context).toContain('FILE_abc');
  });

  it('resolves uploaded files for a "summarize" query even with no web docs', async () => {
    registerUploadFileLoader(async (fileId) => ({
      title: 'Uploaded',
      content: `FILE_${fileId}`,
    }));

    const result = await rerankDocs('Summarize', [], ['only-file'], 'balanced');

    expect(result).toHaveLength(1);
    expect(result[0].pageContent).toBe('FILE_only-file');
    expect(result[0].metadata.url).toBe('File');
  });
});

describe('loadUploads', () => {
  it('resolves each attachment once, even when an id repeats', async () => {
    const loader = vi.fn(async (fileId: string) => ({
      title: `Title ${fileId}`,
      content: `Content for ${fileId}`,
    }));
    registerUploadFileLoader(loader);

    const uploads = await loadUploads(['a', 'b', 'a']);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(uploads.map((u) => u.title)).toEqual(['Title a', 'Title b']);
  });

  it('resolves attachments one at a time, not all at once', async () => {
    let inFlight = 0;
    let peak = 0;
    registerUploadFileLoader(async (fileId: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return { title: fileId, content: `Content for ${fileId}` };
    });

    await loadUploads(['a', 'b', 'c', 'd']);

    // Sequential resolution is what keeps one large payload live at a time
    // rather than every attachment's at once.
    expect(peak).toBe(1);
  });

  it('serves the reranker and the image loader from one set of fetches', async () => {
    const loader = vi.fn(async (fileId: string) => ({
      title: `Title ${fileId}`,
      content: '',
      mediaType: 'image/png',
      image: `data:image/png;base64,${fileId}`,
    }));
    registerUploadFileLoader(loader);

    const uploads = await loadUploads(['pic']);
    const docs = await rerankDocs('describe', [], ['pic'], 'balanced', undefined, uploads);
    const images = await loadUploadImages(['pic'], undefined, uploads);

    // One fetch total: the old pipeline resolved every attachment twice, once
    // for the answer context and again for the image parts.
    expect(loader).toHaveBeenCalledTimes(1);
    // An image upload carries no text, so it contributes no context doc.
    expect(docs).toHaveLength(0);
    expect(images).toEqual([
      { mediaType: 'image/png', image: 'data:image/png;base64,pic' },
    ]);
  });

  it('selectUploadImages keeps images and drops documents', () => {
    expect(
      selectUploadImages([
        { title: 'doc', content: 'text' },
        { title: 'pic', content: '', image: 'data:image/webp;base64,zz' },
      ]),
    ).toEqual([{ mediaType: 'image/png', image: 'data:image/webp;base64,zz' }]);
  });
});

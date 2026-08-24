/**
 * @fileoverview Unit tests for the search-result-to-Document field mapping
 * shared by category switching and "load more" pagination.
 */
import { describe, expect, it } from 'vitest';
import { mapSearchResultToDocument } from '../src/lib/searchResultToDocument';

describe('mapSearchResultToDocument', () => {
  it('maps a full web result, preferring snippet over content', () => {
    const doc = mapSearchResultToDocument({
      title: 'Example title',
      source: 'example.com',
      thumbnail: 'https://example.com/thumb.jpg',
      url: 'https://example.com/page',
      snippet: 'a snippet',
      content: 'full content',
    });

    expect(doc).toEqual({
      pageContent: 'a snippet',
      metadata: {
        title: 'Example title',
        source: 'example.com',
        thumbnail: 'https://example.com/thumb.jpg',
        url: 'https://example.com/page',
      },
    });
  });

  it('falls back to content when snippet is missing', () => {
    const doc = mapSearchResultToDocument({ content: 'full content' });

    expect(doc.pageContent).toBe('full content');
  });

  it('includes img_src when present, for image-category results', () => {
    const doc = mapSearchResultToDocument({
      title: 'A photo',
      url: 'https://example.com/photo',
      img_src: 'https://example.com/photo.jpg',
    });

    expect(doc.metadata.img_src).toBe('https://example.com/photo.jpg');
  });

  it('omits img_src entirely when not present, rather than setting it empty', () => {
    const doc = mapSearchResultToDocument({ title: 'No image', url: 'https://example.com' });

    expect(doc.metadata).not.toHaveProperty('img_src');
  });

  it('includes iframe_src when present, for video-category results', () => {
    const doc = mapSearchResultToDocument({
      title: 'A video',
      url: 'https://example.com/watch?v=abc',
      iframe_src: 'https://inv.example.com/embed/abc',
    });

    expect(doc.metadata.iframe_src).toBe('https://inv.example.com/embed/abc');
  });

  it('defaults missing title/source/thumbnail/url to empty strings', () => {
    const doc = mapSearchResultToDocument({});

    expect(doc.metadata).toEqual({
      title: '',
      source: '',
      thumbnail: '',
      url: '',
    });
  });
});

/**
 * @fileoverview Unit tests for the `getPageTips`/`htmlToPlainText` client helpers.
 */
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import grab from 'grab-url';
import { getPageTips, htmlToPlainText } from '../page-tips';

vi.mock('grab-url');
const mockGrab = grab as MockedFunction<typeof grab>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPageTips', () => {
  it('posts the title and content and returns the tips array', async () => {
    mockGrab.mockResolvedValue({ tips: ['Tip one', 'Tip two'] });

    const result = await getPageTips('My Doc', 'Some plain text content');

    expect(mockGrab).toHaveBeenCalledTimes(1);
    const [path, opts] = mockGrab.mock.calls[0];
    expect(path).toBe('agent/page-tips');
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body).toEqual({ title: 'My Doc', content: 'Some plain text content' });
    expect(result).toEqual(['Tip one', 'Tip two']);
  });

  it('returns an empty array when the response tips field is not an array', async () => {
    mockGrab.mockResolvedValue({ tips: 'not an array' } as any);

    const result = await getPageTips('My Doc', 'content');

    expect(result).toEqual([]);
  });

  it('returns an empty array when the fetch rejects', async () => {
    mockGrab.mockRejectedValue(new Error('network error'));

    const result = await getPageTips('My Doc', 'content');

    expect(result).toEqual([]);
  });
});

describe('htmlToPlainText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(htmlToPlainText('<h1>Title</h1><p>Some   text.</p>')).toBe('Title Some text.');
  });

  it('removes script and style element content entirely', () => {
    const html = '<p>Keep me</p><script>alert("x")</script><style>.a{color:red}</style><p>And me</p>';
    expect(htmlToPlainText(html)).toBe('Keep me And me');
  });

  it('decodes &nbsp; entities to spaces', () => {
    expect(htmlToPlainText('<p>a&nbsp;&nbsp;b</p>')).toBe('a b');
  });

  it('returns an empty string for empty input', () => {
    expect(htmlToPlainText('')).toBe('');
  });
});

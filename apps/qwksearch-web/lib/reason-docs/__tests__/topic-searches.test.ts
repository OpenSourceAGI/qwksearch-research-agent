/**
 * @fileoverview Unit tests for the `getTopicSearches` client helper.
 */
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import grab from 'grab-url';
import { getTopicSearches } from '../topic-searches';

vi.mock('grab-url');
const mockGrab = grab as MockedFunction<typeof grab>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTopicSearches', () => {
  it('posts the title and content and returns the topics array', async () => {
    mockGrab.mockResolvedValue({ topics: ['topic one', 'topic two'] });

    const result = await getTopicSearches('My Doc', 'Some plain text content');

    expect(mockGrab).toHaveBeenCalledTimes(1);
    const [path, opts] = mockGrab.mock.calls[0];
    expect(path).toBe('agent/topic-searches');
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body).toEqual({ title: 'My Doc', content: 'Some plain text content' });
    expect(result).toEqual(['topic one', 'topic two']);
  });

  it('returns an empty array when the response topics field is not an array', async () => {
    mockGrab.mockResolvedValue({ topics: 'not an array' } as any);

    const result = await getTopicSearches('My Doc', 'content');

    expect(result).toEqual([]);
  });

  it('returns an empty array when the fetch rejects', async () => {
    mockGrab.mockRejectedValue(new Error('network error'));

    const result = await getTopicSearches('My Doc', 'content');

    expect(result).toEqual([]);
  });
});

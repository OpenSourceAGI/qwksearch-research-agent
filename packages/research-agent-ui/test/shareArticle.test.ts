/**
 * @fileoverview Unit tests for the share-an-article decision logic.
 */
import { describe, expect, it, vi } from 'vitest';
import { shareArticle } from '../src/lib/shareArticle';

const article = { title: 'Some Article', text: 'A citation', url: 'https://example.com/a' };

describe('shareArticle', () => {
    it('calls the native share API and returns "shared" when it succeeds', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        const writeText = vi.fn().mockResolvedValue(undefined);

        const result = await shareArticle(article, { share, writeText });

        expect(result).toBe('shared');
        expect(share).toHaveBeenCalledWith(article);
        expect(writeText).not.toHaveBeenCalled();
    });

    it('falls back to copying the URL when native share is unsupported', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        const result = await shareArticle(article, { writeText });

        expect(result).toBe('copied');
        expect(writeText).toHaveBeenCalledWith(article.url);
    });

    it('returns "cancelled" without copying when the user dismisses the share sheet', async () => {
        const abortError = Object.assign(new Error('cancelled'), { name: 'AbortError' });
        const share = vi.fn().mockRejectedValue(abortError);
        const writeText = vi.fn().mockResolvedValue(undefined);

        const result = await shareArticle(article, { share, writeText });

        expect(result).toBe('cancelled');
        expect(writeText).not.toHaveBeenCalled();
    });

    it('falls back to copying the URL when native share rejects for another reason', async () => {
        const share = vi.fn().mockRejectedValue(new Error('permission denied'));
        const writeText = vi.fn().mockResolvedValue(undefined);

        const result = await shareArticle(article, { share, writeText });

        expect(result).toBe('copied');
        expect(writeText).toHaveBeenCalledWith(article.url);
    });
});

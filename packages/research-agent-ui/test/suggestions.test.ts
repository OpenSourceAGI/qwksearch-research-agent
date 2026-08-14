/**
 * @fileoverview Unit tests for the `getSuggestions` client fetch helper.
 */
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import grab from 'grab-url';
import { getSuggestions } from '../src/lib/suggestions';
import type { Message } from '../src/components/ChatConversation/ChatWindow';

vi.mock('grab-url');
const mockGrab = grab as MockedFunction<typeof grab>;

const chatHistory: Message[] = [
    { role: 'user', content: 'Tell me about SpaceX' } as Message,
    { role: 'assistant', content: 'SpaceX is a rocket company.' } as Message,
    { role: 'source', content: 'a big document dump' } as unknown as Message,
];

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
});

describe('getSuggestions', () => {
    it('sends the localStorage-backed model settings and filtered chat history', async () => {
        window.localStorage.setItem('chatModelKey', 'gpt-4');
        window.localStorage.setItem('chatModelProviderId', 'openai');
        window.localStorage.setItem('maxFollowupQuestions', '2');
        mockGrab.mockResolvedValue({ suggestions: ['Who founded SpaceX?'] });

        const result = await getSuggestions(chatHistory);

        expect(mockGrab).toHaveBeenCalledTimes(1);
        const [path, opts] = mockGrab.mock.calls[0];
        expect(path).toBe('agent/suggestions');
        const body = JSON.parse((opts as RequestInit).body as string);
        expect(body.chatModel).toEqual({ providerId: 'openai', key: 'gpt-4' });
        expect(body.maxQuestions).toBe(2);
        expect(body.chatHistory).toEqual([
            { role: 'user', content: 'Tell me about SpaceX' },
            { role: 'assistant', content: 'SpaceX is a rocket company.' },
        ]);
        expect(result).toEqual(['Who founded SpaceX?']);
    });

    it('defaults maxQuestions to 4 when unset', async () => {
        mockGrab.mockResolvedValue({ suggestions: [] });

        await getSuggestions(chatHistory);

        const [, opts] = mockGrab.mock.calls[0];
        const body = JSON.parse((opts as RequestInit).body as string);
        expect(body.maxQuestions).toBe(4);
    });

    it('returns an empty array when the response suggestions field is not an array', async () => {
        mockGrab.mockResolvedValue({ suggestions: 'not an array' } as any);

        const result = await getSuggestions(chatHistory);

        expect(result).toEqual([]);
    });

    it('returns an empty array when the fetch rejects', async () => {
        mockGrab.mockRejectedValue(new Error('network error'));

        const result = await getSuggestions(chatHistory);

        expect(result).toEqual([]);
    });
});

/**
 * @fileoverview Unit tests for the rewrite handler's two response shapes, and
 * for how it finds a model at all.
 *
 * The handler answers `{ rewrittenText }` JSON by default and a `text/plain`
 * token stream when the caller asks for one. Both contracts are load-bearing:
 * the chat UI's "rewrite this message" button reads the JSON, and the Reason
 * Editor's writing assistant reads the stream to fill its review panel in as
 * the model writes. A change that quietly moves every caller onto one of them
 * breaks the other in a way no type check catches.
 *
 * The model-resolution cases hold the line drawn after a live 500 that the
 * Worker log could only describe as "500, 70ms": the Groq key is one source of
 * a model rather than the only one, and a request that cannot be served says
 * why in a field the caller actually reads.
 */
import { describe, expect, it, vi } from 'vitest';
import { createRewriteHandler } from '../src/api/handlers/rewrite';

/** The model/env plumbing every case needs, with the two callables swappable. */
function deps(overrides: Record<string, unknown> = {}) {
    return {
        getEnv: () => 'test-groq-key',
        createGroq: () => () => 'llama-3.3-70b-versatile',
        generateText: vi.fn(async () => ({ text: '  A clearer sentence.  ' })),
        ...overrides,
    } as any;
}

function post(body: unknown): Request {
    return new Request('https://example.test/api/agent/rewrite', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/** A `streamText` that yields `chunks` as a model would, one await at a time. */
function streamOf(chunks: string[]) {
    return vi.fn(() => ({
        textStream: (async function* () {
            for (const chunk of chunks) yield chunk;
        })(),
    }));
}

describe('createRewriteHandler', () => {
    it('answers with trimmed { rewrittenText } JSON by default', async () => {
        const { POST } = createRewriteHandler(deps());

        const response = await POST(post({ text: 'a sentence' }));

        expect(response.headers.get('content-type')).toContain('application/json');
        expect(await response.json()).toEqual({ rewrittenText: 'A clearer sentence.' });
    });

    it('rejects a missing or non-string text with a 400', async () => {
        const { POST } = createRewriteHandler(deps());

        expect((await POST(post({}))).status).toBe(400);
        expect((await POST(post({ text: 42 }))).status).toBe(400);
    });

    it('answers with a 500 when the provider key is unset', async () => {
        const { POST } = createRewriteHandler(deps({ getEnv: () => undefined }));

        expect((await POST(post({ text: 'a sentence' }))).status).toBe(500);
    });

    it('falls back to the host registry when no Groq key is set', async () => {
        // A deployment can hold a working provider without holding a Groq key.
        // Before this the route 500d on every rewrite while its chat routes ran.
        const loadChatModel = vi.fn(async () => 'registry-model');
        const generateText = vi.fn(async () => ({ text: 'A clearer sentence.' }));
        const { POST } = createRewriteHandler(
            deps({ getEnv: () => undefined, loadChatModel, generateText }),
        );

        const response = await POST(post({ text: 'a sentence' }));

        expect(await response.json()).toEqual({ rewrittenText: 'A clearer sentence.' });
        expect(loadChatModel).toHaveBeenCalledTimes(1);
        expect(generateText.mock.calls[0][0]).toMatchObject({ model: 'registry-model' });
    });

    it("prefers the caller's own provider and model over the host key", async () => {
        const loadChatModel = vi.fn(async () => 'user-model');
        const generateText = vi.fn(async () => ({ text: 'A clearer sentence.' }));
        const { POST } = createRewriteHandler(deps({ loadChatModel, generateText }));

        await POST(post({ text: 'a sentence', chatModel: { providerId: 'p1', key: 'gpt-x' } }));

        expect(loadChatModel).toHaveBeenCalledWith({ providerId: 'p1', key: 'gpt-x' });
        expect(generateText.mock.calls[0][0]).toMatchObject({ model: 'user-model' });
    });

    it("falls back to the Groq key when the caller's pick no longer loads", async () => {
        // A model saved in Settings can be retired or have its key removed. That
        // is the caller's problem to fix, not a reason to fail the rewrite.
        const loadChatModel = vi.fn(async () => {
            throw new Error('Model "gone" is not available for provider "p1".');
        });
        const generateText = vi.fn(async () => ({ text: 'A clearer sentence.' }));
        const { POST } = createRewriteHandler(deps({ loadChatModel, generateText }));

        const response = await POST(post({ text: 'a sentence', chatModel: { key: 'gone' } }));

        expect(await response.json()).toEqual({ rewrittenText: 'A clearer sentence.' });
        expect(generateText.mock.calls[0][0]).toMatchObject({
            model: 'llama-3.3-70b-versatile',
        });
    });

    it('reports why no model could be loaded, rather than "try again"', async () => {
        const loadChatModel = vi.fn(async () => {
            throw new Error('No API key configured for provider "Groq".');
        });
        const { POST } = createRewriteHandler(deps({ getEnv: () => undefined, loadChatModel }));

        const response = await POST(post({ text: 'a sentence' }));

        expect(response.status).toBe(500);
        // `error` is the field the editor's completion client surfaces.
        expect((await response.json()).error).toContain('No API key configured');
    });

    it('reports a provider failure in the body the caller reads', async () => {
        const generateText = vi.fn(async () => {
            throw new Error('Invalid API Key');
        });
        const { POST } = createRewriteHandler(deps({ generateText }));

        const response = await POST(post({ text: 'a sentence' }));

        expect(response.status).toBe(500);
        expect((await response.json()).error).toContain('Invalid API Key');
    });

    it('streams plain text when the caller asks for it', async () => {
        const streamText = streamOf(['A clearer', ' sentence.']);
        const { POST } = createRewriteHandler(deps({ streamText }));

        const response = await POST(post({ text: 'a sentence', stream: true }));

        expect(response.headers.get('content-type')).toContain('text/plain');
        // A buffering proxy would defeat the point of streaming at all.
        expect(response.headers.get('x-accel-buffering')).toBe('no');
        expect(await response.text()).toBe('A clearer sentence.');
        expect(streamText).toHaveBeenCalledTimes(1);
    });

    it('passes the caller prompt through to the streaming model', async () => {
        const streamText = streamOf(['ok']);
        const { POST } = createRewriteHandler(deps({ streamText }));

        await POST(post({ text: 'a sentence', prompt: 'Make it rhyme.', stream: true }));

        expect(streamText.mock.calls[0][0]).toMatchObject({ prompt: 'Make it rhyme.' });
    });

    it('falls back to JSON when the host wired no streamText', async () => {
        // Streaming is opt-in on both sides. A host that has not wired it must
        // still serve the request rather than 500 on an undefined callable.
        const generateText = vi.fn(async () => ({ text: 'A clearer sentence.' }));
        const { POST } = createRewriteHandler(deps({ generateText }));

        const response = await POST(post({ text: 'a sentence', stream: true }));

        expect(response.headers.get('content-type')).toContain('application/json');
        expect(await response.json()).toEqual({ rewrittenText: 'A clearer sentence.' });
        expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('answers a stream that fails before its first chunk with a JSON error', async () => {
        // Everything that rejects a request outright — a bad key, a retired
        // model, a rate limit — does so on the first pull. Answering 200 first
        // and tearing the body later left the editor's panel blank and silent.
        const streamText = vi.fn(() => ({
            textStream: {
                [Symbol.asyncIterator]: () => ({
                    next: async () => {
                        throw new Error('Invalid API Key');
                    },
                }),
            } as AsyncIterable<string>,
        }));
        const { POST } = createRewriteHandler(deps({ streamText }));

        const response = await POST(post({ text: 'a sentence', stream: true }));

        expect(response.status).toBe(500);
        expect(response.headers.get('content-type')).toContain('application/json');
        expect((await response.json()).error).toContain('Invalid API Key');
    });

    it('does not stream unless the caller asked, even when streamText exists', async () => {
        const streamText = streamOf(['nope']);
        const { POST } = createRewriteHandler(deps({ streamText }));

        const response = await POST(post({ text: 'a sentence' }));

        expect(await response.json()).toEqual({ rewrittenText: 'A clearer sentence.' });
        expect(streamText).not.toHaveBeenCalled();
    });
});

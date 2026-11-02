// @vitest-environment node
/**
 * @fileoverview The OpenAI-compatible speech-to-text adapter
 * (`/api/v1/models`, `/api/v1/audio/transcriptions`) and the shared
 * `transcribeAudio` it has in common with `/api/agent/transcript`.
 *
 * Kilo and other OpenAI-style clients parse these bodies by shape, so the
 * cases pin the shape: `{ object: "list", data: [...] }` for models, `{ text }`
 * for a transcription, and 400s — not a silent fallback — for a tier or
 * response format this adapter cannot honour.
 */
import { describe, expect, it, vi } from 'vitest';
import {
    createOpenAIModelsHandler,
    createOpenAITranscriptionHandler,
} from '../src/api/handlers/openai-transcription';
import { createTranscriptHandler, transcribeAudio } from '../src/api/handlers/transcript';

const allow = async () => ({ authorized: true as const });
const deny = async () => ({ authorized: false as const, status: 401, message: 'Invalid API key.' });

function aiReturning(text = 'The transcribed speech goes here.') {
    return { run: vi.fn(async () => ({ text })) };
}

function depsWith(ai: unknown, authorize = allow) {
    return { getCloudflareContext: () => ({ env: { AI: ai } }), authorize };
}

function audio(bytes = [1, 2, 3]) {
    return new File([new Uint8Array(bytes)], 'test.wav', { type: 'audio/wav' });
}

function upload(fields: Record<string, string | File>, url = 'https://qwksearch.com/api/v1/audio/transcriptions') {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    return new Request(url, { method: 'POST', body: form, headers: { authorization: 'Bearer k' } });
}

describe('GET /v1/models', () => {
    it('lists the five tiers in the OpenAI model-list shape', async () => {
        const { GET } = createOpenAIModelsHandler({ authorize: allow });
        const res = await GET(new Request('https://qwksearch.com/api/v1/models'));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(await res.json()).toEqual({
            object: 'list',
            data: ['small', 'fast', 'medium', 'turbo', 'large'].map((id) => ({
                id,
                object: 'model',
                created: 0,
                owned_by: 'qwksearch',
            })),
        });
    });

    it('refuses an unauthorized caller with an OpenAI-shaped 401', async () => {
        const { GET } = createOpenAIModelsHandler({ authorize: deny });
        const res = await GET(new Request('https://qwksearch.com/api/v1/models'));

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error.message).toBe('Invalid API key.');
        expect(body.error.type).toBe('authentication_error');
    });
});

describe('POST /v1/audio/transcriptions', () => {
    it('answers { text } and nothing else', async () => {
        const ai = aiReturning();
        const { POST } = createOpenAITranscriptionHandler(depsWith(ai));
        const res = await POST(upload({ file: audio(), model: 'turbo', response_format: 'json' }));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ text: 'The transcribed speech goes here.' });
        expect(ai.run).toHaveBeenCalledWith('@cf/openai/whisper-large-v3-turbo', { audio: [1, 2, 3] });
    });

    it('defaults a missing model to turbo', async () => {
        const ai = aiReturning();
        const { POST } = createOpenAITranscriptionHandler(depsWith(ai));
        await POST(upload({ file: audio() }));

        expect(ai.run).toHaveBeenCalledWith('@cf/openai/whisper-large-v3-turbo', expect.anything());
    });

    it.each([
        ['small', '@cf/openai/whisper-tiny-en'],
        ['fast', '@cf/openai/whisper-tiny-en'],
        ['medium', '@cf/openai/whisper-large-v3-turbo'],
        ['large', '@cf/openai/whisper-large-v3'],
    ])('maps %s to the same Whisper model /agent/transcript uses', async (tier, cfModel) => {
        const ai = aiReturning();
        const { POST } = createOpenAITranscriptionHandler(depsWith(ai));
        await POST(upload({ file: audio(), model: tier }));

        expect(ai.run).toHaveBeenCalledWith(cfModel, expect.anything());
    });

    it('rejects an unknown model with 400 instead of falling back', async () => {
        const ai = aiReturning();
        const { POST } = createOpenAITranscriptionHandler(depsWith(ai));
        const res = await POST(upload({ file: audio(), model: 'whisper-1' }));

        expect(res.status).toBe(400);
        expect((await res.json()).error.param).toBe('model');
        expect(ai.run).not.toHaveBeenCalled();
    });

    it('rejects a missing file with 400', async () => {
        const { POST } = createOpenAITranscriptionHandler(depsWith(aiReturning()));
        const res = await POST(upload({ model: 'turbo' }));

        expect(res.status).toBe(400);
        expect((await res.json()).error.param).toBe('file');
    });

    it('rejects a body that is not multipart with 400', async () => {
        const { POST } = createOpenAITranscriptionHandler(depsWith(aiReturning()));
        const res = await POST(
            new Request('https://qwksearch.com/api/v1/audio/transcriptions', {
                method: 'POST',
                body: JSON.stringify({ model: 'turbo' }),
                headers: { 'content-type': 'application/json' },
            }),
        );

        expect(res.status).toBe(400);
    });

    it.each(['text', 'srt', 'verbose_json', 'vtt'])('rejects response_format=%s with 400', async (format) => {
        const ai = aiReturning();
        const { POST } = createOpenAITranscriptionHandler(depsWith(ai));
        const res = await POST(upload({ file: audio(), response_format: format }));

        expect(res.status).toBe(400);
        expect((await res.json()).error.param).toBe('response_format');
        expect(ai.run).not.toHaveBeenCalled();
    });

    it('checks authorization before reading the upload', async () => {
        const ai = aiReturning();
        const { POST } = createOpenAITranscriptionHandler(depsWith(ai, deny));
        const res = await POST(upload({ file: audio() }));

        expect(res.status).toBe(401);
        expect(ai.run).not.toHaveBeenCalled();
    });

    it('answers 503 when the Workers AI binding is missing', async () => {
        const { POST } = createOpenAITranscriptionHandler(depsWith(undefined));
        const res = await POST(upload({ file: audio() }));

        expect(res.status).toBe(503);
        expect((await res.json()).error.type).toBe('server_error');
    });

    it('answers 500 on a Workers AI failure without logging audio or transcript', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const ai = { run: vi.fn(async () => { throw new Error('secret transcript words'); }) };
        const { POST } = createOpenAITranscriptionHandler(depsWith(ai));
        const res = await POST(upload({ file: audio() }));

        expect(res.status).toBe(500);
        const logged = JSON.stringify(error.mock.calls);
        expect(logged).not.toContain('secret transcript words');
        error.mockRestore();
    });
});

describe('/agent/transcript keeps its contract', () => {
    it('still answers { text, model } and still falls back on an unknown tier', async () => {
        const ai = aiReturning('hello');
        const { POST } = createTranscriptHandler({ getCloudflareContext: () => ({ env: { AI: ai } }) });
        const form = new FormData();
        form.append('file', audio());
        form.append('model', 'nonsense');
        const res = await POST(new Request('https://qwksearch.com/api/agent/transcript', { method: 'POST', body: form }));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ text: 'hello', model: '@cf/openai/whisper-large-v3-turbo' });
    });

    it('shares transcribeAudio with the v1 route', async () => {
        const ai = aiReturning('shared');
        const result = await transcribeAudio({ getCloudflareContext: () => ({ env: { AI: ai } }) }, audio(), 'large');

        expect(result).toEqual({ ok: true, text: 'shared', model: '@cf/openai/whisper-large-v3' });
    });
});

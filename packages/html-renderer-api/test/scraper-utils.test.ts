/**
 * @fileoverview Unit tests for request-parameter parsing and API-key auth.
 */
import { describe, expect, it } from 'vitest';
import {
    authenticateRequest,
    parseRequestParams,
    type Env,
    type RequestParams,
} from '../src/utils/scraper-utils';

const env = (overrides: Partial<Env> = {}): Env => ({ MYBROWSER: {}, ...overrides }) as Env;

const emptyParams = {} as RequestParams;

describe('authenticateRequest', () => {
    it('passes when no API key is configured', async () => {
        const request = new Request('https://scraper.test/?url=https://example.com');

        await expect(authenticateRequest(request, env(), emptyParams)).resolves.toEqual({
            success: true,
        });
    });

    it('accepts a matching Bearer token', async () => {
        const request = new Request('https://scraper.test/', {
            headers: { Authorization: 'Bearer secret' },
        });

        await expect(
            authenticateRequest(request, env({ SCRAPER_API_KEY: 'secret' }), emptyParams)
        ).resolves.toEqual({ success: true });
    });

    it('accepts a matching query parameter', async () => {
        const request = new Request('https://scraper.test/?SCRAPER_API_KEY=secret');

        await expect(
            authenticateRequest(request, env({ SCRAPER_API_KEY: 'secret' }), emptyParams)
        ).resolves.toEqual({ success: true });
    });

    it('accepts a matching body-sourced key', async () => {
        const request = new Request('https://scraper.test/');

        await expect(
            authenticateRequest(request, env({ SCRAPER_API_KEY: 'secret' }), {
                SCRAPER_API_KEY: 'secret',
            } as RequestParams)
        ).resolves.toEqual({ success: true });
    });

    it('rejects a wrong key', async () => {
        const request = new Request('https://scraper.test/', {
            headers: { Authorization: 'Bearer wrong' },
        });

        const result = await authenticateRequest(
            request,
            env({ SCRAPER_API_KEY: 'secret' }),
            emptyParams
        );

        expect(result.success).toBe(false);
        expect(JSON.parse(result.error!)).toEqual({ error: 'Invalid or missing API key' });
    });

    it('rejects a request with no key at all', async () => {
        const request = new Request('https://scraper.test/');

        const result = await authenticateRequest(
            request,
            env({ SCRAPER_API_KEY: 'secret' }),
            emptyParams
        );

        expect(result.success).toBe(false);
    });

    it('ignores a non-Bearer Authorization header', async () => {
        const request = new Request('https://scraper.test/', {
            headers: { Authorization: 'Basic secret' },
        });

        const result = await authenticateRequest(
            request,
            env({ SCRAPER_API_KEY: 'secret' }),
            emptyParams
        );

        expect(result.success).toBe(false);
    });

    it('prefers the Bearer token over the query parameter', async () => {
        const request = new Request('https://scraper.test/?SCRAPER_API_KEY=secret', {
            headers: { Authorization: 'Bearer wrong' },
        });

        const result = await authenticateRequest(
            request,
            env({ SCRAPER_API_KEY: 'secret' }),
            emptyParams
        );

        expect(result.success).toBe(false);
    });
});

describe('parseRequestParams defaults', () => {
    it('applies the string defaults for a bare GET', async () => {
        const params = await parseRequestParams(new Request('https://scraper.test/'));

        expect(params).toMatchObject({
            url: '',
            blockImages: false,
            sessionId: 'default',
            waitUntil: 'networkidle2',
            headers: {},
            format: 'html',
            bypassCaptcha: true,
        });
    });

    it('yields NaN for the numeric fields when neither query nor body sets them', () => {
        // Each numeric default is written as `String(bodyParams.x) ?? "0"`, and
        // `String(undefined)` is the string "undefined" — never nullish — so the
        // literal default is unreachable and parseInt returns NaN.
        return parseRequestParams(new Request('https://scraper.test/')).then((params) => {
            expect(Number.isNaN(params.wait)).toBe(true);
            expect(Number.isNaN(params.timeout)).toBe(true);
            expect(Number.isNaN(params.maxRetries)).toBe(true);
            expect(Number.isNaN(params.challengeTimeout)).toBe(true);
        });
    });
});

describe('parseRequestParams from the query string', () => {
    it('reads the scrape target and timings', async () => {
        const params = await parseRequestParams(
            new Request(
                'https://scraper.test/?url=https%3A%2F%2Fexample.com&wait=250&timeout=1000&challengeTimeout=99&maxRetries=2'
            )
        );

        expect(params.url).toBe('https://example.com');
        expect(params.wait).toBe(250);
        expect(params.timeout).toBe(1000);
        expect(params.challengeTimeout).toBe(99);
        expect(params.maxRetries).toBe(2);
    });

    it('reads the boolean flags', async () => {
        const params = await parseRequestParams(
            new Request('https://scraper.test/?blockImages=true')
        );

        expect(params.blockImages).toBe(true);
    });

    it('treats a non-"true" flag value as false', async () => {
        const params = await parseRequestParams(
            new Request('https://scraper.test/?blockImages=yes')
        );

        expect(params.blockImages).toBe(false);
    });

    it('reads the session, format and waitUntil settings', async () => {
        const params = await parseRequestParams(
            new Request('https://scraper.test/?sessionId=s1&format=json&waitUntil=load')
        );

        expect(params.sessionId).toBe('s1');
        expect(params.format).toBe('json');
        expect(params.waitUntil).toBe('load');
    });

    it('reads the proxy and captcha settings', async () => {
        const params = await parseRequestParams(
            new Request(
                'https://scraper.test/?proxyUrl=http%3A%2F%2Fp.test&proxyUser=u&proxyPass=p&twoCaptchaKey=k&challengeMatch=Just+a+moment'
            )
        );

        expect(params.proxyUrl).toBe('http://p.test');
        expect(params.proxyUser).toBe('u');
        expect(params.proxyPass).toBe('p');
        expect(params.twoCaptchaKey).toBe('k');
        expect(params.challengeMatch).toBe('Just a moment');
    });

    it('reads the cookie payload and the API key alias', async () => {
        const params = await parseRequestParams(
            new Request('https://scraper.test/?cookies=%5B%5D&SCRAPER_API_KEY=secret')
        );

        expect(params.cookies).toBe('[]');
        expect(params.scraper_api_key).toBe('secret');
    });
});

describe('parseRequestParams from a POST body', () => {
    const post = (body: BodyInit, contentType: string) =>
        new Request('https://scraper.test/', {
            method: 'POST',
            headers: { 'content-type': contentType },
            body,
        });

    it('reads a JSON body', async () => {
        const params = await parseRequestParams(
            post(
                JSON.stringify({
                    url: 'https://example.com',
                    wait: 500,
                    blockImages: true,
                    sessionId: 's2',
                    headers: { 'X-Test': '1' },
                    format: 'json',
                }),
                'application/json'
            )
        );

        expect(params.url).toBe('https://example.com');
        expect(params.wait).toBe(500);
        expect(params.blockImages).toBe(true);
        expect(params.sessionId).toBe('s2');
        expect(params.headers).toEqual({ 'X-Test': '1' });
        expect(params.format).toBe('json');
    });

    it('reads a form-urlencoded body', async () => {
        const params = await parseRequestParams(
            post('url=https%3A%2F%2Fexample.com&sessionId=s3', 'application/x-www-form-urlencoded')
        );

        expect(params.url).toBe('https://example.com');
        expect(params.sessionId).toBe('s3');
    });

    it('ignores an unparseable JSON body', async () => {
        const params = await parseRequestParams(post('{not json', 'application/json'));

        expect(params.url).toBe('');
        expect(params.sessionId).toBe('default');
    });

    it('ignores a body with an unsupported content type', async () => {
        const params = await parseRequestParams(post('url=x', 'text/plain'));

        expect(params.url).toBe('');
    });

    it('lets the query string win over the body', async () => {
        const request = new Request('https://scraper.test/?url=https%3A%2F%2Fquery.test', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url: 'https://body.test' }),
        });

        const params = await parseRequestParams(request);

        expect(params.url).toBe('https://query.test');
    });
});

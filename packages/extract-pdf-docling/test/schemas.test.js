import { describe, expect, it } from 'vitest';
import {
  ConvertImageBase64BodySchema,
  ConvertImageBodySchema,
  ConvertImageResponseSchema,
  ErrorResponseSchema,
  HealthResponseSchema,
} from '../src/schemas.js';

describe('ConvertImageBodySchema', () => {
  it('accepts a bare image URL and fills in the defaults', () => {
    const parsed = ConvertImageBodySchema.parse({ imageUrl: 'https://example.com/page.png' });

    expect(parsed).toEqual({
      imageUrl: 'https://example.com/page.png',
      prompt: 'Convert this page to docling.',
      maxTokens: 4096,
      streaming: false,
    });
  });

  it('keeps explicitly supplied values', () => {
    const parsed = ConvertImageBodySchema.parse({
      imageUrl: 'https://example.com/page.png',
      prompt: 'Extract the tables.',
      maxTokens: 512,
      streaming: true,
    });

    expect(parsed.prompt).toBe('Extract the tables.');
    expect(parsed.maxTokens).toBe(512);
    expect(parsed.streaming).toBe(true);
  });

  it('requires imageUrl', () => {
    expect(ConvertImageBodySchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-URL imageUrl', () => {
    expect(ConvertImageBodySchema.safeParse({ imageUrl: 'not-a-url' }).success).toBe(false);
  });

  it('bounds maxTokens to 1..8192', () => {
    const url = 'https://example.com/page.png';

    expect(ConvertImageBodySchema.safeParse({ imageUrl: url, maxTokens: 0 }).success).toBe(false);
    expect(ConvertImageBodySchema.safeParse({ imageUrl: url, maxTokens: 8193 }).success).toBe(false);
    expect(ConvertImageBodySchema.safeParse({ imageUrl: url, maxTokens: 1 }).success).toBe(true);
    expect(ConvertImageBodySchema.safeParse({ imageUrl: url, maxTokens: 8192 }).success).toBe(true);
  });

  it('requires maxTokens to be an integer', () => {
    expect(
      ConvertImageBodySchema.safeParse({ imageUrl: 'https://example.com/a.png', maxTokens: 1.5 })
        .success
    ).toBe(false);
  });

  it('rejects a non-boolean streaming flag', () => {
    expect(
      ConvertImageBodySchema.safeParse({ imageUrl: 'https://example.com/a.png', streaming: 'yes' })
        .success
    ).toBe(false);
  });
});

describe('ConvertImageBase64BodySchema', () => {
  it('defaults the mime type to image/png', () => {
    const parsed = ConvertImageBase64BodySchema.parse({ imageBase64: 'aGVsbG8=' });

    expect(parsed.mimeType).toBe('image/png');
    expect(parsed.prompt).toBe('Convert this page to docling.');
    expect(parsed.maxTokens).toBe(4096);
    expect(parsed.streaming).toBe(false);
  });

  it('keeps an explicit mime type', () => {
    const parsed = ConvertImageBase64BodySchema.parse({
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
    });

    expect(parsed.mimeType).toBe('image/jpeg');
  });

  it('requires imageBase64', () => {
    expect(ConvertImageBase64BodySchema.safeParse({}).success).toBe(false);
  });

  it('shares the maxTokens bounds with the URL schema', () => {
    expect(
      ConvertImageBase64BodySchema.safeParse({ imageBase64: 'x', maxTokens: 9999 }).success
    ).toBe(false);
  });
});

describe('ConvertImageResponseSchema', () => {
  it('accepts a minimal successful response', () => {
    const parsed = ConvertImageResponseSchema.parse({
      success: true,
      result: '<doctag>…</doctag>',
      metadata: { processingTime: 1234 },
    });

    expect(parsed.metadata.processingTime).toBe(1234);
    expect(parsed.metadata.tokenCount).toBeUndefined();
  });

  it('accepts an optional token count', () => {
    const parsed = ConvertImageResponseSchema.parse({
      success: true,
      result: 'x',
      metadata: { processingTime: 1, tokenCount: 42 },
    });

    expect(parsed.metadata.tokenCount).toBe(42);
  });

  it('requires the metadata block', () => {
    expect(ConvertImageResponseSchema.safeParse({ success: true, result: 'x' }).success).toBe(false);
  });

  it('requires a processing time', () => {
    expect(
      ConvertImageResponseSchema.safeParse({ success: true, result: 'x', metadata: {} }).success
    ).toBe(false);
  });
});

describe('ErrorResponseSchema', () => {
  it('defaults success to false', () => {
    expect(ErrorResponseSchema.parse({ error: 'boom' })).toEqual({ success: false, error: 'boom' });
  });

  it('accepts an optional error code', () => {
    expect(ErrorResponseSchema.parse({ error: 'boom', code: 'E_MODEL' }).code).toBe('E_MODEL');
  });

  it('requires an error message', () => {
    expect(ErrorResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('HealthResponseSchema', () => {
  it('accepts a full health payload', () => {
    const payload = { status: 'ok', modelLoaded: true, uptime: 12.5, version: '1.0.104' };

    expect(HealthResponseSchema.parse(payload)).toEqual(payload);
  });

  it('requires every field', () => {
    expect(HealthResponseSchema.safeParse({ status: 'ok' }).success).toBe(false);
  });
});

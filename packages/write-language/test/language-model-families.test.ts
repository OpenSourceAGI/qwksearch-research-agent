import { describe, expect, it } from 'vitest';
import { LANGUAGE_MODEL_FAMILIES } from '../src/language-model-families';

describe('LANGUAGE_MODEL_FAMILIES', () => {
  it('is a non-empty list', () => {
    expect(LANGUAGE_MODEL_FAMILIES.length).toBeGreaterThan(0);
  });

  it('gives every family a unique model_family key', () => {
    const names = LANGUAGE_MODEL_FAMILIES.map((f) => f.model_family);

    expect(new Set(names).size).toBe(names.length);
  });

  it('fills in every required field for every family', () => {
    for (const family of LANGUAGE_MODEL_FAMILIES) {
      expect(family.model_family, 'model_family').toBeTruthy();
      expect(family.flagship, `${family.model_family}.flagship`).toBeTruthy();
      expect(family.maker, `${family.model_family}.maker`).toBeTruthy();
      expect(family.imgur, `${family.model_family}.imgur`).toBeTruthy();
      expect(typeof family.open, `${family.model_family}.open`).toBe('boolean');
    }
  });

  it('lists at least one provider per family', () => {
    for (const family of LANGUAGE_MODEL_FAMILIES) {
      expect(Array.isArray(family.providers)).toBe(true);
      expect(family.providers.length, `${family.model_family}.providers`).toBeGreaterThan(0);
    }
  });

  it('lists each provider only once per family', () => {
    for (const family of LANGUAGE_MODEL_FAMILIES) {
      expect(new Set(family.providers).size, `${family.model_family}.providers`).toBe(
        family.providers.length
      );
    }
  });

  it('includes the major closed-weight families', () => {
    const names = LANGUAGE_MODEL_FAMILIES.map((f) => f.model_family);

    expect(names).toContain('Claude');
    expect(names).toContain('ChatGPT');
    expect(names).toContain('Gemini');
  });

  it('attributes Claude to Anthropic and marks it closed', () => {
    const claude = LANGUAGE_MODEL_FAMILIES.find((f) => f.model_family === 'Claude')!;

    expect(claude.maker).toBe('Anthropic');
    expect(claude.open).toBe(false);
    expect(claude.providers).toContain('Anthropic');
  });

  it('marks the open-weight families as open', () => {
    const open = LANGUAGE_MODEL_FAMILIES.filter((f) => f.open).map((f) => f.model_family);

    expect(open).toContain('Llama');
    expect(open).toContain('Qwen');
    expect(open).toContain('Mistral');
  });

  it('routes most families through OpenRouter', () => {
    const viaOpenRouter = LANGUAGE_MODEL_FAMILIES.filter((f) => f.providers.includes('OpenRouter'));

    expect(viaOpenRouter.length).toBeGreaterThan(LANGUAGE_MODEL_FAMILIES.length / 2);
  });

  it('uses bare imgur ids rather than full URLs', () => {
    for (const family of LANGUAGE_MODEL_FAMILIES) {
      expect(family.imgur, family.model_family).not.toContain('http');
      expect(family.imgur, family.model_family).toMatch(/^[A-Za-z0-9]+$/);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_MODELS,
  LANGUAGE_PROVIDERS,
  getAllModels,
  getModelsByCapability,
  getModelsByProvider,
  getMultimodalModels,
  getTextOnlyModels,
} from '../src/language-model-registry';

describe('LANGUAGE_MODELS', () => {
  it('lists providers, each with at least one model', () => {
    expect(LANGUAGE_MODELS.length).toBeGreaterThan(0);

    for (const provider of LANGUAGE_MODELS) {
      expect(provider.provider, 'provider name').toBeTruthy();
      expect(provider.models.length, `${provider.provider}.models`).toBeGreaterThan(0);
    }
  });

  it('gives every model a name, id and context length', () => {
    for (const provider of LANGUAGE_MODELS) {
      for (const model of provider.models) {
        expect(model.name, `${provider.provider} model name`).toBeTruthy();
        expect(model.id, `${provider.provider}/${model.name} id`).toBeTruthy();
        expect(typeof model.contextLength).toBe('number');
        expect(model.contextLength).toBeGreaterThan(0);
      }
    }
  });

  it('does not repeat a provider name', () => {
    const names = LANGUAGE_MODELS.map((p) => p.provider);

    expect(new Set(names).size).toBe(names.length);
  });

  it('does not repeat a model id within a provider', () => {
    for (const provider of LANGUAGE_MODELS) {
      const ids = provider.models.map((m) => m.id);
      expect(new Set(ids).size, provider.provider).toBe(ids.length);
    }
  });
});

describe('LANGUAGE_PROVIDERS', () => {
  it('is the lowercased provider list', () => {
    expect(LANGUAGE_PROVIDERS).toEqual(LANGUAGE_MODELS.map((p) => p.provider.toLowerCase()));
  });

  it('contains no uppercase characters', () => {
    for (const name of LANGUAGE_PROVIDERS) {
      expect(name).toBe(name.toLowerCase());
    }
  });
});

describe('getModelsByProvider', () => {
  const firstProvider = LANGUAGE_MODELS[0].provider;

  it('returns the models for a known provider', () => {
    const models = getModelsByProvider(firstProvider);

    expect(models.length).toBe(LANGUAGE_MODELS[0].models.length);
  });

  it('matches the provider name case-insensitively', () => {
    expect(getModelsByProvider(firstProvider.toUpperCase())).toHaveLength(
      getModelsByProvider(firstProvider.toLowerCase()).length
    );
  });

  it('returns an empty array for an unknown provider', () => {
    expect(getModelsByProvider('not-a-provider')).toEqual([]);
  });

  it('stamps each model with its provider and inferred capabilities', () => {
    const [model] = getModelsByProvider(firstProvider);

    expect(model.provider).toBe(firstProvider);
    expect(model.capabilities).toContain('text');
  });
});

describe('getAllModels', () => {
  it('returns every model across every provider', () => {
    const expected = LANGUAGE_MODELS.reduce((n, p) => n + p.models.length, 0);

    expect(getAllModels()).toHaveLength(expected);
  });

  it('marks every model as supporting text', () => {
    for (const model of getAllModels()) {
      expect(model.capabilities, model.id).toContain('text');
    }
  });

  it('attaches a provider to every model', () => {
    for (const model of getAllModels()) {
      expect(model.provider, model.id).toBeTruthy();
    }
  });
});

describe('getModelsByCapability', () => {
  it('returns every model for the text capability', () => {
    expect(getModelsByCapability('text')).toHaveLength(getAllModels().length);
  });

  it('narrows to a single provider when one is given', () => {
    const provider = LANGUAGE_MODELS[0].provider;
    const scoped = getModelsByCapability('text', provider);

    expect(scoped.length).toBeGreaterThan(0);
    for (const model of scoped) {
      expect(model.provider).toBe(provider);
    }
  });

  it('returns an empty array for an unknown provider', () => {
    expect(getModelsByCapability('text', 'not-a-provider')).toEqual([]);
  });

  it('finds at least one vision model in the registry', () => {
    expect(getModelsByCapability('vision').length).toBeGreaterThan(0);
  });
});

describe('getTextOnlyModels and getMultimodalModels', () => {
  it('partition the registry with no overlap', () => {
    const textOnlyIds = new Set(getTextOnlyModels().map((m) => `${m.provider}/${m.id}`));
    const multimodalIds = getMultimodalModels().map((m) => `${m.provider}/${m.id}`);

    for (const id of multimodalIds) {
      expect(textOnlyIds.has(id), `${id} should not be in both buckets`).toBe(false);
    }
  });

  it('together account for every model', () => {
    const total = getTextOnlyModels().length + getMultimodalModels().length;

    expect(total).toBe(getAllModels().length);
  });

  it('never label a text-only model with vision or audio', () => {
    for (const model of getTextOnlyModels()) {
      expect(model.capabilities, model.id).not.toContain('vision');
      expect(model.capabilities, model.id).not.toContain('audio');
    }
  });

  it('always label a multimodal model with vision or audio', () => {
    for (const model of getMultimodalModels()) {
      const caps = model.capabilities ?? [];
      expect(caps.includes('vision') || caps.includes('audio'), model.id).toBe(true);
    }
  });

  it('scope to a provider when one is given', () => {
    const provider = LANGUAGE_MODELS[0].provider;

    for (const model of getTextOnlyModels(provider)) {
      expect(model.provider).toBe(provider);
    }
    for (const model of getMultimodalModels(provider)) {
      expect(model.provider).toBe(provider);
    }
  });
});

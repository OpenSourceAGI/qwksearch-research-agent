/**
 * @fileoverview Unit tests for the embedding-based relevance helpers. The
 * transformer pipeline is supplied as a stub so no model is downloaded and no
 * request leaves the process.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateCosineSimilarity,
  convertTextToEmbedding,
  weighRelevanceConceptVector,
  weighRelevanceConceptVectorAPI,
  weighRelevanceConceptVectorMultiple,
} from '../src/seektopic/vector-search';

/**
 * Stub transformer pipeline. Each input string maps to a fixed vector so the
 * cosine ordering under test is deterministic.
 */
const VECTORS: Record<string, number[]> = {
  'machine learning basics': [1, 0, 0],
  'deep neural networks': [0.8, 0.6, 0],
  'baking sourdough bread': [0, 0, 1],
  'artificial intelligence': [1, 0, 0],
  cooking: [0, 0, 1],
};

const vectorFor = (text: string) => VECTORS[text] ?? [0, 1, 0];

/** Mirrors the transformers pipeline shape the helpers consume. */
const pipeline = vi.fn(async (input: string | string[]) =>
  Array.isArray(input)
    ? { tolist: () => input.map(vectorFor) }
    : { data: Float32Array.from(vectorFor(input)) }
);

afterEach(() => {
  pipeline.mockClear();
});

describe('calculateCosineSimilarity', () => {
  it('returns 1 for identical directions', () => {
    expect(calculateCosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
    expect(calculateCosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(calculateCosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns -1 for opposite directions', () => {
    expect(calculateCosineSimilarity([1, 0], [-1, 0])).toBe(-1);
  });

  it('is symmetric', () => {
    const a = [0.3, 0.7, 0.1];
    const b = [0.9, 0.2, 0.4];

    expect(calculateCosineSimilarity(a, b)).toBeCloseTo(calculateCosineSimilarity(b, a), 12);
  });
});

describe('convertTextToEmbedding', () => {
  it('returns a rounded vector for a single string', async () => {
    const embedding = await convertTextToEmbedding('machine learning basics', { pipeline });

    expect(embedding).toEqual([1, 0, 0]);
    expect(pipeline).toHaveBeenCalledWith('machine learning basics', {
      pooling: 'mean',
      normalize: true,
    });
  });

  it('returns one vector per input for an array', async () => {
    const embeddings = await convertTextToEmbedding(
      ['machine learning basics', 'cooking'],
      { pipeline }
    );

    expect(embeddings).toEqual([
      [1, 0, 0],
      [0, 0, 1],
    ]);
  });

  it('rounds to the requested precision', async () => {
    const precise = vi.fn(async () => ({ data: Float32Array.from([0.123456]) }));

    await expect(
      convertTextToEmbedding('x', { pipeline: precise, precision: 2 })
    ).resolves.toEqual([0.12]);
  });
});

describe('weighRelevanceConceptVector', () => {
  it('ranks documents by similarity to the query', async () => {
    const ranked = await weighRelevanceConceptVector(
      ['baking sourdough bread', 'deep neural networks', 'machine learning basics'],
      'artificial intelligence',
      { pipeline }
    );

    expect(ranked.map((r: any) => r.content)).toEqual([
      'machine learning basics',
      'deep neural networks',
      'baking sourdough bread',
    ]);
  });

  it('attaches a similarity score to each document', async () => {
    const ranked = await weighRelevanceConceptVector(
      ['machine learning basics'],
      'artificial intelligence',
      { pipeline }
    );

    expect(ranked[0].similarity).toBeCloseTo(1, 10);
  });

  it('returns an empty list for no documents', async () => {
    await expect(
      weighRelevanceConceptVector([], 'artificial intelligence', { pipeline })
    ).resolves.toEqual([]);
  });
});

describe('weighRelevanceConceptVectorMultiple', () => {
  const documents = [
    'baking sourdough bread',
    'deep neural networks',
    'machine learning basics',
  ];

  it('returns a ranking per query', async () => {
    const byQuery = await weighRelevanceConceptVectorMultiple(
      documents,
      ['artificial intelligence', 'cooking'],
      { pipeline }
    );

    expect(Object.keys(byQuery)).toEqual(['artificial intelligence', 'cooking']);
    expect(byQuery['artificial intelligence'][0].content).toBe('machine learning basics');
    expect(byQuery.cooking[0].content).toBe('baking sourdough bread');
  });

  it('embeds the documents only once across all queries', async () => {
    await weighRelevanceConceptVectorMultiple(
      documents,
      ['artificial intelligence', 'cooking'],
      { pipeline }
    );

    // One batched call for the documents, one for the queries.
    expect(pipeline).toHaveBeenCalledTimes(2);
  });

  it('returns an empty object for empty input', async () => {
    await expect(
      weighRelevanceConceptVectorMultiple([], ['q'], { pipeline })
    ).resolves.toEqual({});
    await expect(
      weighRelevanceConceptVectorMultiple(documents, [], { pipeline })
    ).resolves.toEqual({});
    await expect(
      weighRelevanceConceptVectorMultiple(null as any, ['q'], { pipeline })
    ).resolves.toEqual({});
  });
});

describe('weighRelevanceConceptVectorAPI', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refuses to call the API without a key', async () => {
    await expect(weighRelevanceConceptVectorAPI('source', ['a'])).resolves.toEqual({
      error: 'No API key',
    });
  });

  it('posts the source and sentences to the inference endpoint', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [0.9, 0.1],
      text: async () => '[0.9,0.1]',
      headers: new Headers({ 'content-type': 'application/json' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await weighRelevanceConceptVectorAPI('source', ['a', 'b'], { HF_API_KEY: 'hf-key' });

    const [url, init] = fetchMock.mock.calls[0] as any[];
    expect(String(url)).toContain('api-inference.huggingface.co');
    expect(String(url)).toContain('sentence-transformers/all-MiniLM-L6-v2');
    expect(init.headers.Authorization).toBe('Bearer hf-key');
    expect(JSON.parse(init.body)).toEqual({
      inputs: { source_sentence: 'source', sentences: ['a', 'b'] },
    });
  });

  it('honours a custom model name', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
      text: async () => '[]',
      headers: new Headers({ 'content-type': 'application/json' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await weighRelevanceConceptVectorAPI('source', ['a'], {
      HF_API_KEY: 'hf-key',
      model: 'my-org/my-model',
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain('my-org/my-model');
  });

  it('returns null when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      })
    );

    await expect(
      weighRelevanceConceptVectorAPI('source', ['a'], { HF_API_KEY: 'hf-key' })
    ).resolves.toBeNull();
  });
});

/**
 * @fileoverview Unit tests for the SEEKTOPIC entry point, covering both the
 * LLM-assisted path and the n-gram fallback used when no LLM is reachable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const writeLanguageResponse = vi.fn();
vi.mock('chat-agent-toolkit', () => ({
  writeLanguageResponse: (...args: unknown[]) => writeLanguageResponse(...args),
}));

const weighRelevanceConceptVectorMultiple = vi.fn();
vi.mock('../src/seektopic/vector-search', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/seektopic/vector-search')>()),
  weighRelevanceConceptVectorMultiple: (...args: unknown[]) =>
    weighRelevanceConceptVectorMultiple(...args),
}));

const { extractSEEKTOPIC } = await import('../src/seektopic/seektopic-keyphrases');

/** Small trie model marking a handful of words as nouns / wiki entities. */
const phrasesModel = {
  ma: { machine: [[null, 1, 5]] },
  le: { learning: [[null, 1, 5]] },
  ne: { neural: [[null, 1, 5]] },
  qu: { quantum: [[null, 5, 9]] },
  co: { computing: [[null, 1, 5]] },
} as any;

const DOC =
  'Machine learning is a broad field of study today. ' +
  'Machine learning powers many modern systems. ' +
  'Quantum computing is a different field entirely. ' +
  'Quantum computing remains largely experimental for now.';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // Default: no LLM available, so every test falls through to the n-gram path.
  writeLanguageResponse.mockRejectedValue(new Error('no provider'));
  weighRelevanceConceptVectorMultiple.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('extractSEEKTOPIC input handling', () => {
  it('rejects a non-string document', async () => {
    await expect(extractSEEKTOPIC(42 as any)).rejects.toThrow('docText must be a string');
    await expect(extractSEEKTOPIC(null as any)).rejects.toThrow('docText must be a string');
  });

  it('returns an empty keyphrase list for empty text', async () => {
    await expect(extractSEEKTOPIC('', { phrasesModel })).resolves.toEqual([]);
  });
});

describe('extractSEEKTOPIC n-gram fallback', () => {
  it('returns weighted keyphrases when the LLM is unavailable', async () => {
    const keyphrases = (await extractSEEKTOPIC(DOC, { phrasesModel })) as any[];

    expect(Array.isArray(keyphrases)).toBe(true);
    expect(keyphrases.map((k) => k.keyphrase)).toContain('machine learning');
  });

  it('sorts keyphrases by descending weight', async () => {
    const keyphrases = (await extractSEEKTOPIC(DOC, { phrasesModel })) as any[];
    const weights = keyphrases.map((k) => k.weight);

    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });

  it('drops keyphrases shorter than minKeyPhraseLength', async () => {
    const keyphrases = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      minKeyPhraseLength: 20,
    })) as any[];

    expect(keyphrases).toEqual([]);
  });

  it('strips HTML tags by default', async () => {
    const keyphrases = (await extractSEEKTOPIC(`<p>${DOC}</p>`, { phrasesModel })) as any[];

    expect(keyphrases.every((k) => !k.keyphrase.includes('<'))).toBe(true);
  });

  it('boosts keyphrases matching a heavy-weight query', async () => {
    const plain = (await extractSEEKTOPIC(DOC, { phrasesModel })) as any[];
    const biased = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      heavyWeightQuery: 'machine learning today',
    })) as any[];

    const weightOf = (list: any[], phrase: string) =>
      list.find((k) => k.keyphrase === phrase)?.weight ?? 0;

    expect(weightOf(biased, 'machine learning')).toBeGreaterThan(
      weightOf(plain, 'machine learning')
    );
  });

  it('returns sentences and ranked output when ranking is enabled', async () => {
    const result = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      optionSkipRanking: false,
    })) as any;

    expect(Array.isArray(result.sentences)).toBe(true);
    expect(result.sentences.length).toBeGreaterThan(0);
    expect(Array.isArray(result.topSentences)).toBe(true);
    expect(Array.isArray(result.keyphrases)).toBe(true);
  });

  it('serialises sentence indices to a comma-separated string in ranked output', async () => {
    const result = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      optionSkipRanking: false,
    })) as any;

    for (const keyphrase of result.keyphrases) {
      expect(typeof keyphrase.sentences).toBe('string');
    }
  });

  it('honours limitTopKeyphrases in ranked output', async () => {
    const result = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      optionSkipRanking: false,
      limitTopKeyphrases: 1,
    })) as any;

    expect(result.keyphrases.length).toBeLessThanOrEqual(1);
  });
});

describe('extractSEEKTOPIC LLM path', () => {
  beforeEach(() => {
    writeLanguageResponse.mockResolvedValue({
      content: '"machine learning", quantum computing , ',
    });
  });

  it('returns the LLM topics directly in the fast path', async () => {
    const keyphrases = (await extractSEEKTOPIC(DOC, { phrasesModel })) as any[];

    expect(keyphrases.map((k) => k.keyphrase)).toEqual([
      'machine learning',
      'quantum computing',
    ]);
    expect(keyphrases[0].words).toBe(2);
    expect(keyphrases[0].weight).toBe(100);
  });

  it('passes the provider and key through getEnv', async () => {
    await extractSEEKTOPIC(DOC, {
      phrasesModel,
      getEnv: (key: string) =>
        ({ LLM_PROVIDER: 'anthropic', LLM_API_KEY: 'sk-test' })[key],
    });

    expect(writeLanguageResponse).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'anthropic', apiKey: 'sk-test' })
    );
  });

  it('defaults the provider and falls back to a dummy key', async () => {
    await extractSEEKTOPIC(DOC, { phrasesModel });

    expect(writeLanguageResponse).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', apiKey: 'dummy' })
    );
  });

  it('ignores an LLM response that reports an error', async () => {
    writeLanguageResponse.mockResolvedValue({ content: 'ignored', error: 'rate limited' });

    const keyphrases = (await extractSEEKTOPIC(DOC, { phrasesModel })) as any[];

    expect(keyphrases.map((k) => k.keyphrase)).not.toContain('ignored');
  });

  it('ranks sentences per topic when ranking is enabled', async () => {
    weighRelevanceConceptVectorMultiple.mockResolvedValue({
      'machine learning': [
        { content: 'Machine learning powers many modern systems.', similarity: 0.9 },
      ],
      'quantum computing': [
        { content: 'Quantum computing remains largely experimental for now.', similarity: 0.8 },
      ],
    });

    const result = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      optionSkipRanking: false,
    })) as any;

    expect(result.keyphrases.map((k: any) => k.keyphrase)).toEqual([
      'machine learning',
      'quantum computing',
    ]);
    expect(result.keyphrases[0].topSentences[0].similarity).toBe(0.9);
    expect(result.topSentences[0].weight).toBe(0.9);
  });

  it('deduplicates a sentence shared by two topics', async () => {
    const shared = 'Machine learning powers many modern systems.';
    weighRelevanceConceptVectorMultiple.mockResolvedValue({
      'machine learning': [{ content: shared, similarity: 0.9 }],
      'quantum computing': [{ content: shared, similarity: 0.7 }],
    });

    const result = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      optionSkipRanking: false,
    })) as any;

    expect(result.topSentences).toHaveLength(1);
  });

  it('tolerates a topic with no relevant sentences', async () => {
    weighRelevanceConceptVectorMultiple.mockResolvedValue({});

    const result = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      optionSkipRanking: false,
    })) as any;

    expect(result.topSentences).toEqual([]);
    expect(result.keyphrases).toHaveLength(2);
  });

  it('honours limitTopSentences per topic', async () => {
    weighRelevanceConceptVectorMultiple.mockResolvedValue({
      'machine learning': [
        { content: 'Machine learning is a broad field of study today.', similarity: 0.9 },
        { content: 'Machine learning powers many modern systems.', similarity: 0.8 },
      ],
      'quantum computing': [],
    });

    const result = (await extractSEEKTOPIC(DOC, {
      phrasesModel,
      optionSkipRanking: false,
      limitTopSentences: 1,
    })) as any;

    expect(result.keyphrases[0].topSentences).toHaveLength(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  buildKeywordPrompt,
  cleanKeyword,
  generateKeywordPlan,
  heuristicKeywordPlan,
  parseKeywordPlan,
} from '../src/keywords';

const brief = {
  advertiser: 'PageTurner Books',
  description: 'Used books on logo design and branding. Logo design guides for students.',
  products: ['Logo Design Love'],
};

describe('buildKeywordPrompt', () => {
  it('includes the brief and asks for JSON', () => {
    const { system, user } = buildKeywordPrompt({ ...brief, existingKeywords: ['branding'] });
    expect(system).toMatch(/JSON only/);
    expect(user).toContain('PageTurner Books');
    expect(user).toContain('suggest different ones): branding');
  });
});

describe('cleanKeyword', () => {
  it('normalises and rejects sentences', () => {
    expect(cleanKeyword('  Logo Design! ')).toBe('logo design');
    expect(cleanKeyword('one two three four five six seven')).toBe('');
    expect(cleanKeyword(42)).toBe('');
  });
});

describe('parseKeywordPlan', () => {
  it('reads a fenced reply with chatter', () => {
    const plan = parseKeywordPlan(
      'Sure!\n```json\n{"keywords":[{"keyword":"Logo Design","reason":"core"},"branding books","logo design"],"negativeKeywords":["Free Download"],"followUpTopic":"logo design basics"}\n```'
    );
    expect(plan).toEqual({
      keywords: [{ keyword: 'logo design', reason: 'core' }, { keyword: 'branding books' }],
      negativeKeywords: ['free download'],
      followUpTopic: 'logo design basics',
      source: 'llm',
    });
  });

  it('drops keywords the advertiser already has', () => {
    const plan = parseKeywordPlan('{"keywords":["a b","c d"]}', ['A B']);
    expect(plan?.keywords.map((k) => k.keyword)).toEqual(['c d']);
  });

  it('returns null for anything that is not the asked-for JSON', () => {
    expect(parseKeywordPlan('no json here')).toBeNull();
    expect(parseKeywordPlan('{"keywords": "nope"}')).toBeNull();
    expect(parseKeywordPlan('{"keywords": []}')).toBeNull();
    expect(parseKeywordPlan('{broken')).toBeNull();
  });
});

describe('heuristicKeywordPlan', () => {
  it('surfaces repeated phrases and leaves out the brand', () => {
    const plan = heuristicKeywordPlan(brief);
    const words = plan.keywords.map((k) => k.keyword);
    expect(plan.source).toBe('heuristic');
    expect(words[0]).toBe('logo design');
    expect(words.some((w) => w.includes('pageturner'))).toBe(false);
    expect(words.every((w) => !/^(and|on|for) |( and| on| for)$/.test(w))).toBe(true);
    expect(words.some((w) => / and /.test(w))).toBe(false);
  });
});

describe('generateKeywordPlan', () => {
  it('uses the model when it answers well', async () => {
    const complete = vi.fn(async () => '{"keywords":["logo books"]}');
    const plan = await generateKeywordPlan(brief, complete);
    expect(plan.source).toBe('llm');
    expect(complete).toHaveBeenCalledOnce();
  });

  it('falls back to the heuristic when the model fails or rambles', async () => {
    expect((await generateKeywordPlan(brief, async () => { throw new Error('down'); })).source).toBe('heuristic');
    expect((await generateKeywordPlan(brief, async () => 'I cannot help')).source).toBe('heuristic');
    expect((await generateKeywordPlan(brief)).source).toBe('heuristic');
  });
});

describe('heuristicKeywordPlan single words', () => {
  it('keeps a lone word only when the brief repeats it', () => {
    const words = heuristicKeywordPlan({
      advertiser: 'Trailhead',
      description: 'Trail running shoes for beginners, hydration vests and trail running guides.',
    }).keywords.map((k) => k.keyword);
    expect(words).toContain('trail running');
    expect(words).toContain('trail');
    expect(words).not.toContain('beginners');
  });
});

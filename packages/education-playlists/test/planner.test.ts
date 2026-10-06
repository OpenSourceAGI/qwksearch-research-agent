import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_FOLLOW_UPS, extractJson, normalizePlanRequest, planPlaylist, readPreferences, suggestFollowUps } from '../src/planner';
import { buildQuizPrompt, parseQuiz } from '../src/quiz';
import { handleEducationPlaylistsRequest } from '../src/server';
import { catalogItems, getDefaultCatalog } from '../src/catalog';

describe('follow-up questions', () => {
  it('falls back to the standard questions without a model', async () => {
    expect(await suggestFollowUps('machine learning')).toEqual({ questions: DEFAULT_FOLLOW_UPS, mode: 'offline' });
  });

  it("uses the model's questions when it answers with valid JSON", async () => {
    const generate = vi.fn().mockResolvedValue('Sure!\n```json\n{"questions":[{"question":"Do you know Python?","options":["Yes","No"]}]}\n```');
    const result = await suggestFollowUps('machine learning', { generate });
    expect(result.mode).toBe('llm');
    expect(result.questions).toEqual([{ id: 'q1', question: 'Do you know Python?', options: ['Yes', 'No'] }]);
    expect(generate.mock.calls[0][0].prompt).toContain('machine learning');
  });

  it('falls back when the model fails or rambles', async () => {
    expect((await suggestFollowUps('x', { generate: vi.fn().mockRejectedValue(new Error('down')) })).mode).toBe('offline');
    expect((await suggestFollowUps('x', { generate: vi.fn().mockResolvedValue('no json here') })).mode).toBe('offline');
  });
});

describe('normalizePlanRequest', () => {
  it('requires a goal and caps everything else', () => {
    expect(() => normalizePlanRequest({ goal: '  ' })).toThrow();
    const request = normalizePlanRequest({
      goal: 'x'.repeat(1000),
      answers: [...Array(20)].map(() => ({ question: 'q', answer: 'a' })).concat([{ question: 'q', answer: '' } as never]),
    });
    expect(request.goal).toHaveLength(300);
    expect(request.answers).toHaveLength(8);
  });
});

describe('readPreferences', () => {
  it('reads level, format and weekly hours from the answers', () => {
    expect(readPreferences([{ question: 'level', answer: 'New to this' }, { question: 'time', answer: '5 hours' }, { question: 'format', answer: 'Lecture videos' }])).toEqual({
      maxLevel: 'intermediate',
      preferAdvanced: false,
      format: 'videos',
      minutesPerWeek: 300,
    });
    expect(readPreferences([{ question: 'q', answer: 'A mix' }]).format).toBe('mix');
  });
});

describe('planPlaylist', () => {
  it('plans from the catalog offline, honouring level and format', async () => {
    const result = await planPlaylist({
      goal: 'algorithms and machine learning',
      answers: [
        { question: 'Where are you starting from?', answer: 'New to this' },
        { question: 'What do you learn best from?', answer: 'Lecture videos' },
      ],
    });
    expect(result.mode).toBe('offline');
    expect(result.playlist.visibility).toBe('private');
    expect(result.playlist.items.length).toBeGreaterThan(0);
    for (const item of result.playlist.items) {
      expect(item.kind).toBe('video_playlist');
      expect(item.level).not.toBe('advanced');
    }
    expect(result.playlist.plannedFrom?.goal).toBe('algorithms and machine learning');
  });

  it("leads with the courses the model named and adds the model's searches", async () => {
    const generate = vi.fn().mockResolvedValue('{"title":"ML path","searches":["probability","linear algebra"],"courses":["6.036"]}');
    const result = await planPlaylist({ goal: 'ml' }, { generate });
    expect(result.mode).toBe('llm');
    expect(result.playlist.title).toBe('ML path');
    expect(result.searches).toEqual(['probability', 'linear algebra']);
    const numbers = result.playlist.items.map((item) => item.courseNumber);
    expect(numbers).toContain('6.036');
    expect(numbers).toContain('18.06');
  });

  it('adds sanitized web results with their provenance, skipping unsafe ones', async () => {
    const search = vi.fn().mockResolvedValue([
      { title: 'Neural nets lecture', url: 'https://www.youtube.com/watch?v=abc' },
      { title: 'Evil', url: 'javascript:alert(1)' },
    ]);
    const result = await planPlaylist({ goal: 'neural networks' }, { search });
    const web = result.playlist.items.filter((item) => item.provenance.method === 'llm_search');
    expect(web).toHaveLength(1);
    expect(web[0]).toMatchObject({ kind: 'video', provenance: { provider: 'youtube', verified: false } });
  });

  it('caps a playlist at 12 items', async () => {
    const result = await planPlaylist({ goal: 'introduction principles theory systems calculus physics biology' });
    expect(result.playlist.items.length).toBeLessThanOrEqual(12);
  });
});

describe('extractJson', () => {
  it('pulls the object out of surrounding text', () => {
    expect(extractJson('here: {"a":1} done')).toEqual({ a: 1 });
    expect(extractJson('nothing')).toBeNull();
  });
});

describe('server handler', () => {
  const post = (path: string, body: unknown) =>
    handleEducationPlaylistsRequest(new Request(`http://x/api/learn${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));

  it('answers questions, plans, and serves the catalog', async () => {
    const questions = await (await post('/questions', { goal: 'physics' })).json();
    expect(questions.questions).toHaveLength(DEFAULT_FOLLOW_UPS.length);
    const plan = await (await post('', { goal: 'physics' })).json();
    expect(plan.playlist.items.length).toBeGreaterThan(0);
    const catalog = await (await handleEducationPlaylistsRequest(new Request('http://x/api/learn/catalog'))).json();
    expect(catalog.playlists.length).toBe(getDefaultCatalog().playlists.length);
  });

  it('rejects bad input', async () => {
    expect((await post('', { goal: '' })).status).toBe(400);
    expect((await post('', 'not json')).status).toBe(400);
    expect((await post('', { goal: 'x'.repeat(10_000) })).status).toBe(413);
    expect((await handleEducationPlaylistsRequest(new Request('http://x/api/learn', { method: 'PUT' }))).status).toBe(405);
  });
});

describe('quiz hook', () => {
  const item = catalogItems(getDefaultCatalog())[0];

  it('builds a grounded quiz prompt', () => {
    expect(buildQuizPrompt(item, 3)).toContain('3-question');
    expect(buildQuizPrompt(item)).toContain('(MIT 6.0001)');
  });

  it('keeps only well-formed questions', () => {
    const quiz = parseQuiz(item, { questions: [{ prompt: 'q', choices: ['a', 'b'], answerIndex: 1 }, { prompt: 'bad', choices: ['a'], answerIndex: 0 }] }, 'notebooklm');
    expect(quiz?.questions).toHaveLength(1);
    expect(parseQuiz(item, { questions: [] }, 'llm')).toBeNull();
  });
});

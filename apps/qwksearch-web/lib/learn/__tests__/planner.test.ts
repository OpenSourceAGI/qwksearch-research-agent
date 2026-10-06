import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateText = vi.fn();
const mockLoadChatModel = vi.fn();
const mockSearch = vi.fn();
const mockRateLimit = vi.fn();

vi.mock('ai', () => ({ generateText: (...args: unknown[]) => mockGenerateText(...args) }));
vi.mock('chat-agent-toolkit/models/registry', () => ({
  default: class {
    loadChatModel(...args: unknown[]) {
      return mockLoadChatModel(...args);
    }
  },
}));
vi.mock('search-web-api/search/public-searxng', () => ({ searchSearxng: (...args: unknown[]) => mockSearch(...args) }));
vi.mock('@/lib/rate-limit/guestRateLimiter', () => ({ checkGuestRateLimit: (...args: unknown[]) => mockRateLimit(...args) }));

import { serveEducationPlaylists } from '../planner';

const post = (path: string, body: unknown) =>
  new Request(`http://localhost/api/learn${path}`, {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadChatModel.mockResolvedValue({ id: 'fake-model' });
  mockRateLimit.mockReturnValue({ allowed: true });
  mockSearch.mockResolvedValue({ results: [], suggestions: [] });
});

describe('/api/learn', () => {
  it("asks the default model for follow-up questions, metered by the visitor's IP", async () => {
    mockGenerateText.mockResolvedValue({ text: '{"questions":[{"question":"Know calculus?","options":["Yes","No"]}]}' });

    const body = await (await serveEducationPlaylists(post('/questions', { goal: 'quantum physics' }))).json();

    expect(body).toEqual({ questions: [{ id: 'q1', question: 'Know calculus?', options: ['Yes', 'No'] }], mode: 'llm' });
    expect(mockRateLimit).toHaveBeenCalledWith('203.0.113.9');
    expect(mockLoadChatModel).toHaveBeenCalledWith();
  });

  it("plans with the model's searches and adds web video results", async () => {
    mockGenerateText.mockResolvedValue({ text: '{"title":"Quantum path","searches":["quantum physics"],"courses":["8.04"]}' });
    mockSearch.mockResolvedValue({ results: [{ title: 'Quantum lecture', url: 'https://www.youtube.com/watch?v=q' }], suggestions: [] });

    const body = await (await serveEducationPlaylists(post('', { goal: 'quantum physics' }))).json();

    expect(body.mode).toBe('llm');
    expect(body.playlist.title).toBe('Quantum path');
    expect(mockSearch).toHaveBeenCalledWith('quantum physics free course lecture videos', { categories: ['videos'] });
    expect(body.playlist.items.map((item: { courseNumber?: string }) => item.courseNumber)).toContain('8.04');
    expect(body.playlist.items.some((item: { url: string }) => item.url === 'https://www.youtube.com/watch?v=q')).toBe(true);
  });

  it('plans offline instead of failing once the visitor is over the limit', async () => {
    mockRateLimit.mockReturnValue({ allowed: false });

    const res = await serveEducationPlaylists(post('', { goal: 'linear algebra' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mode).toBe('offline');
    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('plans offline when no model is configured', async () => {
    mockLoadChatModel.mockRejectedValue(new Error('No model providers configured.'));

    const body = await (await serveEducationPlaylists(post('', { goal: 'linear algebra' }))).json();

    expect(body.mode).toBe('offline');
    expect(body.playlist.items.length).toBeGreaterThan(0);
  });

  it('refuses a request with no goal', async () => {
    expect((await serveEducationPlaylists(post('', {}))).status).toBe(400);
  });
});

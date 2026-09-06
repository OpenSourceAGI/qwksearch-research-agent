// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/database/core/db-adaptor', () => ({ getServerDB: vi.fn(async () => ({})) }));
vi.mock('@/server/services/aiGeneration', () => ({ AiGenerationService: vi.fn() }));
vi.mock('../../qwksearch/session', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  requireUserId: vi.fn(async () => 'user_1'),
  unauthorizedResponse: () => Response.json({ message: 'Authentication required' }, { status: 401 }),
}));

const { parseQuestionList } = await import('./articleAi');

describe('parseQuestionList', () => {
  it('cleans numbering and bullets and drops short lines', () => {
    const raw = '1. What is the main claim of the article?\n- Why?\n* How does the author support the argument?\n\n3) short';
    expect(parseQuestionList(raw, 5)).toEqual([
      'What is the main claim of the article?',
      'How does the author support the argument?',
    ]);
  });

  it('accepts arrays and caps the result', () => {
    const list = ['Question number one here?', 'Question number two here?', 'Question number three here?'];
    expect(parseQuestionList(list, 2)).toHaveLength(2);
  });
});

/**
 * @fileoverview Tests for the follow-up-suggestions LLM generator.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateTextMock = vi.fn();

vi.mock('ai', () => ({
  generateText: (args: unknown) => generateTextMock(args),
}));

import generateSuggestions from '../src/tools/search/suggestionGeneratorAgent';
import type { ChatTurnMessage } from '../src/tools/search/meta-search-types';

beforeEach(() => {
  generateTextMock.mockReset();
});

const fakeLlm = { id: 'fake-model' } as any;

describe('generateSuggestions', () => {
  it('returns the parsed suggestions from a well-formed <suggestions> response', async () => {
    generateTextMock.mockResolvedValue({
      text: `<suggestions>\nTell me more about SpaceX\nWho is the CEO of SpaceX?\n</suggestions>`,
    });

    const chatHistory: ChatTurnMessage[] = [
      { role: 'user', content: 'Tell me about SpaceX' },
      { role: 'assistant', content: 'SpaceX is a rocket company.' },
    ];

    const result = await generateSuggestions({ chat_history: chatHistory }, fakeLlm);

    expect(result).toEqual([
      'Tell me more about SpaceX',
      'Who is the CEO of SpaceX?',
    ]);
  });

  it('returns an empty array when the response has no <suggestions> tags', async () => {
    generateTextMock.mockResolvedValue({ text: 'sorry, I have nothing to suggest' });

    const result = await generateSuggestions(
      { chat_history: [{ role: 'user', content: 'hi' }] },
      fakeLlm,
    );

    expect(result).toEqual([]);
  });

  it('builds the prompt from the formatted chat history and passes the LLM through', async () => {
    generateTextMock.mockResolvedValue({ text: '<suggestions>\nfoo\n</suggestions>' });

    await generateSuggestions(
      {
        chat_history: [
          { role: 'user', content: 'What is SpaceX?' },
          { role: 'assistant', content: 'A rocket company.' },
        ],
      },
      fakeLlm,
    );

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const arg = generateTextMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.model).toBe(fakeLlm);
    expect(arg.temperature).toBe(0);
    expect(arg.prompt).toContain('User: What is SpaceX?');
    expect(arg.prompt).toContain('AI: A rocket company.');
  });

  it('respects a custom maxQuestions in the generated prompt', async () => {
    generateTextMock.mockResolvedValue({ text: '<suggestions>\nfoo\n</suggestions>' });

    await generateSuggestions(
      { chat_history: [{ role: 'user', content: 'hi' }], maxQuestions: 2 },
      fakeLlm,
    );

    const arg = generateTextMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.prompt).toContain('generate 2 suggestions');
  });
});

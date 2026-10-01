/**
 * @fileoverview Tests for the user-editable query-expansion prompt override.
 *
 * The prompt that rephrases a chat message into a standalone search query is
 * configured per focus mode, but Settings → Search Settings lets a user replace
 * it. These tests pin the precedence: a non-blank override wins, anything blank
 * falls back to the focus mode's built-in prompt.
 *
 * Query expansion itself is opt-in, so every run here switches it on; the
 * default (off) path is covered in metaSearchAgentFastPath.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateTextMock = vi.fn();

vi.mock('ai', () => ({
  generateText: (args: unknown) => generateTextMock(args),
  streamText: () => ({ textStream: (async function* () {})() }),
}));

import MetaSearchAgent from '../src/tools/search/metaSearchAgent';

const BUILT_IN = 'BUILT-IN rephraser prompt';

const fakeLlm = { id: 'fake-model' } as any;

/**
 * Runs the pipeline far enough to capture the retriever's `generateText` call,
 * then waits for the emitter to settle. The retriever answers `not_needed` so
 * no search or answer streaming is attempted.
 */
const runWithOverride = async (queryExpansionPrompt?: string) => {
  const agent = new MetaSearchAgent({
    activeEngines: [],
    queryGeneratorPrompt: BUILT_IN,
    queryGeneratorFewShots: [],
    responsePrompt: 'answer prompt',
    rerank: false,
    rerankThreshold: 0,
    searchWeb: true,
  } as any);

  const emitter = await agent.searchAndAnswer(
    'what is spacex',
    [],
    fakeLlm,
    'speed',
    [],
    '',
    'general',
    false,
    0,
    queryExpansionPrompt,
    true,
  );

  await new Promise<void>((resolve) => {
    emitter.on('end', () => resolve());
    emitter.on('error', () => resolve());
  });

  return generateTextMock.mock.calls[0]?.[0] as Record<string, unknown>;
};

beforeEach(() => {
  generateTextMock.mockReset();
  generateTextMock.mockResolvedValue({
    text: '<question>\nnot_needed\n</question>',
  });
});

describe('MetaSearchAgent query-expansion prompt', () => {
  it('uses the focus mode prompt when no override is supplied', async () => {
    const arg = await runWithOverride(undefined);
    expect(arg.system).toBe(BUILT_IN);
  });

  it('uses the user-supplied override when it has content', async () => {
    const arg = await runWithOverride('MY custom rephraser');
    expect(arg.system).toBe('MY custom rephraser');
  });

  it('falls back to the focus mode prompt for a blank override', async () => {
    const arg = await runWithOverride('   \n  ');
    expect(arg.system).toBe(BUILT_IN);
  });
});

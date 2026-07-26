/**
 * @fileoverview End-to-end test: an uploaded file's extracted content must
 * reach the LLM when a chat request carries `fileIds`.
 *
 * This exercises the real `MetaSearchAgent.searchAndAnswer` pipeline (the same
 * path the `/api/agent/chat` handler drives) with the `ai` SDK mocked, and
 * asserts that the system prompt handed to `streamText` contains the extracted
 * upload content resolved through the registered upload loader.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Captures the arguments the pipeline passes to the mocked `ai` SDK. */
const streamTextCalls: Array<{ system?: string; messages?: unknown }> = [];

vi.mock('ai', () => ({
  // Query rephrasing step (only used when searchWeb is enabled).
  generateText: vi.fn(async () => ({ text: '<question>\nnot_needed\n</question>' })),
  // Answer streaming step — record the system prompt so we can assert the
  // uploaded file content was folded into the LLM context.
  streamText: vi.fn((opts: { system?: string; messages?: unknown }) => {
    streamTextCalls.push({ system: opts.system, messages: opts.messages });
    return {
      textStream: (async function* () {
        yield 'Here is the analysis.';
      })(),
    };
  }),
}));

import MetaSearchAgent from '../src/tools/search/metaSearchAgent';
import { registerUploadFileLoader } from '../src/tools/search/doc-utils';

/** Runs the agent and resolves with the concatenated response text. */
function runAgent(agent: MetaSearchAgent, fileIds: string[], message: string) {
  return new Promise<{ response: string; sources: unknown[] }>(
    async (resolve, reject) => {
      const emitter = await agent.searchAndAnswer(
        message,
        [],
        {} as never,
        'balanced',
        fileIds,
        '',
      );
      let response = '';
      let sources: unknown[] = [];
      emitter.on('data', (data: string) => {
        const parsed = JSON.parse(data);
        if (parsed.type === 'response') response += parsed.data;
        if (parsed.type === 'sources') sources = parsed.data;
      });
      emitter.on('end', () => resolve({ response, sources }));
      emitter.on('error', (e: string) => reject(new Error(e)));
    },
  );
}

describe('MetaSearchAgent: uploaded files reach the LLM', () => {
  beforeEach(() => {
    streamTextCalls.length = 0;
  });

  it('passes extracted upload content into the answer prompt (no web search)', async () => {
    registerUploadFileLoader(async (fileId) => ({
      title: 'Quarterly Report',
      content: `EXTRACTED_${fileId}_CONTENT`,
    }));

    const agent = new MetaSearchAgent({
      searchWeb: false,
      rerank: true,
      rerankThreshold: 0,
      queryGeneratorPrompt: '',
      queryGeneratorFewShots: [],
      responsePrompt: 'System instructions: {systemInstructions}\nContext:\n{context}',
      activeEngines: [],
    });

    const { response, sources } = await runAgent(
      agent,
      ['file-xyz'],
      'Analyze the uploaded file(s) and summarize the key points.',
    );

    // The pipeline streamed the mocked answer back to the client.
    expect(response).toBe('Here is the analysis.');

    // The uploaded file was surfaced as a source (url "File").
    expect(sources).toEqual([
      expect.objectContaining({
        pageContent: 'EXTRACTED_file-xyz_CONTENT',
        metadata: expect.objectContaining({ title: 'Quarterly Report', url: 'File' }),
      }),
    ]);

    // Most importantly: the extracted content is present in the system prompt
    // handed to the LLM, i.e. it actually reaches the model.
    expect(streamTextCalls).toHaveLength(1);
    expect(streamTextCalls[0].system).toContain('EXTRACTED_file-xyz_CONTENT');
  });

  it('includes upload content even when the effective query is "summarize"', async () => {
    registerUploadFileLoader(async () => ({
      title: 'Notes',
      content: 'SUMMARIZE_ME_FILE_BODY',
    }));

    const agent = new MetaSearchAgent({
      searchWeb: false,
      rerank: true,
      rerankThreshold: 0,
      queryGeneratorPrompt: '',
      queryGeneratorFewShots: [],
      responsePrompt: 'Context:\n{context}',
      activeEngines: [],
    });

    await runAgent(agent, ['note-1'], 'summarize');

    expect(streamTextCalls).toHaveLength(1);
    expect(streamTextCalls[0].system).toContain('SUMMARIZE_ME_FILE_BODY');
  });
});

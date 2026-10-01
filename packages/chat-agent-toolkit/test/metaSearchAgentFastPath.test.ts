/**
 * @fileoverview Tests for the default search path: no query expansion, and the
 * result list sent before anything slow happens.
 *
 * Rephrasing the message with the LLM is a whole model round trip before the
 * search can start, so it is off unless the user switches it on. With it off,
 * the message goes straight to the search, the results (titles + snippets)
 * reach the client as `sources` immediately, and the answer prompt is built
 * from those same titles and snippets.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateTextMock = vi.fn();
const streamTextMock = vi.fn();

vi.mock('ai', () => ({
  generateText: (args: unknown) => generateTextMock(args),
  streamText: (args: unknown) => streamTextMock(args),
}));

import MetaSearchAgent from '../src/tools/search/metaSearchAgent';

const fakeLlm = { id: 'fake-model' } as any;

const SEARCH_RESULTS = {
  results: [
    { title: 'SpaceX - Wikipedia', url: 'https://en.wikipedia.org/wiki/SpaceX', content: 'SpaceX is an American spacecraft manufacturer.' },
    { title: 'SpaceX official site', url: 'https://www.spacex.com', content: 'SpaceX designs, manufactures and launches rockets.' },
  ],
  suggestions: [],
};

type Event = { type: string; data?: unknown };

/** Runs the agent to completion and returns every event in order. */
const run = async (
  agent: MetaSearchAgent,
  options: { message?: string; expansion?: boolean; extraction?: boolean } = {},
) => {
  const emitter = await agent.searchAndAnswer(
    options.message ?? 'what is spacex',
    [],
    fakeLlm,
    'speed',
    [],
    '',
    'general',
    options.extraction ?? false,
    0,
    undefined,
    options.expansion,
  );

  const events: Event[] = [];
  await new Promise<void>((resolve, reject) => {
    emitter.on('data', (raw: string) => events.push(JSON.parse(raw)));
    emitter.on('end', () => resolve());
    emitter.on('error', (e: string) => reject(new Error(e)));
  });
  return events;
};

const makeAgent = (overrides: Record<string, unknown> = {}) => {
  const searchSearxng = vi.fn(async () => SEARCH_RESULTS);
  const agent = new MetaSearchAgent({
    activeEngines: [],
    queryGeneratorPrompt: 'rephraser prompt',
    queryGeneratorFewShots: [],
    responsePrompt: 'Context:\n{context}',
    rerank: false,
    rerankThreshold: 0,
    searchWeb: true,
    searchSearxng,
    ...overrides,
  } as any);
  return { agent, searchSearxng };
};

beforeEach(() => {
  generateTextMock.mockReset();
  generateTextMock.mockResolvedValue({ text: '<question>\nspacex company\n</question>' });
  streamTextMock.mockReset();
  streamTextMock.mockImplementation(() => ({
    textStream: (async function* () {
      yield 'SpaceX builds rockets[1].';
    })(),
  }));
});

describe('MetaSearchAgent default search path', () => {
  it('searches the message as typed without an LLM rephrase by default', async () => {
    const { agent, searchSearxng } = makeAgent();
    await run(agent);

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(searchSearxng).toHaveBeenCalledTimes(1);
    expect(searchSearxng.mock.calls[0][0]).toBe('what is spacex');
  });

  it('puts the result titles and snippets into the answer prompt', async () => {
    const { agent } = makeAgent();
    await run(agent);

    const system = streamTextMock.mock.calls[0][0].system as string;
    expect(system).toContain('1. SpaceX - Wikipedia SpaceX is an American spacecraft manufacturer.');
    expect(system).toContain('2. SpaceX official site');
  });

  it('sends the sources before any answer text', async () => {
    const { agent } = makeAgent();
    const events = await run(agent);

    const types = events.map((e) => e.type);
    expect(types.indexOf('sources')).toBeGreaterThan(-1);
    expect(types.indexOf('sources')).toBeLessThan(types.indexOf('response'));
    const sources = events.find((e) => e.type === 'sources')!.data as any[];
    expect(sources.map((s) => s.metadata.title)).toEqual([
      'SpaceX - Wikipedia',
      'SpaceX official site',
    ]);
  });

  it('sends the sources before page extraction starts, and answers from the extracted text', async () => {
    let releaseScrape!: () => void;
    const scrapeGate = new Promise<void>((resolve) => { releaseScrape = resolve; });
    const order: string[] = [];
    const scrapeURL = vi.fn(async (url: string) => {
      order.push(`scrape:${url}`);
      await scrapeGate;
      return `<html><body>${'Full page text about SpaceX launches. '.repeat(10)}</body></html>`;
    });
    const { agent } = makeAgent({ scrapeURL });

    const emitter = await agent.searchAndAnswer(
      'what is spacex', [], fakeLlm, 'speed', [], '', 'general', true, 0,
    );
    const done = new Promise<void>((resolve, reject) => {
      emitter.on('data', (raw: string) => {
        const event = JSON.parse(raw);
        if (event.type === 'sources') {
          order.push('sources');
          releaseScrape();
        }
      });
      emitter.on('end', () => resolve());
      emitter.on('error', (e: string) => reject(new Error(e)));
    });
    await done;

    expect(order[0]).toBe('sources');
    expect(scrapeURL).toHaveBeenCalled();
    const system = streamTextMock.mock.calls[0][0].system as string;
    expect(system).toContain('Full page text about SpaceX launches.');
  });

  it('still rephrases with the LLM when query expansion is switched on', async () => {
    const { agent, searchSearxng } = makeAgent();
    await run(agent, { expansion: true });

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(searchSearxng.mock.calls[0][0]).toBe('spacex company');
  });

  it('summarizes pasted links without the rephrase when a link loader is configured', async () => {
    const getDocumentsFromLinks = vi.fn(async () => []);
    const { agent, searchSearxng } = makeAgent({ getDocumentsFromLinks });
    await run(agent, { message: 'summarize https://example.com/post please' });

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(getDocumentsFromLinks).toHaveBeenCalledWith({ links: ['https://example.com/post'] });
    expect(searchSearxng).not.toHaveBeenCalled();
  });
});

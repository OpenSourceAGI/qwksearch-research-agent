import { describe, it, expect, vi } from 'vitest';
import type { ModelMessage } from 'ai';

vi.mock('search-web-api/search/search-query-executor.js', () => ({
  Search: vi.fn(function () {
    return { search: vi.fn().mockResolvedValue([]) };
  }),
}));

import { LobeChatEngine, type LobeChatEngineConfig } from '../chat-engine';
import { SearchSourcesService } from '../search-sources';
import type { CallLlm, LlmStreamEvent } from '../agent-runtime';

const llm = {} as any;

function scripted(steps: LlmStreamEvent[][]) {
  const calls: Array<{ messages: ModelMessage[]; tools?: Record<string, unknown> }> = [];
  const callLlm: CallLlm = async function* (params) {
    calls.push({ messages: params.messages, tools: params.tools as any });
    for (const event of steps[calls.length - 1] ?? []) yield event;
  };
  return { callLlm, calls };
}

function backend(resultsByQuery: Record<string, Array<{ title: string; url: string; content?: string }>>) {
  return {
    search: vi.fn(async (query: string) =>
      (resultsByQuery[query] ?? []).map((r) => ({ ...r, engines: ['google'], positions: [1], score: 1, priority: 'normal' })),
    ),
  };
}

/** Runs the engine and collects every event it emits. */
async function collect(engine: LobeChatEngine, message: string, extra: { fileIds?: string[]; mode?: 'speed' | 'balanced' | 'quality'; sourceExtraction?: boolean } = {}) {
  const emitter = await engine.searchAndAnswer(
    message,
    [],
    llm,
    extra.mode ?? 'balanced',
    extra.fileIds ?? [],
    'Be brief.',
    'general',
    extra.sourceExtraction ?? false,
  );
  const events: any[] = [];
  await new Promise<void>((resolve) => {
    emitter.on('data', (data: string) => events.push(JSON.parse(data)));
    emitter.once('end', () => {
      events.push({ type: 'end' });
      resolve();
    });
    emitter.once('error', (data: string) => {
      events.push({ type: 'error', ...JSON.parse(data) });
      resolve();
    });
  });
  return events;
}

function makeEngine(config: Partial<LobeChatEngineConfig> & { search: ReturnType<typeof backend> }) {
  const { search, ...rest } = config;
  return new LobeChatEngine({
    label: 'Web',
    prefetchSearch: true,
    loadUploads: async () => [],
    createSearchService: (options) => new SearchSourcesService({ ...options, backend: search }),
    ...rest,
  });
}

describe('LobeChatEngine', () => {
  it('searches the message first, emits numbered sources, then streams the answer', async () => {
    const search = backend({
      'what is rust': [
        { title: 'Rust', url: 'https://rust-lang.org', content: 'A language' },
        { title: 'Wiki', url: 'https://en.wikipedia.org/wiki/Rust', content: 'Rust is...' },
      ],
    });
    const { callLlm, calls } = scripted([[{ type: 'text', text: 'Rust is a language[1].' }]]);

    const events = await collect(makeEngine({ search, callLlm }), 'what is rust');
    const types = events.map((e) => e.type);

    expect(types).toEqual(['searching', 'searching', 'sources', 'response', 'end']);
    const sources = events.find((e) => e.type === 'sources').data;
    expect(sources.map((s: any) => s.metadata.url)).toEqual(['https://rust-lang.org', 'https://en.wikipedia.org/wiki/Rust']);
    expect(events.find((e) => e.type === 'response').data).toBe('Rust is a language[1].');

    // The prefetched search reaches the model as its own tool turn, with index numbers.
    const sent = calls[0].messages;
    expect(sent[0].role).toBe('system');
    expect(String(sent[0].content)).toContain('Be brief.');
    const toolTurn = sent.find((m) => m.role === 'tool') as any;
    expect(toolTurn.content[0].output.value).toContain('index="1" title="Rust"');
    expect(search.search).toHaveBeenCalledWith('what is rust', 1, undefined, ['general']);
  });

  it('lets the agent search again and numbers new sources after the first ones', async () => {
    const search = backend({
      q: [{ title: 'A', url: 'https://a.example' }],
      'better query': [
        { title: 'A', url: 'https://a.example' },
        { title: 'B', url: 'https://b.example' },
      ],
    });
    const { callLlm, calls } = scripted([
      [{ type: 'tool-call', toolCallId: 'c1', toolName: 'search', input: { query: 'better query', searchCategories: ['science'] } }],
      [{ type: 'text', text: 'Answer[2]' }],
    ]);

    const events = await collect(makeEngine({ search, callLlm }), 'q');
    const sources = events.find((e) => e.type === 'sources').data;
    expect(sources.map((s: any) => s.metadata.url)).toEqual(['https://a.example', 'https://b.example']);
    expect(search.search).toHaveBeenLastCalledWith('better query', 1, undefined, ['academic']);
    const lastTool = calls[1].messages.filter((m) => m.role === 'tool').at(-1) as any;
    expect(lastTool.content[0].output.value).toContain('index="2" title="B"');
  });

  it('reads URLs in the message instead of searching', async () => {
    const search = backend({});
    const crawlPage = vi.fn(async (url: string) => ({ url, title: 'Page', content: 'Page body text' }));
    const { callLlm } = scripted([[{ type: 'text', text: 'Summary[1]' }]]);

    const events = await collect(makeEngine({ search, callLlm, crawlPage }), 'summarize https://example.com/post');

    expect(search.search).not.toHaveBeenCalled();
    expect(crawlPage).toHaveBeenCalledWith('https://example.com/post');
    const sources = events.find((e) => e.type === 'sources').data;
    expect(sources[0]).toMatchObject({ pageContent: 'Page body text', metadata: { url: 'https://example.com/post', title: 'Page' } });
  });

  it('reads the top sources up front when source extraction is on', async () => {
    const search = backend({ q: [{ title: 'A', url: 'https://a.example', content: 'snippet' }] });
    const crawlPage = vi.fn(async (url: string) => ({ url, title: 'A', content: 'full page text that is longer' }));
    const { callLlm } = scripted([[{ type: 'text', text: 'ok' }]]);

    const events = await collect(makeEngine({ search, callLlm, crawlPage }), 'q', { sourceExtraction: true });

    expect(crawlPage).toHaveBeenCalledWith('https://a.example');
    expect(events.find((e) => e.type === 'sources').data[0].pageContent).toBe('full page text that is longer');
  });

  it('offers only the search tool when no page reader is configured', async () => {
    const { callLlm, calls } = scripted([[{ type: 'text', text: 'ok' }]]);
    await collect(makeEngine({ search: backend({}), callLlm }), 'q');
    expect(Object.keys(calls[0].tools ?? {})).toEqual(['search']);
  });

  it('falls back to a placeholder source and a link list when nothing comes back', async () => {
    const { callLlm } = scripted([[]]);
    const events = await collect(makeEngine({ search: backend({}), callLlm }), 'nothing here', { mode: 'speed' });

    const sources = events.find((e) => e.type === 'sources').data;
    expect(sources).toHaveLength(1);
    expect(sources[0].metadata.url).toContain('google.com/search');
    expect(events.find((e) => e.type === 'response').data).toContain("I couldn't generate a full answer");
    expect(events.at(-1).type).toBe('end');
  });

  it('adds uploaded files to the context and the numbered sources', async () => {
    const { callLlm, calls } = scripted([[{ type: 'text', text: 'From the file[1].' }]]);
    const engine = makeEngine({
      search: backend({}),
      callLlm,
      prefetchSearch: false,
      loadUploads: async () => [{ title: 'notes.pdf', content: 'Quarterly numbers' }],
    });

    const events = await collect(engine, 'summarize my file', { fileIds: ['f1'] });

    expect(String(calls[0].messages[0].content)).toContain('<file index="1" title="notes.pdf">Quarterly numbers</file>');
    expect(events.find((e) => e.type === 'sources').data[0].metadata).toMatchObject({ url: 'File', title: 'notes.pdf' });
  });

  it('reports provider errors in the same wording as before', async () => {
    const callLlm: CallLlm = async function* () {
      throw new Error('401 authentication failed');
    };
    const events = await collect(makeEngine({ search: backend({}), callLlm }), 'q');
    expect(events.at(-1)).toMatchObject({ type: 'error', data: expect.stringContaining('Authentication failed') });
  });
});

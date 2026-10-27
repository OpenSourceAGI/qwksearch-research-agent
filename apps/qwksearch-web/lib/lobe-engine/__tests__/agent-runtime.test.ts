import { describe, it, expect, vi } from 'vitest';
import type { ModelMessage } from 'ai';
import { runAgent, isToolsUnsupportedError, splitInstructions, streamTextCallLlm, type CallLlm, type LlmStreamEvent } from '../agent-runtime';

const llm = {} as any;
const tools = { search: {} } as any;

/** A fake model that plays back one scripted step per call. */
function scripted(steps: LlmStreamEvent[][]) {
  const calls: Array<{ messages: ModelMessage[]; tools?: unknown; toolChoice?: string }> = [];
  const callLlm: CallLlm = async function* (params) {
    calls.push({ messages: params.messages, tools: params.tools, toolChoice: params.toolChoice });
    const step = steps[calls.length - 1] ?? [];
    for (const event of step) yield event;
  };
  return { callLlm, calls };
}

const passthrough = async (messages: ModelMessage[], _state?: unknown) => messages;

describe('runAgent', () => {
  it('finishes after one step when the model answers directly', async () => {
    const { callLlm, calls } = scripted([[{ type: 'text', text: 'Hello' }, { type: 'text', text: ' world' }]]);
    const onText = vi.fn();

    const result = await runAgent({
      llm,
      messages: [{ role: 'user', content: 'hi' }],
      maxSteps: 3,
      buildContext: passthrough,
      executeTool: vi.fn(),
      onText,
      callLlm,
    });

    expect(result.finishReason).toBe('completed');
    expect(result.steps).toBe(1);
    expect(result.text).toBe('Hello world');
    expect(onText.mock.calls.map((c) => c[0]).join('')).toBe('Hello world');
    expect(calls).toHaveLength(1);
  });

  it('runs tool calls, feeds their results back, then answers', async () => {
    const { callLlm, calls } = scripted([
      [{ type: 'tool-call', toolCallId: 't1', toolName: 'search', input: { query: 'x' } }],
      [{ type: 'text', text: 'Answer[1]' }],
    ]);
    const executeTool = vi.fn().mockResolvedValue('<searchResults />');

    const result = await runAgent({
      llm,
      messages: [{ role: 'user', content: 'q' }],
      tools,
      maxSteps: 4,
      buildContext: passthrough,
      executeTool,
      onText: vi.fn(),
      callLlm,
    });

    expect(executeTool).toHaveBeenCalledWith({ toolCallId: 't1', toolName: 'search', input: { query: 'x' } });
    expect(result.toolCalls).toBe(1);
    expect(result.text).toBe('Answer[1]');
    const second = calls[1].messages;
    expect(second.at(-2)).toMatchObject({ role: 'assistant', content: [{ type: 'tool-call', toolCallId: 't1' }] });
    expect(second.at(-1)).toMatchObject({
      role: 'tool',
      content: [{ type: 'tool-result', toolCallId: 't1', output: { type: 'text', value: '<searchResults />' } }],
    });
  });

  it('keeps a preamble before tool calls off the answer', async () => {
    const { callLlm } = scripted([
      [
        { type: 'text', text: 'Let me search.' },
        { type: 'tool-call', toolCallId: 't1', toolName: 'search', input: { query: 'x' } },
      ],
      [{ type: 'text', text: 'Final' }],
    ]);
    const onText = vi.fn();

    const result = await runAgent({
      llm,
      messages: [{ role: 'user', content: 'q' }],
      tools,
      maxSteps: 3,
      buildContext: passthrough,
      executeTool: vi.fn().mockResolvedValue('ok'),
      onText,
      callLlm,
    });

    expect(onText.mock.calls.map((c) => c[0]).join('')).toBe('Final');
    expect(result.text).toBe('Final');
  });

  it('switches tools off on the last step and asks for a final answer', async () => {
    const toolStep: LlmStreamEvent[] = [{ type: 'tool-call', toolCallId: 't', toolName: 'search', input: {} }];
    const { callLlm, calls } = scripted([toolStep, [{ type: 'text', text: 'done' }]]);
    const buildContext = vi.fn(passthrough);

    const result = await runAgent({
      llm,
      messages: [{ role: 'user', content: 'q' }],
      tools,
      maxSteps: 2,
      buildContext,
      executeTool: vi.fn().mockResolvedValue('ok'),
      onText: vi.fn(),
      callLlm,
    });

    expect(calls[0].toolChoice).toBe('auto');
    expect(calls[1].toolChoice).toBe('none');
    expect(buildContext.mock.calls[1][1]).toMatchObject({ forceFinish: true, step: 1 });
    expect(result.text).toBe('done');
  });

  it('retries without tools when the model cannot call them', async () => {
    let attempt = 0;
    const callLlm: CallLlm = async function* (params) {
      attempt++;
      if (params.tools) throw new Error('No endpoints found that support tool use');
      yield { type: 'text', text: 'plain answer' };
    };

    const result = await runAgent({
      llm,
      messages: [{ role: 'user', content: 'q' }],
      tools,
      maxSteps: 3,
      buildContext: passthrough,
      executeTool: vi.fn(),
      onText: vi.fn(),
      callLlm,
    });

    expect(attempt).toBe(2);
    expect(result.toolsEnabled).toBe(false);
    expect(result.text).toBe('plain answer');
  });

  it('rethrows other model errors', async () => {
    const callLlm: CallLlm = async function* () {
      throw new Error('401 authentication failed');
    };
    await expect(
      runAgent({
        llm,
        messages: [{ role: 'user', content: 'q' }],
        tools,
        maxSteps: 2,
        buildContext: passthrough,
        executeTool: vi.fn(),
        onText: vi.fn(),
        callLlm,
      }),
    ).rejects.toThrow('401');
  });

  it('turns a failing tool into an error result instead of failing the run', async () => {
    const { callLlm, calls } = scripted([
      [{ type: 'tool-call', toolCallId: 't1', toolName: 'search', input: {} }],
      [{ type: 'text', text: 'ok' }],
    ]);

    await runAgent({
      llm,
      messages: [{ role: 'user', content: 'q' }],
      tools,
      maxSteps: 3,
      buildContext: passthrough,
      executeTool: vi.fn().mockRejectedValue(new Error('boom')),
      onText: vi.fn(),
      callLlm,
    });

    expect(calls[1].messages.at(-1)).toMatchObject({
      role: 'tool',
      content: [{ output: { type: 'text', value: '<error>boom</error>' } }],
    });
  });
});

describe('isToolsUnsupportedError', () => {
  it('recognises provider messages about missing tool support', () => {
    expect(isToolsUnsupportedError(new Error('No endpoints found that support tool use'))).toBe(true);
    expect(isToolsUnsupportedError(new Error('This model does not support tools'))).toBe(true);
    expect(isToolsUnsupportedError(new Error('function calling is not supported'))).toBe(true);
    expect(isToolsUnsupportedError(new Error('429 rate limit'))).toBe(false);
  });
});

describe('splitInstructions', () => {
  it('moves system messages out of the conversation into instructions', () => {
    const { instructions, messages } = splitInstructions([
      { role: 'system', content: 'Role' },
      { role: 'user', content: 'q' },
      { role: 'system', content: 'More' },
      { role: 'assistant', content: 'a' },
    ]);
    expect(instructions).toBe('Role\n\nMore');
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('leaves instructions unset when there are none', () => {
    expect(splitInstructions([{ role: 'user', content: 'q' }]).instructions).toBeUndefined();
  });
});

describe('streamTextCallLlm', () => {
  it('sends the system prompt as instructions, which the AI SDK accepts', async () => {
    const { MockLanguageModelV3, simulateReadableStream } = await import('ai/test');
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: '1' },
            { type: 'text-delta', id: '1', delta: 'hi' },
            { type: 'text-end', id: '1' },
            { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } } },
          ] as any,
        }),
      }),
    });

    const events: LlmStreamEvent[] = [];
    for await (const event of streamTextCallLlm({
      model,
      messages: [
        { role: 'system', content: 'You are QwkSearch.' },
        { role: 'user', content: 'hello' },
      ],
    })) {
      events.push(event);
    }

    expect(events).toEqual([{ type: 'text', text: 'hi' }]);
    const prompt = model.doStreamCalls[0].prompt;
    expect(prompt[0]).toMatchObject({ role: 'system', content: 'You are QwkSearch.' });
    expect(prompt.filter((m: any) => m.role === 'system')).toHaveLength(1);
  });
});

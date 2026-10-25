import { describe, it, expect } from 'vitest';
import type { ModelMessage } from 'ai';
import {
  ContextEngine,
  ForceFinishSummaryInjector,
  HistoryTruncateProcessor,
  MessageCleanupProcessor,
  SystemRoleInjector,
  ToolCallFlattenProcessor,
} from '../context-engine';

const run = async (pipeline: any[], messages: ModelMessage[]) =>
  (await new ContextEngine({ pipeline }).process({ messages })).messages;

describe('context engine processors', () => {
  it('injects the system role, joining an existing system message', async () => {
    const out = await run([new SystemRoleInjector({ systemRole: 'Role' })], [
      { role: 'system', content: 'Base' },
      { role: 'user', content: 'hi' },
    ]);
    expect(out[0]).toEqual({ role: 'system', content: 'Base\n\nRole' });
    expect(out).toHaveLength(2);
  });

  it('truncates history but keeps the whole current turn', async () => {
    const out = await run([new HistoryTruncateProcessor({ historyCount: 2 })], [
      { role: 'system', content: 's' },
      { role: 'user', content: 'u1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' },
      { role: 'user', content: 'u3' },
      { role: 'tool', content: [] },
    ]);
    expect(out.map((m) => (typeof m.content === 'string' ? m.content : m.role))).toEqual(['s', 'u2', 'a2', 'u3', 'tool']);
  });

  it('appends the force-finish prompt only when enabled', async () => {
    const msgs: ModelMessage[] = [{ role: 'user', content: 'q' }];
    expect(await run([new ForceFinishSummaryInjector({ enabled: false })], msgs)).toHaveLength(1);
    const out = await run([new ForceFinishSummaryInjector({ enabled: true })], msgs);
    expect(String(out[1].content)).toContain('maximum step limit');
  });

  it('flattens tool turns into text for models without tools', async () => {
    const out = await run([new ToolCallFlattenProcessor({ enabled: true })], [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: [{ type: 'tool-call', toolCallId: '1', toolName: 'search', input: { query: 'q' } }] },
      { role: 'tool', content: [{ type: 'tool-result', toolCallId: '1', toolName: 'search', output: { type: 'text', value: '<searchResults />' } }] },
    ]);
    expect(out[1]).toEqual({ role: 'assistant', content: '(called search with {"query":"q"})' });
    expect(out[2]).toEqual({ role: 'user', content: 'Tool results:\n<searchResults />' });
  });

  it('drops empty messages', async () => {
    const out = await run([new MessageCleanupProcessor()], [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: '  ' },
    ]);
    expect(out).toHaveLength(1);
  });

  it('reports duplicate processors when validating', () => {
    const engine = new ContextEngine({ pipeline: [new MessageCleanupProcessor(), new MessageCleanupProcessor()] });
    expect(engine.validate().valid).toBe(false);
  });
});

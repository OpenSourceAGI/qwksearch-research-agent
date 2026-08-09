import { describe, expect, it } from 'vitest';
import { selectDefaultChatModel } from '../webview-ui/src/selectChatModel';
import type { Provider } from '../webview-ui/src/types';

function provider(id: string, name: string, modelKeys: string[]): Provider {
  return { id, name, chatModels: modelKeys.map((key) => ({ key, name: key })) };
}

describe('selectDefaultChatModel', () => {
  it('returns undefined when there are no providers', () => {
    expect(selectDefaultChatModel([])).toBeUndefined();
  });

  it('returns undefined when no provider has any models', () => {
    expect(selectDefaultChatModel([provider('p1', 'OpenRouter', [])])).toBeUndefined();
  });

  it('prefers OpenRouter over everything else', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'NVIDIA', ['nvidia/model']),
      provider('p2', 'OpenRouter', ['some/model']),
      provider('p3', 'AnyAPI', ['anyapi/model']),
    ]);

    expect(selection?.providerId).toBe('p2');
  });

  it('falls back to AnyAPI when OpenRouter is absent', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'NVIDIA', ['nvidia/model']),
      provider('p2', 'AnyAPI', ['anyapi/model']),
    ]);

    expect(selection?.providerId).toBe('p2');
  });

  it('falls back to Nvidia when neither OpenRouter nor AnyAPI is present', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'Groq', ['groq/model']),
      provider('p2', 'Nvidia', ['nvidia/model']),
    ]);

    expect(selection?.providerId).toBe('p2');
  });

  it('falls back to the first provider with models', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'Groq', []),
      provider('p2', 'Together', ['together/model']),
    ]);

    expect(selection?.providerId).toBe('p2');
  });

  it('matches provider names case-insensitively', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'Groq', ['groq/model']),
      provider('p2', 'openrouter.ai', ['some/model']),
    ]);

    expect(selection?.providerId).toBe('p2');
  });

  it('prefers the openrouter/free model when offered', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'OpenRouter', ['a/model', 'openrouter/free', 'deepseek/deepseek-v3:free']),
    ]);

    expect(selection?.key).toBe('openrouter/free');
  });

  it('falls back to the free DeepSeek model', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'OpenRouter', ['a/model', 'deepseek/deepseek-v3:free', 'x/nemotron']),
    ]);

    expect(selection?.key).toBe('deepseek/deepseek-v3:free');
  });

  it('falls back to any Nemotron-family model', () => {
    const selection = selectDefaultChatModel([
      provider('p1', 'OpenRouter', ['a/model', 'nvidia/Llama-3-Nemotron-70B']),
    ]);

    expect(selection?.key).toBe('nvidia/Llama-3-Nemotron-70B');
  });

  it('falls back to the provider first model', () => {
    const selection = selectDefaultChatModel([provider('p1', 'Groq', ['groq/first', 'groq/second'])]);

    expect(selection).toEqual({ key: 'groq/first', providerId: 'p1' });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Each `@ai-sdk/*` factory is replaced with a recorder: calling it returns a
 * model-builder function, and calling that records `{ settings, model }`. The
 * tests then assert on which SDK was chosen and how it was configured.
 */
const calls: { sdk: string; settings: Record<string, unknown>; model: string }[] = [];

function recorder(sdk: string) {
  return (settings: Record<string, unknown>) => {
    const build = (model: string) => {
      calls.push({ sdk, settings, model });
      return { sdk, model };
    };
    // createOpenRouter exposes `.chat(model)` instead of being callable.
    build.chat = (model: string) => build(model);
    return build;
  };
}

vi.mock('@ai-sdk/openai', () => ({ createOpenAI: recorder('openai') }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: recorder('anthropic') }));
vi.mock('@ai-sdk/groq', () => ({ createGroq: recorder('groq') }));
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: recorder('google') }));
vi.mock('@ai-sdk/google-vertex', () => ({ createVertex: recorder('vertex') }));
vi.mock('@ai-sdk/xai', () => ({ createXai: recorder('xai') }));
vi.mock('@ai-sdk/amazon-bedrock', () => ({ createAmazonBedrock: recorder('bedrock') }));
vi.mock('@openrouter/ai-sdk-provider', () => ({ createOpenRouter: recorder('openrouter') }));

const { createLLMProvider } = await import('../src/provider-factory');

function build(provider: string, apiKey = 'key-123', model = 'model-x') {
  createLLMProvider(provider, apiKey, model, 0.7);
  return calls.at(-1)!;
}

describe('createLLMProvider', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('returns null for an unknown provider', () => {
    expect(createLLMProvider('not-a-provider', 'key', 'model', 0)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['groq', 'groq'],
    ['openai', 'openai'],
    ['anthropic', 'anthropic'],
    ['xai', 'xai'],
    ['google', 'google'],
  ])('routes %s to its native SDK with the api key', (provider, sdk) => {
    const call = build(provider);

    expect(call.sdk).toBe(sdk);
    expect(call.settings).toEqual({ apiKey: 'key-123' });
    expect(call.model).toBe('model-x');
  });

  it.each([
    ['togetherai', 'https://api.together.xyz/v1'],
    ['nvidia', 'https://integrate.api.nvidia.com/v1'],
    ['anyapi', 'https://api.anyapi.ai/v1'],
    ['perplexity', 'https://api.perplexity.ai'],
  ])('routes %s through the OpenAI-compatible client at %s', (provider, baseURL) => {
    const call = build(provider);

    expect(call.sdk).toBe('openai');
    expect(call.settings).toEqual({ apiKey: 'key-123', baseURL });
  });

  it('uses the OpenRouter chat entry point', () => {
    const call = build('openrouter');

    expect(call.sdk).toBe('openrouter');
    expect(call.settings).toEqual({ apiKey: 'key-123' });
    expect(call.model).toBe('model-x');
  });

  it('splits the vertex api key into project and location', () => {
    const call = build('vertex', 'my-project:europe-west4');

    expect(call.sdk).toBe('vertex');
    expect(call.settings).toMatchObject({ project: 'my-project', location: 'europe-west4' });
  });

  it('defaults the vertex location when only a project is given', () => {
    expect(build('vertex', 'my-project').settings).toMatchObject({ location: 'us-central1' });
  });

  it('splits the cloudflare api key into token and account id', () => {
    const call = build('cloudflare', 'cf-token:acct-9');

    expect(call.sdk).toBe('openai');
    expect(call.settings).toEqual({
      apiKey: 'cf-token',
      baseURL: 'https://api.cloudflare.com/client/v4/accounts/acct-9/ai/v1',
    });
  });

  it.each(['amazon', 'bedrock'])('routes %s to Bedrock with split credentials', (provider) => {
    const call = build(provider, 'us-east-1:AKIA123:secret456');

    expect(call.sdk).toBe('bedrock');
    expect(call.settings).toEqual({
      region: 'us-east-1',
      accessKeyId: 'AKIA123',
      secretAccessKey: 'secret456',
    });
  });

  it('is case sensitive — callers pass an already-normalised provider name', () => {
    expect(createLLMProvider('OpenAI', 'key', 'model', 0)).toBeNull();
  });

  it('returns the constructed model instance', () => {
    expect(createLLMProvider('groq', 'key', 'llama-3', 0)).toEqual({
      sdk: 'groq',
      model: 'llama-3',
    });
  });
});

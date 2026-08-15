/**
 * @fileoverview Tests for ModelRegistry.loadChatModel's OpenRouter
 * app-attribution headers (HTTP-Referer, X-Title).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConfigModelProvider } from "../src/config/config-types";

const createOpenAIMock = vi.fn();
const chatMock = vi.fn();
const getCurrentConfigMock = vi.fn();

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: (args: unknown) => createOpenAIMock(args),
}));

vi.mock("../src/config/config-manager", () => ({
  default: {
    getCurrentConfig: () => getCurrentConfigMock(),
  },
}));

import ModelRegistry from "../src/config/model-registry";

const makeProvider = (
  overrides: Partial<ConfigModelProvider> = {},
): ConfigModelProvider => ({
  id: "provider-1",
  name: "Test Provider",
  type: "openrouter",
  chatModels: [{ key: "some/model", name: "Some Model" }],
  config: { apiKey: "test-key" },
  hash: "hash-1",
  ...overrides,
});

beforeEach(() => {
  createOpenAIMock.mockReset();
  chatMock.mockReset();
  getCurrentConfigMock.mockReset();
  createOpenAIMock.mockReturnValue({ chat: chatMock });
  chatMock.mockReturnValue({ id: "fake-language-model" });
  delete process.env.QWKSEARCH_URL;
  delete process.env.QWKSEARCH_APP_NAME;
});

describe("ModelRegistry.loadChatModel — OpenRouter app-attribution headers", () => {
  it("sends default HTTP-Referer and X-Title headers for an OpenRouter provider", async () => {
    const provider = makeProvider();
    getCurrentConfigMock.mockReturnValue({ modelProviders: [provider] });

    const registry = new ModelRegistry();
    await registry.loadChatModel(provider.id, "some/model");

    expect(createOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-key",
        headers: {
          "HTTP-Referer": "https://qwksearch.com",
          "X-Title": "QwkSearch",
        },
      }),
    );
  });

  it("respects QWKSEARCH_URL and QWKSEARCH_APP_NAME env var overrides", async () => {
    process.env.QWKSEARCH_URL = "https://example.com/app";
    process.env.QWKSEARCH_APP_NAME = "Custom App";
    const provider = makeProvider();
    getCurrentConfigMock.mockReturnValue({ modelProviders: [provider] });

    const registry = new ModelRegistry();
    await registry.loadChatModel(provider.id, "some/model");

    expect(createOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "HTTP-Referer": "https://example.com/app",
          "X-Title": "Custom App",
        },
      }),
    );
  });

  it("does not add attribution headers for a non-OpenRouter OpenAI-compatible provider", async () => {
    const provider = makeProvider({
      id: "provider-2",
      name: "Test OpenAI",
      type: "openai",
      chatModels: [{ key: "gpt-test", name: "GPT Test" }],
    });
    getCurrentConfigMock.mockReturnValue({ modelProviders: [provider] });

    const registry = new ModelRegistry();
    await registry.loadChatModel(provider.id, "gpt-test");

    expect(createOpenAIMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() }),
    );
  });
});

import { test, expect, describe } from "vitest";
import { LANGUAGE_MODELS } from "../src/config/language-models-database";

/**
 * Test suite to verify OpenRouter provider configuration
 * with Nemotron 3 Nano 30B MoE as the default model
 */
describe("OpenRouter Provider Configuration", () => {
  test("OpenRouter provider should exist in LANGUAGE_MODELS", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    expect(openRouterProvider).toBeDefined();
    expect(openRouterProvider.provider).toBe("OpenRouter");
  });

  test("Nemotron 70B should be the default model for OpenRouter", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    expect(openRouterProvider.default).toBe(
      "nvidia/llama-3.1-nemotron-70b-instruct:free"
    );
  });

  test("Nemotron 70B should be the first model in the list", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    expect(openRouterProvider.models).toBeDefined();
    expect(openRouterProvider.models.length).toBeGreaterThan(0);
    expect(openRouterProvider.models[0].id).toBe(
      "nvidia/llama-3.1-nemotron-70b-instruct:free"
    );
    expect(openRouterProvider.models[0].name).toContain("Nemotron 70B");
  });

  test("Nemotron 70B should be marked as free with proper metadata", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    const nemotronModel = openRouterProvider.models.find(
      (m) => m.id === "nvidia/llama-3.1-nemotron-70b-instruct:free"
    );

    expect(nemotronModel).toBeDefined();
    expect(nemotronModel.free).toBe(true);
    expect(nemotronModel.type).toBe("text-generation");
    expect(nemotronModel.contextLength).toBe(131072);
    expect(nemotronModel.description).toContain("guests");
  });

  test("OpenRouter should have multiple free models", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    const freeModels = openRouterProvider.models.filter((m) => m.free === true);

    // Should have at least 10 free models
    expect(freeModels.length).toBeGreaterThanOrEqual(10);

    // Verify some key free models exist
    const freeModelIds = freeModels.map((m) => m.id);
    expect(freeModelIds).toContain("meta-llama/llama-3.1-70b-instruct:free");
    expect(freeModelIds).toContain("nvidia/llama-3.1-nemotron-70b-instruct:free");
    expect(freeModelIds).toContain("qwen/qwen-2.5-72b-instruct:free");
    expect(freeModelIds).toContain("deepseek/deepseek-v3:free");
    expect(freeModelIds).toContain("openrouter/free");
  });

  test("All free models should have proper metadata", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    const freeModels = openRouterProvider.models.filter((m) => m.free === true);

    freeModels.forEach((model) => {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.contextLength).toBeGreaterThan(0);
      expect(model.free).toBe(true);
      expect(model.type).toBe("text-generation");
      expect(model.rateLimit).toBeDefined();
    });
  });

  test("OpenRouter provider should have correct documentation links", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    expect(openRouterProvider.docs).toBe("https://openrouter.ai/docs");
    expect(openRouterProvider.api_key).toBe("https://openrouter.ai/settings/keys");
  });
});

import { test, expect, describe } from "vitest";
import { LANGUAGE_MODELS } from "../src/config/language-models-database";

/**
 * Test suite to verify OpenRouter provider configuration
 * with Nemotron 3 Super 120B as the default model
 */
describe("OpenRouter Provider Configuration", () => {
  test("OpenRouter provider should exist in LANGUAGE_MODELS", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    expect(openRouterProvider).toBeDefined();
    expect(openRouterProvider.provider).toBe("OpenRouter");
  });

  test("Nemotron 3 Super 120B should be the default model for OpenRouter", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    expect(openRouterProvider.default).toBe(
      "nvidia/nemotron-3-super-120b-a12b:free"
    );
  });

  test("Nemotron 3 Super 120B should be marked as free with proper metadata", () => {
    const openRouterProvider = LANGUAGE_MODELS.find(
      (p) => p.provider.toLowerCase() === "openrouter"
    );

    const nemotronModel = openRouterProvider.models.find(
      (m) => m.id === "nvidia/nemotron-3-super-120b-a12b:free"
    );

    expect(nemotronModel).toBeDefined();
    expect(nemotronModel.free).toBe(true);
    expect(nemotronModel.type).toBe("text-generation");
    expect(nemotronModel.contextLength).toBe(1_000_000);
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
    expect(freeModelIds).toContain("nvidia/nemotron-3-super-120b-a12b:free");
    expect(freeModelIds).toContain("nvidia/nemotron-3-ultra-550b-a55b:free");
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

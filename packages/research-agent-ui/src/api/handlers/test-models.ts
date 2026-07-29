/**
 * @fileoverview Handler that tests a provider's API key against its available models.
 */
import {
  testProviderModels,
  type ProviderTestResult,
} from "chat-agent-toolkit/config/model-tester";
import { LANGUAGE_MODELS } from "chat-agent-toolkit/config/language-models-database";

export function createTestModelsHandler() {
  const POST = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const { providerType, apiKey, onlyFree = true } = body;

      if (!providerType) {
        return Response.json(
          { error: "Provider type is required" },
          { status: 400 },
        );
      }

      if (!apiKey) {
        return Response.json({ error: "API key is required" }, { status: 400 });
      }

      const providerData = LANGUAGE_MODELS.find(
        (p: any) =>
          p.provider.toLowerCase() === providerType.toLowerCase(),
      );

      if (!providerData) {
        return Response.json(
          { error: `Provider ${providerType} not found` },
          { status: 404 },
        );
      }

      const result: ProviderTestResult = await testProviderModels(
        providerType,
        apiKey,
        providerData.models,
        { onlyFree, concurrency: 3, timeout: 15000 },
      );

      return Response.json(result);
    } catch (error: any) {
      console.error("[test-models] Error:", error);
      return Response.json(
        { error: error.message || "Failed to test models" },
        { status: 500 },
      );
    }
  };

  return { POST };
}

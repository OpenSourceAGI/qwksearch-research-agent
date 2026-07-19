import type { ChatModelSelection, Provider } from "./types";

/**
 * Picks a sensible default provider + model, mirroring the priority order
 * used by research-agent-ui's `checkConfig` (OpenRouter > Nvidia > first
 * available; Nemotron-family model preferred).
 */
export function selectDefaultChatModel(providers: Provider[]): ChatModelSelection | undefined {
  const withModels = providers.filter((p) => p.chatModels.length > 0);
  if (withModels.length === 0) return undefined;

  const provider =
    withModels.find((p) => p.name.toLowerCase().includes("openrouter")) ??
    withModels.find((p) => p.name.toLowerCase().includes("nvidia")) ??
    withModels[0];

  const model =
    provider.chatModels.find((m) => m.key === "openrouter/free") ??
    provider.chatModels.find((m) => m.key.toLowerCase().includes("nemotron")) ??
    provider.chatModels[0];

  return { key: model.key, providerId: provider.id };
}

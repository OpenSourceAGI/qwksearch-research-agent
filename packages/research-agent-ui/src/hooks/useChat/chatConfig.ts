/**
 * @fileoverview Chat configuration and model provider initialization.
 * Handles loading and selecting the appropriate AI model provider and model
 * based on user preferences stored in localStorage or system defaults.
 * @module components/ResearchAgent/state/chat/chatConfig
 */

import { toast } from "sonner";
import grab from "grab-url";
import { MinimalProvider } from "chat-agent-toolkit/models/types";
import { ChatModelProvider } from "../../types/chat";

/**
 * Initializes and validates the chat model configuration.
 *
 * This function performs the following steps:
 * 1. Fetches available providers from the API
 * 2. Loads user preferences from localStorage (if any)
 * 3. Selects an appropriate provider (preferring OpenRouter)
 * 4. Selects an appropriate model (preferring Nemotron 3 Super 120B)
 * 5. Saves the selection to localStorage for future sessions
 *
 * @param setChatModelProvider - Callback to set the selected provider configuration
 * @param setIsConfigReady - Callback to signal configuration completion
 * @param setHasError - Callback to signal configuration errors
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   checkConfig(setChatModelProvider, setIsConfigReady, setHasError);
 * }, []);
 * ```
 *
 * @throws Will call setHasError(true) if no providers or models are available
 */
export const checkConfig = async (
  setChatModelProvider: (provider: ChatModelProvider) => void,
  setIsConfigReady: (ready: boolean) => void,
  setHasError: (hasError: boolean) => void,
): Promise<void> => {
  try {
    // Load user preferences from localStorage
    let chatModelKey = localStorage.getItem("chatModelKey");
    let chatModelProviderId = localStorage.getItem("chatModelProviderId");

    // Fetch available providers from API
    const response = await grab("agent/providers");
    const providers: MinimalProvider[] = response?.providers || [];

    // If no providers are configured, just mark config as ready without error
    // Users can still use the chat interface and add API keys later in Settings
    if (!providers || providers.length === 0) {
      setIsConfigReady(true);
      return;
    }

    // Try to find the user's previously selected provider. Require it to have
    // at least one model so a stale preference (provider whose models were
    // removed or whose API key is missing) falls through to default selection.
    let chatModelProvider = providers.find(
      (p) => p.id === chatModelProviderId && (p.chatModels?.length ?? 0) > 0,
    );

    // If no saved preference, select a default provider
    if (!chatModelProvider) {
      // Prefer OpenRouter provider (no daily limits, best for guests and new users)
      const openRouterProvider = providers.find(
        (p) =>
          p.name.toLowerCase().includes("openrouter") &&
          (p.chatModels?.length ?? 0) > 0,
      );

      if (openRouterProvider) {
        chatModelProvider = openRouterProvider;
      } else {
        // Fallback to AnyAPI (100,000 free anyTokens/day)
        const anyApiProvider = providers.find(
          (p) =>
            p.name.toLowerCase().includes("anyapi") &&
            (p.chatModels?.length ?? 0) > 0,
        );

        if (anyApiProvider) {
          chatModelProvider = anyApiProvider;
        } else {
          // Fallback to Nvidia
          const nvidiaProvider = providers.find(
            (p) =>
              p.name.toLowerCase().includes("nvidia") &&
              (p.chatModels?.length ?? 0) > 0,
          );

          if (nvidiaProvider) {
            chatModelProvider = nvidiaProvider;
          } else {
            // Final fallback to any provider with available models
            chatModelProvider = providers.find(
              (p) => (p.chatModels?.length ?? 0) > 0,
            );
          }
        }
      }
    }

    if (!chatModelProvider) {
      setIsConfigReady(true);
      return;
    }

    chatModelProviderId = chatModelProvider.id;

    // Try to find the user's previously selected model
    let chatModel = chatModelProvider.chatModels.find(
      (m) => m.key === chatModelKey,
    );

    // If no saved preference, select a default model
    if (!chatModel) {
      // For OpenRouter, prefer openrouter/free (auto-router for best free model)
      if (chatModelProvider.name.toLowerCase().includes("openrouter")) {
        chatModel = chatModelProvider.chatModels.find(
          (m) => m.key === "openrouter/free"
        );
      }

      // If openrouter/free not found, try Nemotron 3 Super 120B as fallback
      if (!chatModel && chatModelProvider.name.toLowerCase().includes("openrouter")) {
        chatModel = chatModelProvider.chatModels.find(
          (m) => m.key === "nvidia/nemotron-3-super-120b-a12b:free"
        );
      }

      // For AnyAPI, prefer DeepSeek V3 (free)
      if (!chatModel && chatModelProvider.name.toLowerCase().includes("anyapi")) {
        chatModel = chatModelProvider.chatModels.find(
          (m) => m.key === "deepseek/deepseek-v3:free"
        );
      }

      // If not OpenRouter or specific models not found, prefer any Nemotron 3 Super model
      if (!chatModel) {
        chatModel = chatModelProvider.chatModels.find(
          (m) =>
            (m.key.toLowerCase().includes("nemotron-3-super") ||
              m.name.toLowerCase().includes("nemotron 3 super")) &&
            m.key.toLowerCase().includes("120b"),
        );
      }

      // Fallback to any Nemotron model
      if (!chatModel) {
        chatModel = chatModelProvider.chatModels.find((m) =>
          m.key.toLowerCase().includes("nemotron") ||
          m.name.toLowerCase().includes("nemotron"),
        );
      }

      // Final fallback to first available model
      if (!chatModel) {
        chatModel = chatModelProvider.chatModels[0];
      }
    }

    if (!chatModel) {
      setIsConfigReady(true);
      return;
    }

    chatModelKey = chatModel.key;

    // Persist selection for future sessions
    localStorage.setItem("chatModelKey", chatModelKey);
    localStorage.setItem("chatModelProviderId", chatModelProviderId);

    // Update application state
    setChatModelProvider({
      key: chatModelKey,
      providerId: chatModelProviderId,
    });

    setIsConfigReady(true);
  } catch (err: any) {
    // A failed providers fetch must not leave the app on an infinite loader:
    // without this catch the promise rejected with neither isConfigReady nor
    // hasError set, so ChatWindow never left its Loader state. Mark the app
    // ready so the UI is usable and the user can configure a provider in
    // Settings; surface the failure via toast.
    console.error("An error occurred while checking the configuration:", err);
    toast.error(
      `Could not load AI providers: ${err?.message ?? String(err)}`,
    );
    setIsConfigReady(true);
  }
};

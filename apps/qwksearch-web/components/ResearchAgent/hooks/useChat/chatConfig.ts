/**
 * @fileoverview Chat configuration and model provider initialization.
 * Handles loading and selecting the appropriate AI model provider and model
 * based on user preferences stored in localStorage or system defaults.
 * @module components/ResearchAgent/state/chat/chatConfig
 */

import { toast } from "sonner";
import grab from "grab-url";
import { MinimalProvider } from "ai-research-agent/models/types";
import { ChatModelProvider } from "@/types/chat";

/**
 * Initializes and validates the chat model configuration.
 *
 * This function performs the following steps:
 * 1. Fetches available providers from the API
 * 2. Loads user preferences from localStorage (if any)
 * 3. Selects an appropriate provider (preferring Nvidia)
 * 4. Selects an appropriate model (preferring Kimi 2.5)
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

    if (!providers || providers.length === 0) {
      throw new Error(
        "No chat model providers found, please configure them in the settings page.",
      );
    }

    // Try to find the user's previously selected provider. Require it to have
    // at least one model so a stale preference (provider whose models were
    // removed or whose API key is missing) falls through to default selection.
    let chatModelProvider = providers.find(
      (p) => p.id === chatModelProviderId && (p.chatModels?.length ?? 0) > 0,
    );

    // If no saved preference, select a default provider
    if (!chatModelProvider) {
      // Prefer Nvidia provider
      const nvidiaProvider = providers.find(
        (p) =>
          p.name.toLowerCase().includes("nvidia") &&
          (p.chatModels?.length ?? 0) > 0,
      );

      if (nvidiaProvider) {
        chatModelProvider = nvidiaProvider;
      } else {
        // Fallback to any provider with available models
        chatModelProvider = providers.find(
          (p) => (p.chatModels?.length ?? 0) > 0,
        );
      }
    }

    if (!chatModelProvider) {
      throw new Error(
        "No chat models found, please configure them in the settings page.",
      );
    }

    chatModelProviderId = chatModelProvider.id;

    // Try to find the user's previously selected model
    let chatModel = chatModelProvider.chatModels.find(
      (m) => m.key === chatModelKey,
    );

    // If no saved preference, select a default model
    if (!chatModel) {
      // Prefer Kimi 2.5
      chatModel = chatModelProvider.chatModels.find(
        (m) =>
          (m.key.toLowerCase().includes("kimi") ||
            m.name.toLowerCase().includes("kimi")) &&
          (m.key.toLowerCase().includes("2.5") ||
            m.name.toLowerCase().includes("2.5") ||
            m.key.toLowerCase().includes("k2") ||
            m.name.toLowerCase().includes("k2")),
      );

      // Fallback to any Kimi model
      if (!chatModel) {
        chatModel = chatModelProvider.chatModels.find((m) =>
          m.key.toLowerCase().includes("kimi"),
        );
      }

      // Final fallback to first available model
      if (!chatModel) {
        chatModel = chatModelProvider.chatModels[0];
      }
    }

    if (!chatModel) {
      throw new Error(
        "No chat models found, please configure them in the settings page.",
      );
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
    console.error("An error occurred while checking the configuration:", err);
    toast.error(err.message);
    setIsConfigReady(false);
    setHasError(true);
  }
};

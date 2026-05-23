/**
 * @module research/models/providers/anthropic
 * @description Research library module.
 */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Model, ModelList, ProviderMetadata } from "../types";
import BaseModelProvider from "./baseProvider";
import { ChatAnthropic } from "@langchain/anthropic";
import { UIConfigField } from "../../config/types";
import { getConfiguredModelProviderById } from "../../config/serverRegistry";
// import grab from "grab-url";


interface AnthropicConfig {
  apiKey: string;
}

const providerConfigFields: UIConfigField[] = [
  {
    type: "password",
    name: "API Key",
    key: "apiKey",
    description: "Your Anthropic API key",
    required: true,
    placeholder: "Anthropic API Key",
    env: "ANTHROPIC_API_KEY",
    scope: "server",
  },
];

class AnthropicProvider extends BaseModelProvider<AnthropicConfig> {
  constructor(id: string, name: string, config: AnthropicConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    try {
      const response = await fetch(
        "https://api.anthropic.com/v1/models?limit=999",
        {
          headers: {
            "x-api-key": this.config.apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Anthropic API returned ${response.status}: ${errorText}`);
        return { chat: [] };
      }

      const data = (await response.json()) as any;

      if (!data.data || !Array.isArray(data.data)) {
        console.warn(
          `Invalid response format from Anthropic API: ${JSON.stringify(data)}`,
        );
        return { chat: [] };
      }

      const now = Date.now();
      const models: Model[] = data.data
        .filter((m: any) => {
          // Exclude models that the provider has marked as deprecated
          if (m.deprecated_at) {
            return new Date(m.deprecated_at).getTime() > now;
          }
          return true;
        })
        .map((m: any) => ({
          key: m.id,
          name: m.display_name,
        }));

      return {
        chat: models,
      };
    } catch (err) {
      console.error("Error fetching Anthropic models:", err);
      return {
        chat: [],
      };
    }
  }

  async getModelList(): Promise<ModelList> {
    const defaultModels = await this.getDefaultModels();
    const configProvider = getConfiguredModelProviderById(this.id)!;

    return {
      chat: [...defaultModels.chat, ...configProvider.chatModels],
    };
  }

  async loadChatModel(key: string): Promise<BaseChatModel> {
    const modelList = await this.getModelList();

    const exists = modelList.chat.find((m) => m.key === key);

    if (!exists) {
      throw new Error(
        "Error Loading Anthropic Chat Model. Invalid Model Selected",
      );
    }

    return new ChatAnthropic({
      apiKey: this.config.apiKey,
      temperature: 0.7,
      model: key,
    });
  }

  static parseAndValidate(raw: any): AnthropicConfig {
    if (!raw || typeof raw !== "object")
      throw new Error("Invalid config provided. Expected object");
    if (!raw.apiKey)
      throw new Error("Invalid config provided. API key must be provided");

    return {
      apiKey: String(raw.apiKey),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: "anthropic",
      name: "Anthropic",
    };
  }
}

export default AnthropicProvider;

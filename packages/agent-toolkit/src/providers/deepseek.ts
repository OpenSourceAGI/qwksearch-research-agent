/**
 * @module research/models/providers/deepseek
 * @description Research library module.
 */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Model, ModelList, ProviderMetadata } from "../types";
import BaseModelProvider from "./baseProvider";
import { ChatOpenAI } from "@langchain/openai";
import { UIConfigField } from "../../config/types";
import { getConfiguredModelProviderById } from "../../config/serverRegistry";

interface DeepSeekConfig {
  apiKey: string;
}

const defaultChatModels: Model[] = [
  {
    name: "Deepseek Chat 4",
    key: "deepseek-chat",
  },
  {
    name: "Deepseek Reasoner 4",
    key: "deepseek-reasoner",
  },
];

const providerConfigFields: UIConfigField[] = [
  {
    type: "password",
    name: "API Key",
    key: "apiKey",
    description: "Your DeepSeek API key",
    required: true,
    placeholder: "DeepSeek API Key",
    env: "DEEPSEEK_API_KEY",
    scope: "server",
  },
];

class DeepSeekProvider extends BaseModelProvider<DeepSeekConfig> {
  constructor(id: string, name: string, config: DeepSeekConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    return {
      chat: defaultChatModels,
    };
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
        "Error Loading DeepSeek Chat Model. Invalid Model Selected",
      );
    }

    return new ChatOpenAI({
      apiKey: this.config.apiKey,
      temperature: 0.7,
      model: key,
      configuration: {
        baseURL: "https://api.deepseek.com",
      },
    }) as unknown as BaseChatModel;
  }

  static parseAndValidate(raw: any): DeepSeekConfig {
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
      key: "deepseek",
      name: "Deepseek AI",
    };
  }
}

export default DeepSeekProvider;

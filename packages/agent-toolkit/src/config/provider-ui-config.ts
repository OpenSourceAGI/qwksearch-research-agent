/**
 * @module research/models/providers/index
 * @description Research library module.
 *
 * This file provides metadata about providers without importing them directly,
 * to avoid circular dependency issues with the config system.
 */
import { ModelProviderUISection } from "../types";

/**
 * Gets provider UI configuration without triggering circular dependencies.
 * This function uses static metadata instead of importing provider classes.
 */
export const getModelProvidersUIConfigSection =
  (): ModelProviderUISection[] => {
    // Import statically defined metadata instead of loading the providers
    // This breaks the circular dependency
    return [
      {
        key: "openai",
        name: "OpenAI",
        fields: getOpenAIConfigFields(),
      },
      {
        key: "anthropic",
        name: "Anthropic",
        fields: getAnthropicConfigFields(),
      },
      {
        key: "gemini",
        name: "Google Gemini",
        fields: getGeminiConfigFields(),
      },
      {
        key: "groq",
        name: "Groq",
        fields: getGroqConfigFields(),
      },
      {
        key: "deepseek",
        name: "DeepSeek",
        fields: getDeepSeekConfigFields(),
      },
      {
        key: "nvidia",
        name: "NVIDIA",
        fields: getNvidiaConfigFields(),
      },
      {
        key: "openrouter",
        name: "OpenRouter",
        fields: getOpenRouterConfigFields(),
      },
    ];
  };

// Static config field definitions to avoid loading provider classes
// These match the providerConfigFields in each provider file
function getOpenAIConfigFields() {
  return [
    {
      type: "password" as const,
      name: "API Key",
      key: "apiKey",
      description: "Your OpenAI API key",
      required: true,
      placeholder: "OpenAI API Key",
      env: "OPENAI_API_KEY",
      scope: "server" as const,
    },
    {
      type: "string" as const,
      name: "Base URL",
      key: "baseURL",
      description: "The base URL for the OpenAI API",
      required: true,
      placeholder: "OpenAI Base URL",
      default: "https://api.openai.com/v1",
      env: "OPENAI_BASE_URL",
      scope: "server" as const,
    },
  ];
}


function getAnthropicConfigFields() {
  return [
    {
      type: "password" as const,
      name: "API Key",
      key: "apiKey",
      description: "Your Anthropic API key",
      required: true,
      placeholder: "Anthropic API Key",
      env: "ANTHROPIC_API_KEY",
      scope: "server" as const,
    },
  ];
}

function getGeminiConfigFields() {
  return [
    {
      type: "password" as const,
      name: "API Key",
      key: "apiKey",
      description: "Your Google Gemini API key",
      required: true,
      placeholder: "Google Gemini API Key",
      env: "GEMINI_API_KEY",
      scope: "server" as const,
    },
  ];
}

function getGroqConfigFields() {
  return [
    {
      type: "password" as const,
      name: "API Key",
      key: "apiKey",
      description: "Your Groq API key. Free tier includes fast inference on Llama and Mixtral models - get yours at console.groq.com",
      required: true,
      placeholder: "gsk_...",
      env: "GROQ_API_KEY",
      scope: "server" as const,
    },
  ];
}

function getDeepSeekConfigFields() {
  return [
    {
      type: "password" as const,
      name: "API Key",
      key: "apiKey",
      description: "Your DeepSeek API key",
      required: true,
      placeholder: "DeepSeek API Key",
      env: "DEEPSEEK_API_KEY",
      scope: "server" as const,
    },
  ];
}

function getNvidiaConfigFields() {
  return [
    {
      type: "password" as const,
      name: "API Key",
      key: "apiKey",
      description: "Your NVIDIA API key. Free tier includes access to Nemotron, Llama, and other models - get yours at build.nvidia.com",
      required: true,
      placeholder: "nvapi-...",
      env: "NVIDIA_API_KEY",
      scope: "server" as const,
    },
    {
      type: "string" as const,
      name: "Base URL",
      key: "baseURL",
      description: "The base URL for NVIDIA's OpenAI-compatible API",
      required: true,
      placeholder: "https://integrate.api.nvidia.com/v1",
      default: "https://integrate.api.nvidia.com/v1",
      env: "NVIDIA_BASE_URL",
      scope: "server" as const,
    },
  ];
}

function getOpenRouterConfigFields() {
  return [
    {
      type: "password" as const,
      name: "API Key",
      key: "apiKey",
      description: "Your OpenRouter API key. Get one free at openrouter.ai - includes free access to Llama 3.3 70B, Nemotron, and other models.",
      required: true,
      placeholder: "sk-or-v1-...",
      env: "OPENROUTER_API_KEY",
      scope: "server" as const,
    },
    {
      type: "string" as const,
      name: "Base URL",
      key: "baseURL",
      description: "The base URL for OpenRouter's OpenAI-compatible API",
      required: true,
      placeholder: "https://openrouter.ai/api/v1",
      default: "https://openrouter.ai/api/v1",
      env: "OPENROUTER_BASE_URL",
      scope: "server" as const,
    },
  ];
}

/**
 * List of default models for the chat providers and a list of models
 * @property {string} provider - The provider name
 * @property {string} docs - The documentation URL for the model
 * @property {string} api_key - The API key  url for the model
 * @property {string} default - The default model for the chat provider
 * @property {Object[]} models - The list of models available for the chat provider
 * @category Generate
 */
export const LANGUAGE_MODELS = [
  {
  "provider": "NVIDIA",
  "docs": "https://docs.api.nvidia.com/nim/reference/llm-apis",
  "api_key": "https://build.nvidia.com/settings/api-keys",
  "default": "nvidia/llama-3.1-nemotron-70b-instruct",
  "models": [
    {
      "name": "Llama 3.1 Nemotron 70B Instruct",
      "id": "nvidia/llama-3.1-nemotron-70b-instruct",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron 3 Super 120B",
      "id": "nvidia/nemotron-3-super-120b-a12b",
      "contextLength": 1_000_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron-4 340B",
      "id": "nvidia/nemotron-4-340b",
      "contextLength": 131_072,
      "free": false,
      "type": "text-generation"
    },
    {
      "name": "Llama 3.3 70B Instruct",
      "id": "meta/llama-3.3-70b-instruct",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Llama 3.1 405B Instruct",
      "id": "meta/llama-3.1-405b-instruct",
      "contextLength": 131_072,
      "free": false,
      "type": "text-generation"
    },
    {
      "name": "Llama 3.1 8B Instruct",
      "id": "meta/llama-3.1-8b-instruct",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Kimi K2.5",
      "id": "moonshotai/kimi-k2.5",
      "contextLength": 256_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "DeepSeek V3",
      "id": "deepseek-ai/deepseek-v3",
      "contextLength": 128_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Gemma 4 31B IT",
      "id": "google/gemma-4-31b-it",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "GLM 4.5 Air",
      "id": "z-ai/glm-4.5-air",
      "contextLength": 128_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Mistral Large 2",
      "id": "mistralai/mistral-large-2",
      "contextLength": 131_072,
      "free": false,
      "type": "text-generation"
    },
    {
      "name": "Mistral Nemo",
      "id": "mistralai/mistral-nemo",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Qwen2.5 72B Instruct",
      "id": "qwen/qwen2.5-72b-instruct",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "CodeLlama 70B Instruct",
      "id": "meta/llama-3.1-70b-code-instruct",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    }
  ]
},
  {
    provider: "Cloudflare",
    docs: "https://developers.cloudflare.com/workers-ai/",
    api_key: "https://dash.cloudflare.com/profile/api-tokens",
    default: "llama-4-scout-17b-16e-instruct",
    models: [
      {
        name: "Llama 4 Scout 17B 16E Instruct",
        id: "llama-4-scout-17b-16e-instruct",
        contextLength: 128000,
      },
      {
        name: "Llama 3.3 70B Instruct FP8 Fast",
        id: "llama-3.3-70b-instruct-fp8-fast",
        contextLength: 128000,
      },
      {
        name: "Llama 3.1 8B Instruct Fast",
        id: "llama-3.1-8b-instruct-fast",
        contextLength: 128000,
      },
      {
        name: "Gemma 3 12B IT",
        id: "gemma-3-12b-it",
        contextLength: 128000,
      },
      {
        name: "Mistral Small 3.1 24B Instruct",
        id: "mistral-small-3.1-24b-instruct",
        contextLength: 128000,
      },
      {
        name: "QwQ 32B",
        id: "qwq-32b",
        contextLength: 32768,
      },
      {
        name: "Qwen2.5 Coder 32B Instruct",
        id: "qwen2.5-coder-32b-instruct",
        contextLength: 32768,
      },
      {
        name: "Llama Guard 3 8B",
        id: "llama-guard-3-8b",
        contextLength: 8192,
      },
      {
        name: "DeepSeek R1 Distill Qwen 32B",
        id: "deepseek-r1-distill-qwen-32b",
        contextLength: 32768,
      },
      {
        name: "Llama 3.2 1B Instruct",
        id: "llama-3.2-1b-instruct",
        contextLength: 131072,
      },
      {
        name: "Llama 3.2 3B Instruct",
        id: "llama-3.2-3b-instruct",
        contextLength: 131072,
      },
      {
        name: "Llama 3.2 11B Vision Instruct",
        id: "llama-3.2-11b-vision-instruct",
        contextLength: 131072,
      },
      {
        name: "Llama 3.1 8B Instruct AWQ",
        id: "llama-3.1-8b-instruct-awq",
        contextLength: 128000,
      },
      {
        name: "Llama 3.1 8B Instruct FP8",
        id: "llama-3.1-8b-instruct-fp8",
        contextLength: 128000,
      },
      {
        name: "MeloTTS",
        id: "melotts",
        contextLength: 1024,
      },
      {
        name: "Llama 3.1 8B Instruct",
        id: "llama-3.1-8b-instruct",
        contextLength: 128000,
      },
      {
        name: "Meta Llama 3 8B Instruct",
        id: "meta-llama-3-8b-instruct",
        contextLength: 8192,
      },
      {
        name: "Whisper Large V3 Turbo",
        id: "whisper-large-v3-turbo",
        contextLength: 448000,
      },
      {
        name: "Llama 3 8B Instruct AWQ",
        id: "llama-3-8b-instruct-awq",
        contextLength: 8192,
      },
      {
        name: "LLaVA 1.5 7B HF",
        id: "llava-1.5-7b-hf",
        contextLength: 4096,
      },
      {
        name: "Una Cybertron 7B V2 BF16",
        id: "una-cybertron-7b-v2-bf16",
        contextLength: 32768,
      },
      {
        name: "Whisper Tiny EN",
        id: "whisper-tiny-en",
        contextLength: 448000,
      },
      {
        name: "Llama 3 8B Instruct",
        id: "llama-3-8b-instruct",
        contextLength: 8192,
      },
      {
        name: "Mistral 7B Instruct v0.2",
        id: "mistral-7b-instruct-v0.2",
        contextLength: 32768,
      },
      {
        name: "Gemma 7B IT LoRA",
        id: "gemma-7b-it-lora",
        contextLength: 8192,
      },
      {
        name: "Gemma 2B IT LoRA",
        id: "gemma-2b-it-lora",
        contextLength: 8192,
      },
      {
        name: "Llama 2 7B Chat HF LoRA",
        id: "llama-2-7b-chat-hf-lora",
        contextLength: 4096,
      },
      {
        name: "Gemma 7B IT",
        id: "gemma-7b-it",
        contextLength: 8192,
      },
      {
        name: "Starling LM 7B Beta",
        id: "starling-lm-7b-beta",
        contextLength: 8192,
      },
      {
        name: "Hermes 2 Pro Mistral 7B",
        id: "hermes-2-pro-mistral-7b",
        contextLength: 32768,
      },
      {
        name: "Mistral 7B Instruct v0.2 LoRA",
        id: "mistral-7b-instruct-v0.2-lora",
        contextLength: 32768,
      },
      {
        name: "Qwen1.5 1.8B Chat",
        id: "qwen1.5-1.8b-chat",
        contextLength: 32768,
      },
      {
        name: "UForm Gen2 Qwen 500M",
        id: "uform-gen2-qwen-500m",
        contextLength: 2048,
      },
      {
        name: "BART Large CNN",
        id: "bart-large-cnn",
        contextLength: 1024,
      },
      {
        name: "Phi-2",
        id: "phi-2",
        contextLength: 2048,
      },
      {
        name: "TinyLlama 1.1B Chat v1.0",
        id: "tinyllama-1.1b-chat-v1.0",
        contextLength: 2048,
      },
      {
        name: "Qwen1.5 14B Chat AWQ",
        id: "qwen1.5-14b-chat-awq",
        contextLength: 32768,
      },
      {
        name: "Qwen1.5 7B Chat AWQ",
        id: "qwen1.5-7b-chat-awq",
        contextLength: 32768,
      },
      {
        name: "Qwen1.5 0.5B Chat",
        id: "qwen1.5-0.5b-chat",
        contextLength: 32768,
      },
      {
        name: "DiscoLM German 7B v1 AWQ",
        id: "discolm-german-7b-v1-awq",
        contextLength: 32768,
      },
      {
        name: "Falcon 7B Instruct",
        id: "falcon-7b-instruct",
        contextLength: 2048,
      },
      {
        name: "OpenChat 3.5 0106",
        id: "openchat-3.5-0106",
        contextLength: 8192,
      },
      {
        name: "SQLCoder 7B 2",
        id: "sqlcoder-7b-2",
        contextLength: 16384,
      },
      {
        name: "DeepSeek Math 7B Instruct",
        id: "deepseek-math-7b-instruct",
        contextLength: 4096,
      },
      {
        name: "DETR ResNet-50",
        id: "detr-resnet-50",
        contextLength: 1024,
      },
      {
        name: "Stable Diffusion XL Lightning",
        id: "stable-diffusion-xl-lightning",
        contextLength: 77,
      },
      {
        name: "DreamShaper 8 LCM",
        id: "dreamshaper-8-lcm",
        contextLength: 77,
      },
      {
        name: "Stable Diffusion v1.5 Img2Img",
        id: "stable-diffusion-v1-5-img2img",
        contextLength: 77,
      },
      {
        name: "Stable Diffusion v1.5 Inpainting",
        id: "stable-diffusion-v1-5-inpainting",
        contextLength: 77,
      },
      {
        name: "DeepSeek Coder 6.7B Instruct AWQ",
        id: "deepseek-coder-6.7b-instruct-awq",
        contextLength: 16384,
      },
      {
        name: "DeepSeek Coder 6.7B Base AWQ",
        id: "deepseek-coder-6.7b-base-awq",
        contextLength: 16384,
      },
      {
        name: "LlamaGuard 7B AWQ",
        id: "llamaguard-7b-awq",
        contextLength: 4096,
      },
      {
        name: "Neural Chat 7B v3.1 AWQ",
        id: "neural-chat-7b-v3-1-awq",
        contextLength: 8192,
      },
      {
        name: "OpenHermes 2.5 Mistral 7B AWQ",
        id: "openhermes-2.5-mistral-7b-awq",
        contextLength: 8192,
      },
      {
        name: "Llama 2 13B Chat AWQ",
        id: "llama-2-13b-chat-awq",
        contextLength: 4096,
      },
      {
        name: "Mistral 7B Instruct v0.1 AWQ",
        id: "mistral-7b-instruct-v0.1-awq",
        contextLength: 8192,
      },
      {
        name: "Zephyr 7B Beta AWQ",
        id: "zephyr-7b-beta-awq",
        contextLength: 8192,
      },
      {
        name: "Stable Diffusion XL Base 1.0",
        id: "stable-diffusion-xl-base-1.0",
        contextLength: 77,
      },
      {
        name: "BGE Large EN v1.5",
        id: "bge-large-en-v1.5",
        contextLength: 512,
      },
      {
        name: "BGE Small EN v1.5",
        id: "bge-small-en-v1.5",
        contextLength: 512,
      },
      {
        name: "Llama 2 7B Chat FP16",
        id: "llama-2-7b-chat-fp16",
        contextLength: 4096,
      },
      {
        name: "Mistral 7B Instruct v0.1",
        id: "mistral-7b-instruct-v0.1",
        contextLength: 8192,
      },
      {
        name: "BGE Base EN v1.5",
        id: "bge-base-en-v1.5",
        contextLength: 512,
      },
      {
        name: "DistilBERT SST-2 Int8",
        id: "distilbert-sst-2-int8",
        contextLength: 512,
      },
      {
        name: "Llama 2 7B Chat Int8",
        id: "llama-2-7b-chat-int8",
        contextLength: 4096,
      },
      {
        name: "M2M100 1.2B",
        id: "m2m100-1.2b",
        contextLength: 1024,
      },
      {
        name: "ResNet-50",
        id: "resnet-50",
        contextLength: 224,
      },
      {
        name: "Whisper",
        id: "whisper",
        contextLength: 448000,
      },
      {
        name: "Llama 3.1 70B Instruct",
        id: "llama-3.1-70b-instruct",
        contextLength: 128000,
      },
    ],
  },
  {
    provider: "Perplexity",
    docs: "https://docs.perplexity.ai/models/model-cards",
    api_key: "https://www.perplexity.ai/account/api/keys",
    default: "sonar",
    models: [
      {
        name: "Sonar Pro",
        id: "sonar-pro",
        contextLength: 200000,
      },
      {
        name: "Sonar",
        id: "sonar",
        contextLength: 128000,
      },
      {
        name: "Sonar Reasoning Pro",
        id: "sonar-reasoning-pro",
        contextLength: 128000,
      },
      {
        name: "Sonar Reasoning",
        id: "sonar-reasoning",
        contextLength: 128000,
      },
      {
        name: "Sonar Deep Research",
        id: "sonar-deep-research",
        contextLength: 128000,
      },
      {
        name: "Llama 3.1 Sonar Small 128k Online",
        id: "llama-3.1-sonar-small-128k-online",
        contextLength: 127072,
      },
      {
        name: "Llama 3.1 Sonar Large 128k Online",
        id: "llama-3.1-sonar-large-128k-online",
        contextLength: 127072,
      },
      {
        name: "Llama 3.1 Sonar Huge 128k Online",
        id: "llama-3.1-sonar-huge-128k-online",
        contextLength: 127072,
      },
    ],
  },
  {
    provider: "Groq",
    docs: "https://console.groq.com/docs/overview",
    api_key: "https://console.groq.com/keys",
    default: "llama-3.3-70b-versatile",
    models: [
      {
        name: "Llama 3.3 70B Versatile (Free)",
        id: "llama-3.3-70b-versatile",
        contextLength: 131072,
        free: true,
        type: "text-generation",
        rateLimit: "300K TPM / 1K RPM = ~432M tokens/day",
      },
      {
        name: "Llama 3.1 8B Instant (Free)",
        id: "llama-3.1-8b-instant",
        contextLength: 8192,
        free: true,
        type: "text-generation",
        rateLimit: "250K TPM / 1K RPM = ~360M tokens/day",
      },
      {
        name: "Llama 4 Scout 17B (Free)",
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        contextLength: 131072,
        free: true,
        type: "text-generation",
        rateLimit: "300K TPM / 1K RPM = ~432M tokens/day",
      },
      {
        name: "Qwen 3 32B (Free)",
        id: "qwen/qwen3-32b",
        contextLength: 128000,
        free: true,
        type: "text-generation",
        rateLimit: "300K TPM / 1K RPM = ~432M tokens/day",
      },
      {
        name: "GPT-OSS 120B (Free)",
        id: "openai/gpt-oss-120b",
        contextLength: 32768,
        free: true,
        type: "text-generation",
        rateLimit: "250K TPM / 1K RPM = ~360M tokens/day",
      },
      {
        name: "GPT-OSS 20B (Free)",
        id: "openai/gpt-oss-20b",
        contextLength: 32768,
        free: true,
        type: "text-generation",
        rateLimit: "250K TPM / 1K RPM = ~360M tokens/day",
      },
      {
        name: "Groq Compound (Free)",
        id: "groq/compound",
        contextLength: 32768,
        free: true,
        type: "text-generation",
        rateLimit: "200K TPM / 200 RPM = ~288M tokens/day",
      },
      {
        name: "Groq Compound Mini (Free)",
        id: "groq/compound-mini",
        contextLength: 32768,
        free: true,
        type: "text-generation",
        rateLimit: "200K TPM / 200 RPM = ~288M tokens/day",
      },
      {
        name: "GPT-OSS Safeguard 20B (Free)",
        id: "openai/gpt-oss-safeguard-20b",
        contextLength: 32768,
        free: true,
        type: "text-generation",
        rateLimit: "150K TPM / 1K RPM = ~216M tokens/day",
      },
    ],
  },
  {
    provider: "OpenAI",
    docs: "https://platform.openai.com/docs/overview",
    api_key: "https://platform.openai.com/api-keys",
    default: "gpt-4o",
    models: [
      {
        name: "GPT-4 Omni",
        id: "gpt-4o",
        contextLength: 128000,
      },
      {
        name: "GPT-4 Omni Mini",
        id: "gpt-4o-mini",
        contextLength: 128000,
      },
      {
        name: "GPT-4 Turbo",
        id: "gpt-4-turbo",
        contextLength: 128000,
      },
      {
        name: "GPT-4",
        id: "gpt-4",
        contextLength: 8192,
      },
      {
        name: "GPT-3.5 Turbo",
        id: "gpt-3.5-turbo",
        contextLength: 16385,
      },
    ],
  },
  {
    provider: "Anthropic",
    docs: "https://docs.anthropic.com/en/docs/welcome",
    api_key: "https://console.anthropic.com/settings/keys",
    default: "claude-3-7-sonnet-20250219",
    models: [
      {
        name: "Claude 3.7 Sonnet",
        id: "claude-3-7-sonnet-20250219",
        contextLength: 200000,
      },
      {
        name: "Claude 3.5 Sonnet",
        id: "claude-3-5-sonnet-20241022",
        contextLength: 200000,
      },
      {
        name: "Claude 3 Opus",
        id: "claude-3-opus-20240229",
        contextLength: 200000,
      },
      {
        name: "Claude 3 Sonnet",
        id: "claude-3-sonnet-20240229",
        contextLength: 200000,
      },
      {
        name: "Claude 3 Haiku",
        id: "claude-3-haiku-20240307",
        contextLength: 200000,
      },
    ],
  },
  {
    provider: "TogetherAI",
    docs: "https://docs.together.ai/docs/quickstart",
    api_key: "https://api.together.xyz/settings/api-keys",
    default: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    models: [
      {
        name: "Llama 3.1 8B Instruct Turbo",
        id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        contextLength: 131072,
      },
      {
        name: "Llama 3.1 70B Instruct Turbo",
        id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        contextLength: 131072,
      },
      {
        name: "Llama 3.1 405B Instruct Turbo",
        id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
        contextLength: 130815,
      },
      {
        name: "Llama 3 8B Instruct Turbo",
        id: "meta-llama/Meta-Llama-3-8B-Instruct-Turbo",
        contextLength: 8192,
      },
      {
        name: "Llama 3 70B Instruct Turbo",
        id: "meta-llama/Meta-Llama-3-70B-Instruct-Turbo",
        contextLength: 8192,
      },
      {
        name: "Llama 3.2 3B Instruct Turbo",
        id: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
        contextLength: 131072,
      },
      {
        name: "Llama 3 8B Instruct Lite",
        id: "meta-llama/Meta-Llama-3-8B-Instruct-Lite",
        contextLength: 8192,
      },
      {
        name: "Llama 3 70B Instruct Lite",
        id: "meta-llama/Meta-Llama-3-70B-Instruct-Lite",
        contextLength: 8192,
      },
      {
        name: "Llama 3 8B Instruct Reference",
        id: "meta-llama/Llama-3-8b-chat-hf",
        contextLength: 8192,
      },
      {
        name: "Llama 3 70B Instruct Reference",
        id: "meta-llama/Llama-3-70b-chat-hf",
        contextLength: 8192,
      },
      {
        name: "Llama 3.1 Nemotron 70B",
        id: "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
        contextLength: 32768,
      },
      {
        name: "Qwen 2.5 Coder 32B Instruct",
        id: "Qwen/Qwen2.5-Coder-32B-Instruct",
        contextLength: 32769,
      },
      {
        name: "WizardLM-2 8x22B",
        id: "microsoft/WizardLM-2-8x22B",
        contextLength: 65536,
      },
      {
        name: "Gemma 2 27B",
        id: "google/gemma-2-27b-it",
        contextLength: 8192,
      },
      {
        name: "Gemma 2 9B",
        id: "google/gemma-2-9b-it",
        contextLength: 8192,
      },
      {
        name: "DBRX Instruct",
        id: "databricks/dbrx-instruct",
        contextLength: 32768,
      },
      {
        name: "DeepSeek LLM Chat (67B)",
        id: "deepseek-ai/deepseek-llm-67b-chat",
        contextLength: 4096,
      },
      {
        name: "Gemma Instruct (2B)",
        id: "google/gemma-2b-it",
        contextLength: 8192,
      },
      {
        name: "MythoMax-L2 (13B)",
        id: "Gryphe/MythoMax-L2-13b",
        contextLength: 4096,
      },
      {
        name: "LLaMA-2 Chat (13B)",
        id: "meta-llama/Llama-2-13b-chat-hf",
        contextLength: 4096,
      },
      {
        name: "Mistral (7B) Instruct",
        id: "mistralai/Mistral-7B-Instruct-v0.1",
        contextLength: 8192,
      },
      {
        name: "Mistral (7B) Instruct v0.2",
        id: "mistralai/Mistral-7B-Instruct-v0.2",
        contextLength: 32768,
      },
      {
        name: "Mistral (7B) Instruct v0.3",
        id: "mistralai/Mistral-7B-Instruct-v0.3",
        contextLength: 32768,
      },
      {
        name: "Mixtral-8x7B Instruct (46.7B)",
        id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        contextLength: 32768,
      },
      {
        name: "Mixtral-8x22B Instruct (141B)",
        id: "mistralai/Mixtral-8x22B-Instruct-v0.1",
        contextLength: 65536,
      },
      {
        name: "Nous Hermes 2 - Mixtral 8x7B-DPO (46.7B)",
        id: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
        contextLength: 32768,
      },
      {
        name: "Qwen 2.5 7B Instruct Turbo",
        id: "Qwen/Qwen2.5-7B-Instruct-Turbo",
        contextLength: 32768,
      },
      {
        name: "Qwen 2.5 72B Instruct Turbo",
        id: "Qwen/Qwen2.5-72B-Instruct-Turbo",
        contextLength: 32768,
      },
      {
        name: "Qwen 2 Instruct (72B)",
        id: "Qwen/Qwen2-72B-Instruct",
        contextLength: 32768,
      },
      {
        name: "StripedHyena Nous (7B)",
        id: "togethercomputer/StripedHyena-Nous-7B",
        contextLength: 32768,
      },
      {
        name: "Upstage SOLAR Instruct v1 (11B)",
        id: "upstage/SOLAR-10.7B-Instruct-v1.0",
        contextLength: 4096,
      },
      {
        name: "Llama 3.2 11B Vision Instruct Turbo (Free)",
        id: "meta-llama/Llama-Vision-Free",
        contextLength: 131072,
      },
      {
        name: "Llama 3.2 11B Vision Instruct Turbo",
        id: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
        contextLength: 131072,
      },
      {
        name: "Llama 3.2 90B Vision Instruct Turbo",
        id: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
        contextLength: 131072,
      },
    ],
  },
  {
    provider: "XAI",
    docs: "https://docs.x.ai/docs#models",
    api_key: "https://console.x.ai/",
    default: "grok-beta",
    models: [
      {
        name: "Grok",
        id: "grok-beta",
        contextLength: 131072,
      },
      {
        name: "Grok Vision",
        id: "grok-vision-beta",
        contextLength: 8192,
      },
    ],
  },
  {
    provider: "Google",
    docs: "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models",
    api_key:
      "https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview#api-keys",
    models: [
      {
        name: "Gemini 2.5 Pro Preview",
        id: "gemini-2.5-pro-preview-05-06",
        contextLength: 1048576,
      },
      {
        name: "Gemini 2.5 Flash Preview",
        id: "gemini-2.5-flash-preview-04-17",
        contextLength: 1048576,
      },
      {
        name: "Gemini 2.0 Flash",
        id: "gemini-2.0-flash-001",
        contextLength: 1048576,
      },
      {
        name: "Gemini 2.0 Flash-Lite",
        id: "gemini-2.0-flash-lite-001",
        contextLength: 1048576,
      },
      {
        name: "Gemini 2.0 Flash-Live",
        id: "gemini-2.0-flash-live-preview-04-09",
        contextLength: 32768,
      },
      {
        name: "Imagen 3",
        id: "imagen-3.0-generate-002",
        contextLength: 480,
      },
      {
        name: "Imagen 3 Fast",
        id: "imagen-3.0-fast-generate-001",
        contextLength: 480,
      },
      {
        name: "Llama 3.2 90B Vision Instruct Turbo",
        id: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
        contextLength: 131072,
      },
      {
        name: "Llama 3.3 70B",
        id: "meta-llama/Llama-3.3-70B",
        contextLength: 131072,
      },
      {
        name: "Gemma 3",
        id: "gemma-3",
        contextLength: 131072,
      },
      {
        name: "Gemma 2",
        id: "gemma-2",
        contextLength: 131072,
      },
      {
        name: "Gemma",
        id: "gemma",
        contextLength: 131072,
      },
    ],
  },
  {
    provider: "Amazon",
    docs: "https://docs.aws.amazon.com/bedrock/",
    api_key: "https://console.aws.amazon.com/iam/home#/security_credentials",
    default: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    models: [
      {
        name: "AI21 Jamba 1.5 Mini",
        id: "ai21.jamba-1-5-mini-v1:0",
        contextLength: 256000,
        provider: "AI21 Labs",
      },
      {
        name: "AI21 Jamba 1.5 Large",
        id: "ai21.jamba-1-5-large-v1:0",
        contextLength: 256000,
        provider: "AI21 Labs",
      },
      {
        name: "Amazon Nova Canvas",
        id: "amazon.nova-canvas-v1:0",
        contextLength: 77,
        provider: "Amazon",
        type: "image",
      },
      {
        name: "Amazon Nova Lite",
        id: "amazon.nova-lite-v1:0",
        contextLength: 300000,
        provider: "Amazon",
      },
      {
        name: "Amazon Nova Micro",
        id: "amazon.nova-micro-v1:0",
        contextLength: 128000,
        provider: "Amazon",
      },
      {
        name: "Amazon Nova Pro",
        id: "amazon.nova-pro-v1:0",
        contextLength: 300000,
        provider: "Amazon",
      },
      {
        name: "Amazon Nova Reel",
        id: "amazon.nova-reel-v1:0",
        contextLength: 10000,
        provider: "Amazon",
        type: "video",
      },
      {
        name: "Amazon Nova Reel V2 Lite",
        id: "amazon.nova-reel-v2-lite-v1:0",
        contextLength: 10000,
        provider: "Amazon",
        type: "video",
      },
      {
        name: "Amazon Nova Reel V2 Standard",
        id: "amazon.nova-reel-v2-standard-v1:0",
        contextLength: 10000,
        provider: "Amazon",
        type: "video",
      },
      {
        name: "Amazon Rerank",
        id: "amazon.rerank-v1:0",
        contextLength: 8192,
        provider: "Amazon",
        type: "reranker",
      },
      {
        name: "Amazon Titan Embeddings G1 - Text",
        id: "amazon.titan-embed-text-v1",
        contextLength: 8192,
        provider: "Amazon",
        type: "embedding",
      },
      {
        name: "Amazon Titan Embeddings G1 - Text v2",
        id: "amazon.titan-embed-text-v2:0",
        contextLength: 8192,
        provider: "Amazon",
        type: "embedding",
      },
      {
        name: "Amazon Titan Image Generator G1",
        id: "amazon.titan-image-generator-v1",
        contextLength: 128,
        provider: "Amazon",
        type: "image",
      },
      {
        name: "Amazon Titan Image Generator G2",
        id: "amazon.titan-image-generator-v2:0",
        contextLength: 128,
        provider: "Amazon",
        type: "image",
      },
      {
        name: "Amazon Titan Multimodal Embeddings G1",
        id: "amazon.titan-embed-image-v1",
        contextLength: 8192,
        provider: "Amazon",
        type: "embedding",
      },
      {
        name: "Amazon Titan Text G1 - Express",
        id: "amazon.titan-text-express-v1",
        contextLength: 8192,
        provider: "Amazon",
      },
      {
        name: "Amazon Titan Text G1 - Lite",
        id: "amazon.titan-text-lite-v1",
        contextLength: 4096,
        provider: "Amazon",
      },
      {
        name: "Amazon Titan Text G1 - Premier",
        id: "amazon.titan-text-premier-v1:0",
        contextLength: 32000,
        provider: "Amazon",
      },
      {
        name: "Claude 3.5 Sonnet v2",
        id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        contextLength: 200000,
        provider: "Anthropic",
      },
      {
        name: "Claude 3.5 Sonnet v1",
        id: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        contextLength: 200000,
        provider: "Anthropic",
      },
      {
        name: "Claude 3.5 Haiku",
        id: "anthropic.claude-3-5-haiku-20241022-v1:0",
        contextLength: 200000,
        provider: "Anthropic",
      },
      {
        name: "Claude 3 Opus",
        id: "anthropic.claude-3-opus-20240229-v1:0",
        contextLength: 200000,
        provider: "Anthropic",
      },
      {
        name: "Claude 3 Sonnet",
        id: "anthropic.claude-3-sonnet-20240229-v1:0",
        contextLength: 200000,
        provider: "Anthropic",
      },
      {
        name: "Claude 3 Haiku",
        id: "anthropic.claude-3-haiku-20240307-v1:0",
        contextLength: 200000,
        provider: "Anthropic",
      },
      {
        name: "Claude Instant",
        id: "anthropic.claude-instant-v1",
        contextLength: 100000,
        provider: "Anthropic",
      },
      {
        name: "Cohere Command",
        id: "cohere.command-text-v14",
        contextLength: 4096,
        provider: "Cohere",
      },
      {
        name: "Cohere Command Light",
        id: "cohere.command-light-text-v14",
        contextLength: 4096,
        provider: "Cohere",
      },
      {
        name: "Cohere Command R",
        id: "cohere.command-r-v1:0",
        contextLength: 128000,
        provider: "Cohere",
      },
      {
        name: "Cohere Command R+",
        id: "cohere.command-r-plus-v1:0",
        contextLength: 128000,
        provider: "Cohere",
      },
      {
        name: "Cohere Embed English",
        id: "cohere.embed-english-v3",
        contextLength: 512,
        provider: "Cohere",
        type: "embedding",
      },
      {
        name: "Cohere Embed Multilingual",
        id: "cohere.embed-multilingual-v3",
        contextLength: 512,
        provider: "Cohere",
        type: "embedding",
      },
      {
        name: "Cohere Rerank English",
        id: "cohere.rerank-english-v3:0",
        contextLength: 4096,
        provider: "Cohere",
        type: "reranker",
      },
      {
        name: "Cohere Rerank Multilingual",
        id: "cohere.rerank-multilingual-v3:0",
        contextLength: 4096,
        provider: "Cohere",
        type: "reranker",
      },
      {
        name: "DeepSeek R1",
        id: "deepseek.deepseek-r1-distill-qwen-32b-v1:0",
        contextLength: 32768,
        provider: "DeepSeek",
      },
      {
        name: "Luma Dream Machine",
        id: "luma.dream-machine-v1:0",
        contextLength: 512,
        provider: "Luma AI",
        type: "video",
      },

      {
        name: "Llama 3.2 11B Vision Instruct",
        id: "meta.llama3-2-11b-instruct-v1:0",
        contextLength: 128000,
        provider: "Meta",
      },
      {
        name: "Llama 3.2 90B Vision Instruct",
        id: "meta.llama3-2-90b-instruct-v1:0",
        contextLength: 128000,
        provider: "Meta",
      },
      {
        name: "Mistral 7B Instruct",
        id: "mistral.mistral-7b-instruct-v0:2",
        contextLength: 32768,
        provider: "Mistral AI",
      },
      {
        name: "Mixtral 8x7B Instruct",
        id: "mistral.mixtral-8x7b-instruct-v0:1",
        contextLength: 32768,
        provider: "Mistral AI",
      },
      {
        name: "Mistral Small",
        id: "mistral.mistral-small-2402-v1:0",
        contextLength: 32768,
        provider: "Mistral AI",
      },
      {
        name: "Mistral Large",
        id: "mistral.mistral-large-2402-v1:0",
        contextLength: 32768,
        provider: "Mistral AI",
      },
      {
        name: "Mistral Large 2",
        id: "mistral.mistral-large-2407-v1:0",
        contextLength: 128000,
        provider: "Mistral AI",
      },
      {
        name: "Mistral Large 2411",
        id: "mistral.mistral-large-2411-v1:0",
        contextLength: 128000,
        provider: "Mistral AI",
      },
      {
        name: "Stable Diffusion XL",
        id: "stability.stable-diffusion-xl-v1",
        contextLength: 77,
        provider: "Stability AI",
        type: "image",
      },
      {
        name: "SDXL 1.0",
        id: "stability.stable-diffusion-xl-v0",
        contextLength: 77,
        provider: "Stability AI",
        type: "image",
      },
      {
        name: "Stable Image Ultra",
        id: "stability.stable-image-ultra-v1:0",
        contextLength: 77,
        provider: "Stability AI",
        type: "image",
      },
      {
        name: "Stable Image Core",
        id: "stability.stable-image-core-v1:0",
        contextLength: 77,
        provider: "Stability AI",
        type: "image",
      },
    ],
  },
 {
  "provider": "OpenRouter",
  "docs": "https://openrouter.ai/docs",
  "api_key": "https://openrouter.ai/settings/keys",
  "default": "openrouter/free",
  "models": [
    {
      "name": "OpenRouter Free (rotating)",
      "id": "openrouter/free",
      "contextLength": 200_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron 3 Super 120B",
      "id": "nvidia/nemotron-3-super-120b-a12b:free",
      "contextLength": 1_000_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron 3 Ultra 550B",
      "id": "nvidia/nemotron-3-ultra-550b-a55b:free",
      "contextLength": 1_000_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron 3 Nano 30B A3B",
      "id": "nvidia/nemotron-3-nano-30b-a3b:free",
      "contextLength": 256_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron 3 Nano Omni 30B A3B Reasoning",
      "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "contextLength": 256_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron Nano 12B v2 VL",
      "id": "nvidia/nemotron-nano-12b-v2-vl:free",
      "contextLength": 128_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron Nano 9B v2",
      "id": "nvidia/nemotron-nano-9b-v2:free",
      "contextLength": 128_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Nemotron 3.5 Content Safety",
      "id": "nvidia/nemotron-3.5-content-safety:free",
      "contextLength": 128_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Gemma 4 31B IT",
      "id": "google/gemma-4-31b-it:free",
      "contextLength": 262_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Gemma 4 26B A4B IT",
      "id": "google/gemma-4-26b-a4b-it:free",
      "contextLength": 262_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "GPT-OSS 120B",
      "id": "openai/gpt-oss-120b:free",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "GPT-OSS 20B",
      "id": "openai/gpt-oss-20b:free",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Qwen3 Coder",
      "id": "qwen/qwen3-coder:free",
      "contextLength": 1_000_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Qwen3 Next 80B A3B Instruct",
      "id": "qwen/qwen3-next-80b-a3b-instruct:free",
      "contextLength": 262_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Llama 3.3 70B Instruct",
      "id": "meta-llama/llama-3.3-70b-instruct:free",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Llama 3.2 3B Instruct",
      "id": "meta-llama/llama-3.2-3b-instruct:free",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Hermes 3 Llama 3.1 405B",
      "id": "nousresearch/hermes-3-llama-3.1-405b:free",
      "contextLength": 131_072,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Laguna XS 2.1",
      "id": "poolside/laguna-xs-2.1:free",
      "contextLength": 262_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Laguna XS 2",
      "id": "poolside/laguna-xs.2:free",
      "contextLength": 262_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Laguna M 1",
      "id": "poolside/laguna-m.1:free",
      "contextLength": 262_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "North Mini Code",
      "id": "cohere/north-mini-code:free",
      "contextLength": 256_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "Dolphin Mistral 24B Venice Edition",
      "id": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
      "contextLength": 33_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "LFM 2.5 1.2B Thinking",
      "id": "liquid/lfm-2.5-1.2b-thinking:free",
      "contextLength": 33_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "LFM 2.5 1.2B Instruct",
      "id": "liquid/lfm-2.5-1.2b-instruct:free",
      "contextLength": 33_000,
      "free": true,
      "type": "text-generation"
    },
    {
      "name": "OpenRouter Free (rotating)",
      "id": "openrouter/free",
      "contextLength": 200_000,
      "free": true,
      "type": "text-generation"
    }
  ]
}
];

/** List of available LLM provider services */
export const LANGUAGE_PROVIDERS = LANGUAGE_MODELS.map((p) =>
  p.provider.toLocaleLowerCase(),
);

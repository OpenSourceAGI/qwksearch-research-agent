
export interface LanguageModelFamily {
  model_family: string;
  imgur: string;
  flagship: string;
  maker: string;
  providers: string[];
  open: boolean;
}

export const LANGUAGE_MODEL_FAMILIES: LanguageModelFamily[] = [
  {
    "model_family": "Claude",
    "imgur": "0il7JUg",
    "flagship": "Claude Fable 5",
    "maker": "Anthropic",
    "providers": ["Anthropic", "OpenRouter"],
    "open": false
  },
  {
    "model_family": "ChatGPT",
    "imgur": "nCj2x5r",
    "flagship": "GPT-5.5",
    "maker": "OpenAI",
    "providers": ["OpenAI", "Azure", "OpenRouter", "Groq", "Together", "Cloudflare", "NVIDIA"],
    "open": false
  },
  {
    "model_family": "Perplexity",
    "imgur": "gn6Jrfp",
    "flagship": "Perplexity Pro",
    "maker": "Perplexity",
    "providers": ["Perplexity"],
    "open": false
  },
  {
    "model_family": "Grok",
    "imgur": "niOweK9",
    "flagship": "Grok 4.3",
    "maker": "xAI",
    "providers": ["xAI", "OpenRouter", "Groq", "Together"],
    "open": false
  },
  {
    "model_family": "Gemini",
    "imgur": "Wo5TVoB",
    "flagship": "Gemini 3.5 Flash",
    "maker": "Google",
    "providers": ["Google", "Google AI Studio", "Vertex AI", "OpenRouter"],
    "open": false
  },
  {
    "model_family": "Hunyuan",
    "imgur": "aCwZ28F",
    "flagship": "Hunyuan-Large-Vision",
    "maker": "Tencent",
    "providers": ["Tencent", "OpenRouter"],
    "open": false
  },
  {
    "model_family": "DeepSeek",
    "imgur": "8KV2Fm9",
    "flagship": "DeepSeek V4 Pro",
    "maker": "DeepSeek",
    "providers": ["DeepSeek", "OpenRouter", "Groq", "Together", "Cloudflare", "NVIDIA"],
    "open": true
  },
  {
    "model_family": "Qwen",
    "imgur": "FYHdzzW",
    "flagship": "Qwen3.7 Max",
    "maker": "Qwen",
    "providers": ["Alibaba", "OpenRouter", "Groq", "Together", "Cloudflare", "NVIDIA", "Ollama"],
    "open": true
  },
  {
    "model_family": "Mistral",
    "imgur": "KV62q18",
    "flagship": "Mistral Medium 3.5",
    "maker": "Mistral",
    "providers": ["Mistral", "OpenRouter", "Groq", "Together", "Cloudflare", "NVIDIA", "Ollama"],
    "open": true
  },
  {
    "model_family": "GLM",
    "imgur": "MDZKdgl",
    "flagship": "GLM 5.2",
    "maker": "Z.ai",
    "providers": ["Z.ai", "OpenRouter"],
    "open": false
  },
  {
    "model_family": "Kimi",
    "imgur": "muaMPRZ",
    "flagship": "Kimi K2.7 Code",
    "maker": "MoonshotAI",
    "providers": ["MoonshotAI", "OpenRouter"],
    "open": false
  },
  {
    "model_family": "Llama",
    "imgur": "gLnXcwZ",
    "flagship": "Llama 4 Maverick",
    "maker": "Meta",
    "providers": ["Meta", "OpenRouter", "Groq", "Together", "Cloudflare", "NVIDIA", "Ollama"],
    "open": true
  },
  {
    "model_family": "MiMo",
    "imgur": "eCi5Da8",
    "flagship": "MiMo-V2.5-Pro",
    "maker": "Xiaomi",
    "providers": ["Xiaomi", "OpenRouter"],
    "open": true
  },
  {
    "model_family": "Nemotron",
    "imgur": "UXfhc20",
    "flagship": "Nemotron 3 Ultra",
    "maker": "NVIDIA",
    "providers": ["NVIDIA", "OpenRouter"],
    "open": true
  },
  {
    "model_family": "StepFun",
    "imgur": "FGEMMDy",
    "flagship": "Step 3.7 Flash",
    "maker": "StepFun",
    "providers": ["StepFun", "OpenRouter"],
    "open": false
  },
  {
    "model_family": "MiniMax",
    "imgur": "vTMfHfs",
    "flagship": "MiniMax M3",
    "maker": "MiniMax",
    "providers": ["MiniMax", "OpenRouter"],
    "open": true
  }
]
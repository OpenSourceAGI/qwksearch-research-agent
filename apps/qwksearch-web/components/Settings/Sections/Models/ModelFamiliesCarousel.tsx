'use client';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { ModelProviderUISection, ConfigModelProvider } from '../../../../lib/config/types';
import AddProvider from './AddProviderDialog';

interface ModelFamily {
  model_family: string;
  imgur: string;
  flagship: string;
  maker: string;
  providers: string[];
  open: boolean;
  providerKey?: string;
  apiKeyUrl?: string;
}

const MODEL_FAMILIES: ModelFamily[] = [
  {
    model_family: 'Claude',
    imgur: '0il7JUg',
    flagship: 'Claude Fable 5',
    maker: 'Anthropic',
    providers: ['Anthropic', 'OpenRouter'],
    open: false,
    providerKey: 'anthropic',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    model_family: 'ChatGPT',
    imgur: 'nCj2x5r',
    flagship: 'GPT-5.5',
    maker: 'OpenAI',
    providers: ['OpenAI', 'Azure OpenAI', 'OpenRouter', 'Groq', 'Together', 'Cloudflare', 'NVIDIA'],
    open: false,
    providerKey: 'openai',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    model_family: 'Gemini',
    imgur: 'Wo5TVoB',
    flagship: 'Gemini 3.5 Flash',
    maker: 'Google',
    providers: ['Google', 'Google AI Studio', 'Vertex AI', 'OpenRouter'],
    open: false,
    providerKey: 'gemini',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    model_family: 'DeepSeek',
    imgur: '8KV2Fm9',
    flagship: 'DeepSeek V4 Pro',
    maker: 'DeepSeek',
    providers: ['DeepSeek', 'OpenRouter', 'Groq', 'Together', 'Cloudflare', 'NVIDIA'],
    open: true,
    providerKey: 'deepseek',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    model_family: 'Llama',
    imgur: 'gLnXcwZ',
    flagship: 'Llama 4 Maverick',
    maker: 'Meta',
    providers: ['Meta', 'OpenRouter', 'Groq', 'Together', 'Cloudflare', 'NVIDIA', 'Ollama'],
    open: true,
    providerKey: 'groq',
    apiKeyUrl: 'https://console.groq.com/keys',
  },
  {
    model_family: 'Grok',
    imgur: 'niOweK9',
    flagship: 'Grok 4.3',
    maker: 'xAI',
    providers: ['xAI', 'OpenRouter', 'Groq', 'Together'],
    open: false,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'Mistral',
    imgur: 'KV62q18',
    flagship: 'Mistral Medium 3.5',
    maker: 'Mistral',
    providers: ['Mistral', 'OpenRouter', 'Groq', 'Together', 'Cloudflare', 'NVIDIA', 'Ollama'],
    open: true,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'Qwen',
    imgur: 'FYHdzzW',
    flagship: 'Qwen3.7 Max',
    maker: 'Qwen',
    providers: ['Alibaba', 'OpenRouter', 'Groq', 'Together', 'Cloudflare', 'NVIDIA', 'Ollama'],
    open: true,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'Nemotron',
    imgur: 'UXfhc20',
    flagship: 'Nemotron 3 Ultra',
    maker: 'NVIDIA',
    providers: ['NVIDIA', 'OpenRouter'],
    open: true,
    providerKey: 'nvidia',
    apiKeyUrl: 'https://build.nvidia.com/settings',
  },
  {
    model_family: 'Perplexity',
    imgur: 'gn6Jrfp',
    flagship: 'Perplexity Pro',
    maker: 'Perplexity',
    providers: ['Perplexity'],
    open: false,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
  },
  {
    model_family: 'Kimi',
    imgur: 'muaMPRZ',
    flagship: 'Kimi K2.7 Code',
    maker: 'MoonshotAI',
    providers: ['MoonshotAI', 'OpenRouter'],
    open: false,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'GLM',
    imgur: 'MDZKdgl',
    flagship: 'GLM 5.2',
    maker: 'Z.ai',
    providers: ['Z.ai', 'OpenRouter'],
    open: false,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'Hunyuan',
    imgur: 'aCwZ28F',
    flagship: 'Hunyuan-Large-Vision',
    maker: 'Tencent',
    providers: ['Tencent', 'OpenRouter'],
    open: false,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'MiMo',
    imgur: 'eCi5Da8',
    flagship: 'MiMo-V2.5-Pro',
    maker: 'Xiaomi',
    providers: ['Xiaomi', 'OpenRouter'],
    open: true,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'StepFun',
    imgur: 'FGEMMDy',
    flagship: 'Step 3.7 Flash',
    maker: 'StepFun',
    providers: ['StepFun', 'OpenRouter'],
    open: false,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    model_family: 'MiniMax',
    imgur: 'vTMfHfs',
    flagship: 'MiniMax M3',
    maker: 'MiniMax',
    providers: ['MiniMax', 'OpenRouter'],
    open: true,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
];

// Maps a provider display name (from MODEL_FAMILIES.providers[]) to the provider key used in modelProviders
const PROVIDER_NAME_TO_KEY: Record<string, string> = {
  Anthropic: 'anthropic',
  OpenAI: 'openai',
  'Azure OpenAI': 'azure-openai',
  Google: 'gemini',
  'Google AI Studio': 'gemini',
  'Vertex AI': 'vertex-ai',
  OpenRouter: 'openrouter',
  Groq: 'groq',
  Together: 'together-ai',
  Cloudflare: 'cloudflare-ai',
  NVIDIA: 'nvidia',
  Ollama: 'ollama',
  DeepSeek: 'deepseek',
  Meta: 'groq',
  xAI: 'openrouter',
  Mistral: 'openrouter',
  Alibaba: 'openrouter',
  MoonshotAI: 'openrouter',
  'Z.ai': 'openrouter',
  Tencent: 'openrouter',
  Xiaomi: 'openrouter',
  StepFun: 'openrouter',
  MiniMax: 'openrouter',
  Perplexity: 'openrouter',
};

interface Props {
  modelProviders: ModelProviderUISection[];
  connectedProviders: ConfigModelProvider[];
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
}

const ModelFamiliesCarousel = ({ modelProviders, connectedProviders, setProviders }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
  };

  const family = MODEL_FAMILIES[selectedIndex];

  const connectedKeys = new Set(connectedProviders.map(p => p.type));

  const isProviderConnected = (providerName: string) => {
    const key = PROVIDER_NAME_TO_KEY[providerName];
    return key ? connectedKeys.has(key) : false;
  };

  const hasSomeConnected = family?.providers.some(isProviderConnected);

  return (
    <div className="flex flex-col gap-4 px-6">
      <p className="text-xs text-black/70 dark:text-white/70">Browse AI model families</p>

      {/* Scrollable thumbnail strip */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 shadow-sm hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft size={14} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-7"
          style={{ scrollbarWidth: 'none' }}
        >
          {MODEL_FAMILIES.map((f, i) => {
            const anyConnected = f.providers.some(isProviderConnected);
            return (
              <button
                key={f.model_family}
                onClick={() => setSelectedIndex(i)}
                className={`flex-none flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all relative ${
                  i === selectedIndex
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-light-200 dark:border-dark-200 bg-light-secondary/30 dark:bg-dark-secondary/30 hover:border-light-300 dark:hover:border-dark-300'
                }`}
                style={{ width: 72 }}
              >
                {anyConnected && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                )}
                <img
                  src={`https://i.imgur.com/${f.imgur}.png`}
                  alt={f.model_family}
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-[10px] text-black/70 dark:text-white/70 truncate w-full text-center">
                  {f.model_family}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 shadow-sm hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Detail card for selected family */}
      {family && (
        <div className="flex flex-col gap-3 p-4 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary/20 dark:bg-dark-secondary/20">
          {/* Header row: logo + name + meta + action */}
          <div className="flex flex-row items-center gap-4">
            <img
              src={`https://i.imgur.com/${family.imgur}.png`}
              alt={family.model_family}
              width={52}
              height={52}
              className="w-13 h-13 object-contain rounded-lg flex-none"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />

            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-black dark:text-white">{family.model_family}</p>
                {family.open && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">
                    Open
                  </span>
                )}
              </div>
              <p className="text-[11px] text-black/50 dark:text-white/50">
                by {family.maker} · {family.flagship}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 flex-none">
              {family.apiKeyUrl && (
                <a
                  href={family.apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-sky-500 hover:text-sky-400 transition-colors whitespace-nowrap"
                >
                  <ExternalLink size={11} />
                  Get API key
                </a>
              )}
            </div>
          </div>

          {/* Provider chips */}
          <div className="flex flex-wrap gap-1.5">
            {family.providers.map((providerName) => {
              const connected = isProviderConnected(providerName);
              const providerKey = PROVIDER_NAME_TO_KEY[providerName];
              const availableSection = modelProviders.find(p => p.key === providerKey);
              return (
                <div
                  key={providerName}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                    connected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-light-200 dark:border-dark-200 bg-light-secondary/50 dark:bg-dark-secondary/50 text-black/50 dark:text-white/50'
                  }`}
                >
                  {connected && <CheckCircle2 size={9} className="flex-none" />}
                  {providerName}
                  {!connected && availableSection && (
                    <AddProvider
                      modelProviders={modelProviders}
                      setProviders={setProviders}
                      defaultProviderKey={providerKey}
                      compact
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!hasSomeConnected && (
            <p className="text-[10px] text-black/40 dark:text-white/40">
              Enable a provider above to use {family.model_family} models.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelFamiliesCarousel;

'use client';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, KeyRound, Blocks } from 'lucide-react';
import { ModelProviderUISection, ConfigModelProvider } from '../../../../lib/config/types';
import AddProvider from './AddProviderDialog';
import ConfigureKeyModal from './ConfigureKeyModal';
import { useChat } from 'research-agent-ui';
import { toast } from 'sonner';

interface ModelFamily {
  model_family: string;
  imgur: string;
  flagship: string;
  maker: string;
  providers: string[];
  open: boolean;
  providerKey?: string;
  apiKeyUrl?: string;
  modelKeywords: string[];
}

const MODEL_FAMILIES: ModelFamily[] = [
  {
    model_family: 'Claude',
    imgur: '0il7JUg',
    flagship: 'Claude Fable 5',
    maker: 'Anthropic',
    providers: ['Anthropic', 'AWS Bedrock', 'OpenRouter'],
    open: false,
    providerKey: 'anthropic',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    modelKeywords: ['claude'],
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
    modelKeywords: ['gpt', 'o1', 'o3', 'o4'],
  },
  {
    model_family: 'Gemini',
    imgur: 'Wo5TVoB',
    flagship: 'Gemini 3.5 Flash',
    maker: 'Google',
    providers: ['Google', 'OpenRouter'],
    open: false,
    providerKey: 'gemini',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    modelKeywords: ['gemini'],
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
    modelKeywords: ['deepseek'],
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
    modelKeywords: ['llama', 'meta-llama'],
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
    modelKeywords: ['grok', 'x-ai/'],
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
    modelKeywords: ['mistral', 'mixtral'],
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
    modelKeywords: ['qwen'],
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
    modelKeywords: ['nemotron'],
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
    modelKeywords: ['perplexity', 'sonar'],
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
    modelKeywords: ['step-', 'stepfun/'],
  },
  {
    model_family: 'Kimi',
    imgur: 'muaMPRZ',
    flagship: 'Kimi K2.7 Code',
    maker: 'MoonshotAI',
    providers: ['MoonshotAI', 'OpenRouter'],
    open: true,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    modelKeywords: ['kimi', 'moonshot'],
  },
  {
    model_family: 'GLM',
    imgur: 'MDZKdgl',
    flagship: 'GLM 5.2',
    maker: 'Z.ai',
    providers: ['Z.ai', 'OpenRouter'],
    open: true,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    modelKeywords: ['glm', 'zhipuai/'],
  },
  {
    model_family: 'Hunyuan',
    imgur: 'aCwZ28F',
    flagship: 'Hunyuan-Large-Vision',
    maker: 'Tencent',
    providers: ['Tencent', 'OpenRouter'],
    open: true,
    providerKey: 'openrouter',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
    modelKeywords: ['hunyuan', 'tencent/'],
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
    modelKeywords: ['mimo', 'xiaomi/'],
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
    modelKeywords: ['minimax', 'abab'],
  },
];

// Fallback bucket for connected models that don't match any curated family above
const OTHER_FAMILY: ModelFamily = {
  model_family: 'Other',
  imgur: '',
  flagship: '',
  maker: '',
  providers: [],
  open: false,
  modelKeywords: [],
};

const ALL_FAMILIES: ModelFamily[] = [...MODEL_FAMILIES, OTHER_FAMILY];

const PROVIDER_API_KEY_URLS: Record<string, string> = {
  Anthropic: 'https://console.anthropic.com/settings/keys',
  OpenAI: 'https://platform.openai.com/api-keys',
  'Azure OpenAI': 'https://portal.azure.com/',
  Google: 'https://aistudio.google.com/app/apikey',
  'Google AI Studio': 'https://aistudio.google.com/app/apikey',
  'Vertex AI': 'https://console.cloud.google.com/apis/credentials',
  OpenRouter: 'https://openrouter.ai/settings/keys',
  Groq: 'https://console.groq.com/keys',
  Together: 'https://api.together.xyz/settings/api-keys',
  Cloudflare: 'https://dash.cloudflare.com/profile/api-tokens',
  NVIDIA: 'https://build.nvidia.com/settings',
  DeepSeek: 'https://platform.deepseek.com/api_keys',
  xAI: 'https://console.x.ai/',
  Mistral: 'https://console.mistral.ai/api-keys/',
  Alibaba: 'https://dashscope.console.aliyun.com/',
  MoonshotAI: 'https://platform.moonshot.cn/console/api-keys',
  'Z.ai': 'https://open.bigmodel.cn/usercenter/apikeys',
  Tencent: 'https://console.cloud.tencent.com/',
  Xiaomi: 'https://openrouter.ai/settings/keys',
  StepFun: 'https://platform.stepfun.com/account-info',
  MiniMax: 'https://www.minimaxi.com/user-center/basic-information/interface-key',
  Perplexity: 'https://www.perplexity.ai/settings/api',
};

// Maps a provider display name to its logo in /public/images/provider-logos;
// providers without a logo fall back to name-only chips
const PROVIDER_LOGOS: Record<string, string> = {
  Anthropic: 'anthropic.png',
  OpenAI: 'openai.png',
  'Azure OpenAI': 'azure-openai-service.png',
  Google: 'gemini.png',
  'Google AI Studio': 'gemini.png',
  'Vertex AI': 'gemini.png',
  OpenRouter: 'openrouter.png',
  Groq: 'groqcloud.png',
  Together: 'together-ai.png',
  Ollama: 'ollama.png',
  Mistral: 'mistral-ai.png',
  MoonshotAI: 'moonshot-ai.png',
  Alibaba: 'tongyi.png',
  'Z.ai': 'zhipu-ai.png',
};

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
  const { setChatModelProvider } = useChat();
  const [activeModel, setActiveModel] = useState<string>(
    `${localStorage.getItem('chatModelProviderId')}/${localStorage.getItem('chatModelKey')}`,
  );
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<{ name: string; keyUrl: string }>({ name: '', keyUrl: '' });

  const selectModel = (providerId: string, modelKey: string, modelName: string) => {
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
    setChatModelProvider({ providerId, key: modelKey });
    setActiveModel(`${providerId}/${modelKey}`);
    window.dispatchEvent(new Event('chat-model-changed'));
    toast.success(`${modelName} is now the active chat model`);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
  };

  const family = ALL_FAMILIES[selectedIndex];
  const isOtherSelected = family?.model_family === 'Other';

  const connectedKeys = new Set(connectedProviders.map(p => p.type));

  const isProviderConnected = (providerName: string) => {
    const key = PROVIDER_NAME_TO_KEY[providerName];
    return key ? connectedKeys.has(key) : false;
  };

  const hasSomeConnected = family?.providers.some(isProviderConnected);

  const matchesAnyFamily = (modelKey: string) =>
    MODEL_FAMILIES.some(f =>
      f.modelKeywords.some(kw => modelKey.toLowerCase().includes(kw.toLowerCase())),
    );

  const matchesFamily = (modelKey: string) =>
    isOtherSelected
      ? !matchesAnyFamily(modelKey)
      : family?.modelKeywords.some(kw => modelKey.toLowerCase().includes(kw.toLowerCase()));


  // Connected providers that have at least one model matching this family
  const variantsByProvider: { provider: ConfigModelProvider; models: { name: string; key: string }[] }[] =
    connectedProviders
      .map(p => ({
        provider: p,
        models: p.chatModels.filter(m => m.key !== 'error' && matchesFamily(m.key)),
      }))
      .filter(g => g.models.length > 0);

  const getActiveModelName = () => {
    for (const provider of variantsByProvider) {
      const model = provider.models.find(m => `${provider.provider.id}/${m.key}` === activeModel);
      if (model) return `${model.name} (${provider.provider.name})`;
    }
    return 'Not selected';
  };

  return (
    <div className="flex flex-col gap-4 px-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-black/70 dark:text-white/70">

          Active: <span className="font-medium text-sky-600 dark:text-sky-400">{getActiveModelName()}</span>
        </p>
      </div>

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
          {ALL_FAMILIES.map((f, i) => {
            const isOther = f.model_family === 'Other';
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
                {f.open && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 z-10" />
                )}
                {isOther ? (
                  <div
                    className="w-14 h-14 flex items-center justify-center rounded-full bg-light-secondary/50 dark:bg-dark-secondary/50"
                  >
                    <Blocks size={28} className="text-black/40 dark:text-white/40" />
                  </div>
                ) : (
                  <img
                    src={`https://i.imgur.com/${f.imgur}.png`}
                    alt={f.model_family}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover shadow-md"
                    style={{ objectPosition: 'center 20%' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
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
        <div className="flex flex-row items-start gap-4 p-4 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary/20 dark:bg-dark-secondary/20">
          {isOtherSelected ? (
            <div
              className="rounded-full flex-none flex items-center justify-center bg-light-secondary/50 dark:bg-dark-secondary/50"
              style={{ width: 200, height: 200 }}
            >
              <Blocks size={64} className="text-black/30 dark:text-white/30" />
            </div>
          ) : (
            <img
              src={`https://i.imgur.com/${family.imgur}.png`}
              alt={family.model_family}
              width={200}
              height={200}
              className="rounded-full flex-none object-cover shadow-lg"
              style={{ width: 200, height: 200, objectPosition: 'center 20%' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {/* Right column: name + meta + providers + variants */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Header row: name + meta + action */}
            <div className="flex flex-row items-start gap-4">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-black dark:text-white">{family.model_family}</p>
                  {family.open && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">
                      Open
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-black/50 dark:text-white/50">
                  {isOtherSelected
                    ? 'Models that don\'t match any of the families above'
                    : `by ${family.maker} · ${family.flagship}`}
                </p>
              </div>
            </div>

            {/* Provider chips */}
            {family.providers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {family.providers.map((providerName) => {
                const connected = isProviderConnected(providerName);
                const logo = PROVIDER_LOGOS[providerName];
                const keyUrl = PROVIDER_API_KEY_URLS[providerName];
                return (
                  <div
                    key={providerName}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                      connected
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-light-200 dark:border-dark-200 bg-light-secondary/50 dark:bg-dark-secondary/50'
                    }`}
                    title={providerName}
                  >
                    {logo && (
                      <img
                        src={`/images/provider-logos/${logo}`}
                        alt={`${providerName} logo`}
                        width={150}
                        height={40}
                        className="flex-none object-contain rounded-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    {keyUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProvider({ name: providerName, keyUrl });
                          setKeyModalOpen(true);
                        }}
                        className="flex-none text-black/30 dark:text-white/30 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
                        title={`Configure ${providerName} API key`}
                      >
                        <KeyRound size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {/* Connect button for this family's primary provider if not yet connected */}
            {!hasSomeConnected && family.providerKey && modelProviders.some(p => p.key === family.providerKey) && (
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-black/40 dark:text-white/40 flex-1">
                  Enable a provider to use {family.model_family} models
                </p>
                <AddProvider
                  modelProviders={modelProviders}
                  setProviders={setProviders}
                  defaultProviderKey={family.providerKey}
                  compact
                />
              </div>
            )}

            {/* Available variants from connected providers */}
            {variantsByProvider.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-light-200 dark:border-dark-200 pt-3 mt-1">
                <p className="text-[10px] font-medium text-black/50 dark:text-white/50 uppercase tracking-wide">
                  Available from your connections
                </p>
                {variantsByProvider.map(({ provider, models }) => (
                  <div key={provider.id} className="flex flex-col gap-1">
                    <p className="text-[10px] text-black/40 dark:text-white/40">{provider.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {models.map(m => {
                        const isActive = activeModel === `${provider.id}/${m.key}`;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => selectModel(provider.id, m.key, m.name)}
                            className={`px-2 py-0.5 rounded-md text-[10px] border font-mono transition-colors cursor-pointer ${
                              isActive
                                ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                : 'bg-light-secondary/60 dark:bg-dark-secondary/60 border-light-200 dark:border-dark-200 text-black/70 dark:text-white/70 hover:border-sky-500/50 hover:text-sky-600 dark:hover:text-sky-400'
                            }`}
                            title={isActive ? `${m.key} (active)` : `Set ${m.key} as active model`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfigureKeyModal
        open={keyModalOpen}
        onOpenChange={setKeyModalOpen}
        providerName={selectedProvider.name}
        keyUrl={selectedProvider.keyUrl}
      />
    </div>
  );
};

export default ModelFamiliesCarousel;

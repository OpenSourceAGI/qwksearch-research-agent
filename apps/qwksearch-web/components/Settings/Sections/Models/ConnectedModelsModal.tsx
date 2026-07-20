import { X, Plus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConfigModelProvider } from '../../../../lib/config/types';
import TestModelsButton from './TestModelsButton';

interface ModelFamilyGroup {
  family: string;
  models: Array<{
    name: string;
    key: string;
    providerId: string;
    providerName: string;
    providerType: string;
    apiKey: string;
  }>;
}

const MODEL_FAMILY_KEYWORDS: Record<string, string[]> = {
  'Claude': ['claude'],
  'GPT': ['gpt', 'o1', 'o3', 'o4'],
  'Gemini': ['gemini'],
  'Grok': ['grok', 'x-ai/'],
  'Perplexity': ['perplexity', 'sonar'],
  'DeepSeek': ['deepseek'],
  'Kimi': ['kimi', 'moonshot'],
  'Llama': ['llama', 'meta-llama'],
  'Nemotron': ['nemotron'],
  'Mistral': ['mistral', 'mixtral'],
  'MiMo': ['mimo', 'xiaomi/'],
  'MiniMax': ['minimax', 'abab'],
  'Qwen': ['qwen'],
  'GLM': ['glm', 'zhipuai/'],
  'Hunyuan': ['hunyuan', 'tencent/'],
  'StepFun': ['step-', 'stepfun/'],
};

const OPEN_SOURCE_KEYWORDS = ['llama', 'mistral', 'mixtral', 'deepseek', 'qwen', 'gemma', 'phi', 'yi', 'neural-chat', 'code-llama', 'neural-tale'];
const CLOSED_SOURCE_KEYWORDS = ['claude', 'gpt', 'gemini', 'grok', 'perplexity', 'sonar', 'kimi', 'moonshot', 'nemotron', 'minimax', 'abab', 'glm', 'zhipuai', 'hunyuan', 'tencent', 'step-', 'stepfun'];

const isOpenSource = (modelKey: string): boolean => {
  const lowercaseKey = modelKey.toLowerCase();
  for (const keyword of OPEN_SOURCE_KEYWORDS) {
    if (lowercaseKey.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  for (const keyword of CLOSED_SOURCE_KEYWORDS) {
    if (lowercaseKey.includes(keyword.toLowerCase())) {
      return false;
    }
  }
  return false;
};

const getFamilyForModel = (modelKey: string): string => {
  const lowercaseKey = modelKey.toLowerCase();
  for (const [family, keywords] of Object.entries(MODEL_FAMILY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowercaseKey.includes(keyword.toLowerCase())) {
        return family;
      }
    }
  }
  return 'Other';
};

const ConnectedModelsModal = ({
  open,
  onOpenChange,
  providers,
  onAddConnection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: ConfigModelProvider[];
  onAddConnection?: () => void;
}) => {
  const modelsByFamily: Record<string, ModelFamilyGroup['models']> = {};

  providers.forEach((provider) => {
    provider.chatModels
      .filter((m) => m.key !== 'error')
      .forEach((model) => {
        const family = getFamilyForModel(model.key);
        if (!modelsByFamily[family]) {
          modelsByFamily[family] = [];
        }
        modelsByFamily[family].push({
          name: model.name,
          key: model.key,
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          apiKey: provider.config?.apiKey || '',
        });
      });
  });

  const sortedFamilies = Object.entries(modelsByFamily)
    .sort(([a], [b]) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    })
    .map(([family, models]) => ({ family, models }));

  const openSourceModels = sortedFamilies.filter(({ models }) =>
    models.some(m => isOpenSource(m.key))
  );
  const closedSourceModels = sortedFamilies.filter(({ models }) =>
    models.some(m => !isOpenSource(m.key))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[85vh] flex flex-col border bg-light-primary dark:bg-dark-primary border-light-secondary dark:border-dark-secondary p-0" hideCloseButton>
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-black/90 dark:text-white/90 font-medium text-sm">
            All Configured Models
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="border-t border-light-200 dark:border-dark-200" />
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sortedFamilies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed border-light-200 dark:border-dark-200 bg-light-secondary/20 dark:bg-dark-secondary/20">
              <p className="text-sm text-black/50 dark:text-white/50 text-center">
                No models configured. Add a connection to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {openSourceModels.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-black/90 dark:text-white/90 border-l-4 border-green-500 pl-3">
                    Open Source
                  </h2>
                  <div className="flex flex-col gap-3">
                    {openSourceModels.map(({ family, models }) => (
                      <div key={family} className="flex flex-col gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-black/70 dark:text-white/70">
                          {family}
                        </h3>
                        <div className="flex flex-col gap-2">
                          {models.filter(m => isOpenSource(m.key)).map((model) => (
                            <div
                              key={`${model.providerId}-${model.key}`}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-800/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-black/80 dark:text-white/80">
                                    {model.name}
                                  </p>
                                  <code className="text-[11px] text-black/50 dark:text-white/50 bg-light-secondary dark:bg-dark-secondary px-2 py-1 rounded font-mono">
                                    {model.key}
                                  </code>
                                </div>
                                <p className="text-xs text-black/50 dark:text-white/50">
                                  {model.providerName}
                                </p>
                              </div>
                              <TestModelsButton
                                providerId={model.providerId}
                                providerType={model.providerType}
                                providerName={model.providerName}
                                apiKey={model.apiKey}
                                compact
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {closedSourceModels.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-black/90 dark:text-white/90 border-l-4 border-blue-500 pl-3">
                    Closed Source
                  </h2>
                  <div className="flex flex-col gap-3">
                    {closedSourceModels.map(({ family, models }) => (
                      <div key={family} className="flex flex-col gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-black/70 dark:text-white/70">
                          {family}
                        </h3>
                        <div className="flex flex-col gap-2">
                          {models.filter(m => !isOpenSource(m.key)).map((model) => (
                            <div
                              key={`${model.providerId}-${model.key}`}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-black/80 dark:text-white/80">
                                    {model.name}
                                  </p>
                                  <code className="text-[11px] text-black/50 dark:text-white/50 bg-light-secondary dark:bg-dark-secondary px-2 py-1 rounded font-mono">
                                    {model.key}
                                  </code>
                                </div>
                                <p className="text-xs text-black/50 dark:text-white/50">
                                  {model.providerName}
                                </p>
                              </div>
                              <TestModelsButton
                                providerId={model.providerId}
                                providerType={model.providerType}
                                providerName={model.providerName}
                                apiKey={model.apiKey}
                                compact
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {onAddConnection && (
          <>
            <div className="border-t border-light-200 dark:border-dark-200" />
            <div className="px-6 py-4 flex justify-end">
              <button
                onClick={onAddConnection}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] bg-sky-500 text-white font-medium hover:opacity-85 active:scale-95 transition duration-200"
              >
                <Plus size={16} />
                Add Connection
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConnectedModelsModal;

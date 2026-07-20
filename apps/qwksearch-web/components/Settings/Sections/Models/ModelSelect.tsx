import { ConfigModelProvider } from '../../../../lib/config/types';
import { useChat } from 'research-agent-ui';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Cpu, Search } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../../ui/popover';

type ModelCategory = 'all' | 'capable' | 'balanced' | 'fast' | 'specialized';

const CATEGORY_NAMES: Record<ModelCategory, string> = {
  all: 'All Models',
  capable: 'Most Capable',
  balanced: 'Balanced',
  fast: 'Fast',
  specialized: 'Specialized',
};

// Categorize models based on name patterns
const categorizeModel = (modelName: string): ModelCategory => {
  const lowerName = modelName.toLowerCase();

  if (
    lowerName.includes('opus') ||
    lowerName.includes('gpt-4o') ||
    lowerName.includes('o1') ||
    lowerName.includes('o3') ||
    lowerName.includes('claude-3-opus')
  ) {
    return 'capable';
  }

  if (
    lowerName.includes('haiku') ||
    lowerName.includes('gpt-3.5') ||
    lowerName.includes('flash') ||
    lowerName.includes('mini') ||
    lowerName.includes('claude-3-haiku')
  ) {
    return 'fast';
  }

  if (
    lowerName.includes('reasoner') ||
    lowerName.includes('coder') ||
    lowerName.includes('deepseek-reasoner')
  ) {
    return 'specialized';
  }

  return 'balanced';
};

const ModelSelect = ({
  providers,
  type,
}: {
  providers: ConfigModelProvider[];
  type: 'chat';
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(
    `${localStorage.getItem('chatModelProviderId')}/${localStorage.getItem('chatModelKey')}`,
  );
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('all');
  const { setChatModelProvider } = useChat();

  // Stay in sync when the model is changed elsewhere (e.g. the families carousel)
  useEffect(() => {
    const syncFromStorage = () =>
      setSelectedModel(
        `${localStorage.getItem('chatModelProviderId')}/${localStorage.getItem('chatModelKey')}`,
      );
    window.addEventListener('chat-model-changed', syncFromStorage);
    return () =>
      window.removeEventListener('chat-model-changed', syncFromStorage);
  }, []);

  const handleSave = async (providerId: string, modelKey: string) => {
    setLoading(true);
    setSelectedModel(`${providerId}/${modelKey}`);
    setOpen(false);

    try {
      localStorage.setItem('chatModelProviderId', providerId);
      localStorage.setItem('chatModelKey', modelKey);

      setChatModelProvider({
        providerId: providerId,
        key: modelKey,
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setLoading(false);
    }
  };

  const [selectedProviderId, selectedModelKey] = selectedModel.split('/');

  const selectedLabel = useMemo(() => {
    const provider = providers.find((p) => p.id === selectedProviderId);
    const model = provider?.chatModels.find((m) => m.key === selectedModelKey);
    return provider && model
      ? `${provider.name} - ${model.name}`
      : 'Select a model';
  }, [providers, selectedProviderId, selectedModelKey]);

  const filteredProviders = providers
    .map((provider) => ({
      ...provider,
      chatModels: provider.chatModels.filter((model) => {
        const matchesSearch =
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === 'all' ||
          categorizeModel(model.name) === selectedCategory;

        return matchesSearch && matchesCategory;
      }),
    }))
    .filter((provider) => provider.chatModels.length > 0);

  return (
    <section className="rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80">
      <div className="space-y-3 lg:space-y-5">
        <div>
          <h4 className="text-sm lg:text-sm text-black dark:text-white">
            Select Chat Model
          </h4>
          <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
            Choose which model to use for generating responses
          </p>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            type="button"
            disabled={loading}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs lg:text-[13px] shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] p-0"
          >
            <div className="bg-popover max-h-[450px] border rounded-lg border-border w-full flex flex-col shadow-lg overflow-hidden">
              <div className="p-3 border-b border-border space-y-2.5">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg placeholder:text-sm text-sm text-popover-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-transparent focus:border-sky-500/30 transition duration-200"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(CATEGORY_NAMES) as [ModelCategory, string][]).map(
                    ([category, name]) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-md transition-colors duration-200',
                          selectedCategory === category
                            ? 'bg-sky-500 text-white'
                            : 'bg-secondary text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {name}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="max-h-[320px] overflow-y-auto">
                {filteredProviders.length === 0 ? (
                  <div className="text-center py-16 px-4 text-muted-foreground text-sm">
                    {searchQuery ? 'No models found' : 'No chat models configured'}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {filteredProviders.map((provider, providerIndex) => (
                      <div key={provider.id}>
                        <div className="px-4 py-2.5 sticky top-0 bg-popover border-b border-border/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            {provider.name}
                          </p>
                        </div>

                        <div className="flex flex-col px-2 py-2 space-y-0.5">
                          {provider.chatModels.map((model) => {
                            const isSelected =
                              selectedProviderId === provider.id &&
                              selectedModelKey === model.key;
                            return (
                              <button
                                key={model.key}
                                type="button"
                                onClick={() => handleSave(provider.id, model.key)}
                                className={cn(
                                  'px-3 py-2 flex items-center justify-between text-start duration-200 cursor-pointer transition rounded-lg group',
                                  isSelected ? 'bg-secondary' : 'hover:bg-secondary',
                                )}
                              >
                                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                  <Cpu
                                    size={15}
                                    className={cn(
                                      'shrink-0',
                                      isSelected
                                        ? 'text-sky-500'
                                        : 'text-muted-foreground group-hover:text-popover-foreground',
                                    )}
                                  />
                                  <p
                                    className={cn(
                                      'text-sm truncate',
                                      isSelected
                                        ? 'text-sky-500 font-medium'
                                        : 'text-popover-foreground/70 group-hover:text-popover-foreground',
                                    )}
                                  >
                                    {model.name}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {providerIndex < filteredProviders.length - 1 && (
                          <div className="h-px bg-border" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
};

export default ModelSelect;

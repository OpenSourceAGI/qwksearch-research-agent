/**
 * Popover model picker with text search and speed/capability filter tabs (All/Most Capable/Balanced/Fast/Specialized)
 * used in the empty-state homepage input.
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Cpu, Loader2, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import grab from 'grab-url';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../ui/popover';
import { MinimalProvider } from 'chat-agent-toolkit/models/types';
import { useChat } from '../../hooks/useChat';

type ModelCategory = 'all' | 'capable' | 'balanced' | 'fast' | 'specialized';

const CATEGORY_NAMES: Record<ModelCategory, string> = {
  all: 'All Models',
  capable: 'Most Capable',
  balanced: 'Balanced',
  fast: 'Fast',
  specialized: 'Specialized'
};

// Helper function to categorize models based on name patterns
const categorizeModel = (modelName: string): ModelCategory => {
  const lowerName = modelName.toLowerCase();

  // Most capable - Opus, GPT-4o, o1, o3, large models
  if (lowerName.includes('opus') || lowerName.includes('gpt-4o') ||
    lowerName.includes('o1') || lowerName.includes('o3') ||
    lowerName.includes('claude-3-opus')) {
    return 'capable';
  }

  // Fast - Haiku, GPT-3.5, flash, mini models
  if (lowerName.includes('haiku') || lowerName.includes('gpt-3.5') ||
    lowerName.includes('flash') || lowerName.includes('mini') ||
    lowerName.includes('claude-3-haiku')) {
    return 'fast';
  }

  // Specialized - reasoning, code-specific, deepseek-reasoner
  if (lowerName.includes('reasoner') || lowerName.includes('coder') ||
    lowerName.includes('deepseek-reasoner')) {
    return 'specialized';
  }

  // Balanced - Sonnet, GPT-4, standard models
  return 'balanced';
};

const ModelSelector = () => {
  const [providers, setProviders] = useState<MinimalProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('all');

  const { setChatModelProvider, chatModelProvider } = useChat();

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setIsLoading(true);
        const data: { providers: MinimalProvider[] } = await grab('/api/agent/providers');
        setProviders(data.providers);
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviders();
  }, []);

  const orderedProviders = useMemo(() => {
    if (!chatModelProvider?.providerId) return providers;

    const currentProviderIndex = providers.findIndex(
      (p) => p.id === chatModelProvider.providerId,
    );

    if (currentProviderIndex === -1) {
      return providers;
    }

    const selectedProvider = providers[currentProviderIndex];
    const remainingProviders = providers.filter(
      (_, index) => index !== currentProviderIndex,
    );

    return [selectedProvider, ...remainingProviders];
  }, [providers, chatModelProvider]);

  const handleModelSelect = (providerId: string, modelKey: string) => {
    setChatModelProvider({ providerId, key: modelKey });
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
  };

  const filteredProviders = orderedProviders
    .map((provider) => ({
      ...provider,
      chatModels: provider.chatModels.filter(
        (model) => {
          // Filter by search query
          const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            provider.name.toLowerCase().includes(searchQuery.toLowerCase());

          // Filter by category
          const matchesCategory = selectedCategory === 'all' ||
            categorizeModel(model.name) === selectedCategory;

          return matchesSearch && matchesCategory;
        }
      ),
    }))
    .filter((provider) => provider.chatModels.length > 0);

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="active:border-none hover:bg-light-200  hover:dark:bg-dark-200 p-2 rounded-lg focus:outline-none data-[state=open]:text-black dark:data-[state=open]:text-white text-black/50 dark:text-white/50 active:scale-95 transition duration-200 hover:text-black dark:hover:text-white"
      >
        <Cpu size={16} className="text-sky-500" />
      </PopoverTrigger>
      <PopoverContent className="w-[230px] sm:w-[270px] md:w-[300px] p-0">
        <div className="bg-popover max-h-[450px] sm:max-w-none border rounded-lg border-border w-full flex flex-col shadow-lg overflow-hidden">
          <div className="p-4 border-b border-border space-y-3">
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

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(CATEGORY_NAMES) as [ModelCategory, string][]).map(([category, name]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-md transition-colors duration-200',
                    selectedCategory === category
                      ? 'bg-sky-500 text-white'
                      : 'bg-secondary text-muted-foreground hover:bg-accent'
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2
                  className="animate-spin text-muted-foreground"
                  size={24}
                />
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="text-center py-16 px-4 text-muted-foreground text-sm">
                {searchQuery
                  ? 'No models found'
                  : 'No chat models configured'}
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
                      {provider.chatModels.map((model) => (
                        <button
                          key={model.key}
                          onClick={() =>
                            handleModelSelect(provider.id, model.key)
                          }
                          type="button"
                          className={cn(
                            'px-3 py-2 flex items-center justify-between text-start duration-200 cursor-pointer transition rounded-lg group',
                            chatModelProvider?.providerId === provider.id &&
                              chatModelProvider?.key === model.key
                              ? 'bg-secondary'
                              : 'hover:bg-secondary',
                          )}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <Cpu
                              size={15}
                              className={cn(
                                'shrink-0',
                                chatModelProvider?.providerId ===
                                  provider.id &&
                                  chatModelProvider?.key === model.key
                                  ? 'text-sky-500'
                                  : 'text-muted-foreground group-hover:text-popover-foreground',
                              )}
                            />
                            <p
                              className={cn(
                                'text-sm truncate',
                                chatModelProvider?.providerId ===
                                  provider.id &&
                                  chatModelProvider?.key === model.key
                                  ? 'text-sky-500 font-medium'
                                  : 'text-popover-foreground/70 group-hover:text-popover-foreground',
                              )}
                            >
                              {model.name}
                            </p>
                          </div>
                        </button>
                      ))}
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
  );
};

export default ModelSelector;

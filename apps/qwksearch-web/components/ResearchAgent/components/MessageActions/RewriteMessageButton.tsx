/**
 * Button that opens a searchable provider/model picker popover and regenerates the selected
 * assistant message using the chosen model.
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, Cpu, Search } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MinimalProvider } from 'chat-agent-toolkit/models/types';
import { Icons } from '../MessageComposer/MessageInputIconSet';
import grab from 'grab-url';
import { useChat } from '@/components/ResearchAgent/hooks/useChat';

const Rewrite = ({ messageId }: { messageId: string }) => {
  const { rewrite, chatModelProvider, setChatModelProvider } = useChat();
  const [providers, setProviders] = useState<MinimalProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const orderedProviders = useMemo(() => {
    if (!chatModelProvider?.providerId) return providers;
    const currentProviderIndex = providers.findIndex(
      (p) => p.id === chatModelProvider.providerId,
    );
    if (currentProviderIndex === -1) return providers;
    const selectedProvider = providers[currentProviderIndex];
    const remainingProviders = providers.filter(
      (_, index) => index !== currentProviderIndex,
    );
    return [selectedProvider, ...remainingProviders];
  }, [providers, chatModelProvider]);

  const filteredProviders = orderedProviders
    .map((provider) => ({
      ...provider,
      chatModels: (provider.chatModels ?? []).filter(
        (model) =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((provider) => provider.chatModels.length > 0);

  const currentModelName = useMemo(() => {
    if (!chatModelProvider.key) return 'Rewrite';
    for (const provider of providers) {
      const model = provider.chatModels.find(
        (m) => m.key === chatModelProvider.key,
      );
      if (model) return model.name;
    }
    return chatModelProvider.key;
  }, [providers, chatModelProvider.key]);

  const handleModelSelect = (providerId: string, modelKey: string) => {
    setChatModelProvider({ providerId, key: modelKey });
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
    setOpen(false);
    rewrite(messageId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button className="p-2 text-muted-foreground rounded-full backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition duration-200 hover:text-foreground">
              <ArrowLeftRight size={18} />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Rewrite with {currentModelName}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-[280px] p-0"
        align="start"
        side="top"
        sideOffset={8}
      >
        <div className="bg-white dark:bg-[#212121] max-h-[400px] border rounded-2xl border-[#DDDDDD] dark:border-[#30302E] w-full flex flex-col shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-[#EEEEEE] dark:border-[#30302E]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-400 dark:text-[#999999]"
              />
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-bg-100 dark:bg-[#30302E] border border-bg-300 dark:border-[#404040] rounded-lg text-text-100 dark:text-[#ECECEC] placeholder:text-text-400 dark:placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/30 transition-all"
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Icons.Loader2
                  className="animate-spin text-text-400 dark:text-[#999999]"
                  size={20}
                />
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="text-center py-12 px-4 text-text-400 dark:text-[#999999] text-sm">
                {searchQuery ? 'No models found' : 'No chat models configured'}
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredProviders.map((provider, providerIndex) => (
                  <div key={provider.id}>
                    <div className="px-4 py-2 sticky top-0 bg-white dark:bg-[#212121] border-b border-[#EEEEEE]/50 dark:border-[#30302E]/50">
                      <p className="text-[11px] text-text-400 dark:text-[#999999] uppercase tracking-wider font-medium">
                        {provider.name}
                      </p>
                    </div>
                    <div className="flex flex-col px-1.5 py-1.5 space-y-0.5">
                      {provider.chatModels.map((model) => (
                        <button
                          key={model.key}
                          onClick={() =>
                            handleModelSelect(provider.id, model.key)
                          }
                          type="button"
                          className={cn(
                            'px-3 py-2 flex items-center justify-between text-start duration-200 cursor-pointer transition rounded-xl group',
                            chatModelProvider?.providerId === provider.id &&
                              chatModelProvider?.key === model.key
                              ? 'bg-sky-50 dark:bg-sky-500/10'
                              : 'hover:bg-bg-100 dark:hover:bg-[#30302E]',
                          )}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <Cpu
                              size={14}
                              className={cn(
                                'shrink-0',
                                chatModelProvider?.providerId === provider.id &&
                                  chatModelProvider?.key === model.key
                                  ? 'text-sky-500'
                                  : 'text-text-400 dark:text-[#999999] group-hover:text-text-300 dark:group-hover:text-[#B4B4B4]',
                              )}
                            />
                            <p
                              className={cn(
                                'text-[13px] truncate',
                                chatModelProvider?.providerId === provider.id &&
                                  chatModelProvider?.key === model.key
                                  ? 'text-sky-600 dark:text-sky-400 font-medium'
                                  : 'text-text-200 dark:text-[#ECECEC] group-hover:text-text-100 dark:group-hover:text-white',
                              )}
                            >
                              {model.name}
                            </p>
                          </div>
                          {chatModelProvider?.providerId === provider.id &&
                            chatModelProvider?.key === model.key && (
                              <Icons.Check className="w-4 h-4 text-sky-500 shrink-0" />
                            )}
                        </button>
                      ))}
                    </div>
                    {providerIndex < filteredProviders.length - 1 && (
                      <div className="h-px bg-[#EEEEEE] dark:bg-[#30302E] mx-2" />
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

export default Rewrite;

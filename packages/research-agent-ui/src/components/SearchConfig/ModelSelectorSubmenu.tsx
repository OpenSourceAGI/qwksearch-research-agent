/**
 * Dropdown submenu variant of the AI model picker (provider-grouped list with checkmark) used inside
 * the FileUploadDropdown settings menu; includes an "Add model" link to the settings page.
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Cpu, Plus, Loader2 } from 'lucide-react';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { MinimalProvider } from 'chat-agent-toolkit/models/types';
import { useChat } from '../../hooks/useChat';
import { listProviders } from 'qwksearch-api-client';
import { useRouter } from 'next/navigation';

export const ModelSelectorSubmenu: React.FC = () => {
  const { chatModelProvider, setChatModelProvider } = useChat();
  const [providers, setProviders] = useState<MinimalProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setIsLoading(true);
        const { data } = await listProviders();
        const providersList = (data?.providers as unknown as MinimalProvider[]) ?? [];
        setProviders(providersList);
        if (!chatModelProvider.key && providersList.length > 0) {
          const savedKey = localStorage.getItem('chatModelKey');
          const savedProviderId = localStorage.getItem('chatModelProviderId');
          if (savedKey && savedProviderId) {
            setChatModelProvider({ key: savedKey, providerId: savedProviderId });
          } else {
            const firstProvider = providersList.find(p => p.chatModels.length > 0);
            if (firstProvider) {
              setChatModelProvider({ key: firstProvider.chatModels[0].key, providerId: firstProvider.id });
            }
          }
        }
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProviders();
  }, []);

  const currentModelName = useMemo(() => {
    if (!chatModelProvider.key) return 'Select';
    for (const provider of providers) {
      const model = provider.chatModels.find(m => m.key === chatModelProvider.key);
      if (model) return model.name;
    }
    return chatModelProvider.key;
  }, [providers, chatModelProvider.key]);

  const handleModelSelect = (providerId: string, modelKey: string) => {
    setChatModelProvider({ providerId, key: modelKey });
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Cpu className="w-4 h-4 flex-shrink-0 text-sky-500" />
        <span>Model</span>
        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[55px]">{currentModelName}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-52 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : providers.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No models configured</div>
        ) : (
          providers.map((provider, providerIndex) => (
            <div key={provider.id}>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {provider.name}
              </DropdownMenuLabel>
              {provider.chatModels.map((model) => (
                <DropdownMenuItem
                  key={model.key}
                  onSelect={() => handleModelSelect(provider.id, model.key)}
                  className={cn(
                    'gap-2',
                    chatModelProvider?.providerId === provider.id && chatModelProvider?.key === model.key && 'bg-secondary'
                  )}
                >
                  <Cpu
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      chatModelProvider?.providerId === provider.id && chatModelProvider?.key === model.key
                        ? 'text-sky-500'
                        : 'text-muted-foreground'
                    )}
                  />
                  <span className="truncate">{model.name}</span>
                  {chatModelProvider?.providerId === provider.id && chatModelProvider?.key === model.key && (
                    <svg className="w-3 h-3 text-primary ml-auto shrink-0" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </DropdownMenuItem>
              ))}
              {providerIndex < providers.length - 1 && <DropdownMenuSeparator />}
            </div>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push('/settings?section=models')}
          className="gap-2"
        >
          <Plus className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
          <span>Add model</span>
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

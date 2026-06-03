/**
 * Full-featured popover model selector with text search, provider grouping, checkmark for the active model,
 * and an "Add model" footer link; accepts optional external props to work in standalone contexts.
 */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Cpu, Search, Plus } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MinimalProvider } from "ai-research-agent/models/types";
import { Icons } from "../MessageComposer/MessageInputIconSet";
import { ChatModelProvider } from "@/types/chat";
import { useChat } from "@/components/ResearchAgent/hooks/useChat";
import grab from "grab-url";
import { useRouter } from "next/navigation";

interface ModelSelectorProps {
    chatModelProvider?: ChatModelProvider;
    onSelect?: (provider: ChatModelProvider) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ chatModelProvider: propModelProvider, onSelect: propOnSelect }) => {
    const { chatModelProvider: contextModelProvider, setChatModelProvider } = useChat();
    const chatModelProvider = propModelProvider ?? contextModelProvider;
    const onSelect = propOnSelect ?? setChatModelProvider;
    const [providers, setProviders] = useState<MinimalProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const loadProviders = async () => {
            try {
                setIsLoading(true);
                const data: { providers: MinimalProvider[] } = await grab('agent/providers');
                setProviders(data.providers);

                // Set default model if none selected
                if (!chatModelProvider.key && data.providers.length > 0) {
                    const savedKey = localStorage.getItem('chatModelKey');
                    const savedProviderId = localStorage.getItem('chatModelProviderId');

                    if (savedKey && savedProviderId) {
                        onSelect({ key: savedKey, providerId: savedProviderId });
                    } else {
                        const firstProvider = data.providers.find(p => p.chatModels.length > 0);
                        if (firstProvider) {
                            onSelect({ key: firstProvider.chatModels[0].key, providerId: firstProvider.id });
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

    const orderedProviders = useMemo(() => {
        if (!chatModelProvider?.providerId) return providers;
        const currentProviderIndex = providers.findIndex(p => p.id === chatModelProvider.providerId);
        if (currentProviderIndex === -1) return providers;
        const selectedProvider = providers[currentProviderIndex];
        const remainingProviders = providers.filter((_, index) => index !== currentProviderIndex);
        return [selectedProvider, ...remainingProviders];
    }, [providers, chatModelProvider]);

    const filteredProviders = orderedProviders
        .map((provider) => ({
            ...provider,
            chatModels: provider.chatModels.filter(
                (model) => model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    provider.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        }))
        .filter((provider) => provider.chatModels.length > 0);

    const handleModelSelect = (providerId: string, modelKey: string) => {
        onSelect({ providerId, key: modelKey });
        localStorage.setItem('chatModelProviderId', providerId);
        localStorage.setItem('chatModelKey', modelKey);
    };

    // Get current model name for display
    const currentModelName = useMemo(() => {
        if (!chatModelProvider.key) return 'Select Model';
        for (const provider of providers) {
            const model = provider.chatModels.find(m => m.key === chatModelProvider.key);
            if (model) return model.name;
        }
        return chatModelProvider.key;
    }, [providers, chatModelProvider.key]);

    const handleAddModel = () => {
        setIsPopoverOpen(false);
        router.push('/settings?section=models');
    };

    return (
        <>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger
                    type="button"
                    className="inline-flex items-center justify-center relative shrink-0 transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 rounded-xl px-2 md:px-3 md:min-w-[4rem] active:scale-[0.98] whitespace-nowrap text-xs gap-1.5 text-text-300 hover:text-text-200 hover:bg-bg-200 dark:text-[#B4B4B4] dark:hover:text-[#ECECEC] dark:hover:bg-[#454540] data-[state=open]:bg-bg-200 data-[state=open]:text-text-100 dark:data-[state=open]:bg-[#454540] dark:data-[state=open]:text-[#ECECEC]"
                >
                    <Cpu size={14} className="text-sky-500" />
                    <span className="hidden md:inline whitespace-nowrap select-none font-medium text-[13px] max-w-[60px] truncate">{currentModelName}</span>
                    <Icons.SelectArrow className="hidden md:block shrink-0 opacity-75 w-4 h-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="end" side="top" sideOffset={8}>
                    <div className="bg-white dark:bg-[#212121] max-h-[400px] border rounded-2xl border-[#DDDDDD] dark:border-[#30302E] w-full flex flex-col shadow-2xl overflow-hidden">
                        {/* Search Input */}
                        <div className="p-3 border-b border-[#EEEEEE] dark:border-[#30302E]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-400 dark:text-[#999999]" />
                                <input
                                    type="text"
                                    placeholder="Search models..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-[13px] bg-bg-100 dark:bg-[#30302E] border border-bg-300 dark:border-[#404040] rounded-lg text-text-100 dark:text-[#ECECEC] placeholder:text-text-400 dark:placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/30 transition-all"
                                />
                            </div>
                        </div>

                        {/* Model List */}
                        <div className="max-h-[320px] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Icons.Loader2 className="animate-spin text-text-400 dark:text-[#999999]" size={20} />
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
                                                        onClick={() => handleModelSelect(provider.id, model.key)}
                                                        type="button"
                                                        className={cn(
                                                            'px-3 py-2 flex items-center justify-between text-start duration-200 cursor-pointer transition rounded-xl group',
                                                            chatModelProvider?.providerId === provider.id && chatModelProvider?.key === model.key
                                                                ? 'bg-sky-50 dark:bg-sky-500/10'
                                                                : 'hover:bg-bg-100 dark:hover:bg-[#30302E]'
                                                        )}
                                                    >
                                                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                                            <Cpu
                                                                size={14}
                                                                className={cn(
                                                                    'shrink-0',
                                                                    chatModelProvider?.providerId === provider.id && chatModelProvider?.key === model.key
                                                                        ? 'text-sky-500'
                                                                        : 'text-text-400 dark:text-[#999999] group-hover:text-text-300 dark:group-hover:text-[#B4B4B4]'
                                                                )}
                                                            />
                                                            <p className={cn(
                                                                'text-[13px] truncate',
                                                                chatModelProvider?.providerId === provider.id && chatModelProvider?.key === model.key
                                                                    ? 'text-sky-600 dark:text-sky-400 font-medium'
                                                                    : 'text-text-200 dark:text-[#ECECEC] group-hover:text-text-100 dark:group-hover:text-white'
                                                            )}>
                                                                {model.name}
                                                            </p>
                                                        </div>
                                                        {chatModelProvider?.providerId === provider.id && chatModelProvider?.key === model.key && (
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

                        {/* Add Model Footer */}
                        <button
                            type="button"
                            onClick={handleAddModel}
                            className="flex items-center gap-2 px-4 py-2.5 border-t border-[#EEEEEE] dark:border-[#30302E] text-[13px] text-text-200 dark:text-[#ECECEC] hover:bg-bg-100 dark:hover:bg-[#30302E] transition-colors cursor-pointer"
                        >
                            <Plus size={14} className="text-sky-500 shrink-0" />
                            <span className="font-medium">Add model</span>
                        </button>
                    </div>
                </PopoverContent>
            </Popover>
        </>
    );
};

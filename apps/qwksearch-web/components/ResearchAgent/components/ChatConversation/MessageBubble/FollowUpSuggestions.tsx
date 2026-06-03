/**
 * Renders AI-generated follow-up question suggestions as clickable buttons below the last assistant response;
 * hidden while loading or for non-final messages.
 */
'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Section } from '@/components/ResearchAgent/hooks/useChat';

interface FollowUpSuggestionsProps {
    section: Section;
    isLast: boolean;
    loading: boolean;
    sendMessage: (suggestion: string) => void;
}

/**
 * Component for rendering follow-up question suggestions.
 * Only appears for the last assistant response when not loading.
 */
const FollowUpSuggestions = ({
    section,
    isLast,
    loading,
    sendMessage,
}: FollowUpSuggestionsProps) => {
    if (!isLast || !section.suggestions || section.suggestions.length === 0 || !section.assistantMessage || loading) {
        return null;
    }

    return (
        <div className="mt-8 pt-6 border-t border-border/50">
            <div className="space-y-0">
                {section.suggestions?.map((suggestion: string, i: number) => (
                    <div key={i}>
                        {i > 0 && <div className="h-px bg-border mx-3" />}
                        <button
                            onClick={() => sendMessage(suggestion)}
                            className="group w-full px-3 py-4 text-left transition-colors duration-200 cursor-pointer"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors duration-200 leading-relaxed">
                                    {suggestion}
                                </p>
                                <Plus
                                    size={16}
                                    className="text-muted-foreground/60 group-hover:text-primary transition-colors duration-200 flex-shrink-0"
                                />
                            </div>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FollowUpSuggestions;

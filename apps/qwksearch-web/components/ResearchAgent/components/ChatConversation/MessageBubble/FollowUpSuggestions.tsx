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
 * Always shows suggestions if they exist, regardless of loading state.
 */
const FollowUpSuggestions = ({
    section,
    isLast,
    loading,
    sendMessage,
}: FollowUpSuggestionsProps) => {
    // Always show suggestions if they exist, regardless of loading state
    if (!section.suggestions || section.suggestions.length === 0 || !section.assistantMessage) {
        return null;
    }

    return (
        <div className="mt-8 pt-6 border-t border-border/50">
            <div className="space-y-2">
                {section.suggestions?.map((suggestion: string, i: number) => (
                    <button
                        key={i}
                        onClick={() => sendMessage(suggestion)}
                        className="group w-full px-4 py-4 text-left transition-all duration-200 cursor-pointer rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-base font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200 leading-relaxed">
                                {suggestion}
                            </p>
                            <Plus
                                size={18}
                                className="text-muted-foreground/60 group-hover:text-primary transition-colors duration-200 flex-shrink-0"
                            />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FollowUpSuggestions;

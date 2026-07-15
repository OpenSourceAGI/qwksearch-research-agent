/**
 * Renders AI-generated follow-up question suggestions as clickable buttons below the last assistant response;
 * hidden while loading or for non-final messages. Supports keyboard shortcuts (1-5) to trigger suggestions.
 */
'use client';

import React, { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Section } from '../../../hooks/useChat';
import { Badge } from '../../../ui/badge';

interface FollowUpSuggestionsProps {
    section: Section;
    isLast: boolean;
    loading: boolean;
    sendMessage: (suggestion: string) => void;
}

/**
 * Component for rendering follow-up question suggestions.
 * Always shows suggestions if they exist, regardless of loading state.
 * Supports keyboard shortcuts 1-5 to trigger suggestions when not focused in an input.
 */
const FollowUpSuggestions = ({
    section,
    isLast,
    loading,
    sendMessage,
}: FollowUpSuggestionsProps) => {
    const suggestionsRef = useRef<string[]>([]);

    // Update the ref whenever suggestions change
    useEffect(() => {
        if (section.suggestions && section.suggestions.length > 0) {
            suggestionsRef.current = section.suggestions.slice(0, 5); // Limit to 5 for keyboard shortcuts
        }
    }, [section.suggestions]);

    // Set up keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only trigger if not focused in an input, textarea, or contenteditable element
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Check if key is 1-5
            const key = e.key;
            const num = parseInt(key);
            if (num >= 1 && num <= 5 && suggestionsRef.current.length >= num) {
                e.preventDefault();
                sendMessage(suggestionsRef.current[num - 1]);
            }
        };

        // Only add listener if this is the last section with suggestions
        if (isLast && suggestionsRef.current.length > 0) {
            window.addEventListener('keydown', handleKeyPress);
            return () => window.removeEventListener('keydown', handleKeyPress);
        }
    }, [isLast, sendMessage]);

    // Always show suggestions if they exist, regardless of loading state
    if (!section.suggestions || section.suggestions.length === 0 || !section.assistantMessage) {
        return null;
    }

    return (
        <div className="mt-8 pt-6 border-t border-border/50">
            <div className="space-y-2">
                {section.suggestions?.slice(0, 5).map((suggestion: string, i: number) => (
                    <button
                        key={i}
                        onClick={() => sendMessage(suggestion)}
                        className="group w-full px-4 py-4 text-left transition-all duration-200 cursor-pointer rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Badge
                                variant="secondary"
                                className="flex-shrink-0 h-6 w-6 p-0 flex items-center justify-center rounded-full text-sm font-semibold"
                            >
                                {i + 1}
                            </Badge>
                            <p className="flex-1 text-base font-medium text-muted-foreground group-hover:text-primary transition-colors duration-200 leading-relaxed">
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

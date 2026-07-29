/**
 * @fileoverview Collapsible panel that shows the AI's internal reasoning/thinking process extracted from `<think>` tags; auto-collapses once the thinking phase finishes.
 */
'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';

interface ThinkBoxProps {
  content: string;
  thinkingEnded: boolean;
}

/**
 * Component that renders the AI's "thinking process" or reasoning.
 * Usually displayed as a collapsible box above the assistant message.
 * 
 * @param content - The reasoning text content
 * @param thinkingEnded - Whether the thinking phase has finished
 * @returns {JSX.Element} The rendered reasoning panel
 */
const ThinkBox = ({ content, thinkingEnded }: ThinkBoxProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (thinkingEnded) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [thinkingEnded]);

  return (
    <div className="my-4 bg-secondary/50 rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-1 text-foreground/90 hover:bg-secondary transition duration-200"
      >
        <div className="flex items-center space-x-2">
          <BrainCircuit
            size={20}
            className="text-accent-foreground"
          />
          <p className="font-medium text-sm">Thinking Process</p>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={18} className="text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 py-3 text-foreground/80 text-sm border-t border-border bg-muted/50 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
};

export default ThinkBox;

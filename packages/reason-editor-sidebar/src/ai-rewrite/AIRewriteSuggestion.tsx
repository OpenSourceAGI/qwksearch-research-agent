/**
 * @module AIRewriteSuggestion
 * @description Displays an AI rewrite suggestion panel with approve/reject
 * actions and optional mode-badge regeneration controls.
 */
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { getRewriteModes, RewriteMode } from './rewriteModes';

/** Props for the {@link AIRewriteSuggestion} component. */
interface AIRewriteSuggestionProps {
  /** The original selected text before rewriting. */
  originalText: string;
  /** The AI-generated replacement text. */
  suggestedText: string;
  /** Called when the user accepts the suggestion. */
  onApprove: () => void;
  /** Called when the user rejects the suggestion. */
  onReject: () => void;
  /** Optional callback to regenerate with a different rewrite mode. */
  onRegenerate?: (mode: RewriteMode) => void;
  /** Whether to show a spinner instead of the suggestion panel. */
  isLoading?: boolean;
  /** ID of the currently selected rewrite mode, used to highlight the active badge. */
  currentMode?: string;
}

/**
 * Renders an AI suggestion card.
 *
 * Shows a spinner while `isLoading` is `true`. Once a suggestion is available
 * it displays the original text (struck-through), the suggested replacement,
 * mode-selection badges, and approve/reject action buttons.
 */
export const AIRewriteSuggestion = ({
  originalText,
  suggestedText,
  onApprove,
  onReject,
  onRegenerate,
  isLoading = false,
  currentMode,
}: AIRewriteSuggestionProps) => {
  const [modes, setModes] = useState<RewriteMode[]>([]);

  useEffect(() => {
    setModes(getRewriteModes());
  }, []);
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-popover p-3 shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Generating AI suggestion...</span>
      </div>
    );
  }

  /**
   * Maps a colour name to the corresponding Tailwind badge class string.
   * Falls back to `'blue'` for unknown colour values.
   *
   * @param color - Colour key (e.g. `'blue'`, `'purple'`, `'green'`).
   * @returns A Tailwind CSS class string for background, text, and border.
   */
  const getModeColor = (color?: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 border-blue-500/20',
      purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border-purple-500/20',
      green: 'bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/20 border-green-500/20',
      orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 border-orange-500/20',
      pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 hover:bg-pink-500/20 border-pink-500/20',
    };
    return colors[color || 'blue'] || colors.blue;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-sidebar-border">
        <div className="text-xs font-semibold text-sidebar-foreground mb-3">AI SUGGESTION</div>
        {onRegenerate && modes.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-2">Rewrite Mode:</div>
            <div className="flex flex-wrap gap-1">
              {modes.map((mode) => (
                <Badge
                  key={mode.id}
                  variant="outline"
                  className={cn(
                    'cursor-pointer text-xs px-2 py-0.5 transition-colors',
                    getModeColor(mode.color),
                    currentMode === mode.id && 'ring-2 ring-offset-1'
                  )}
                  onClick={() => onRegenerate(mode)}
                >
                  {mode.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">Original:</div>
          <div className="text-sm text-foreground/70 line-through bg-muted/50 p-3 rounded-md">{originalText}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">Suggested:</div>
          <div className="text-sm text-foreground font-medium bg-primary/10 p-3 rounded-md border border-primary/20">{suggestedText}</div>
        </div>
      </div>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onApprove}
            className="w-full h-9 bg-green-500 hover:bg-green-600 text-white"
            title="Approve"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            className="w-full h-9"
            title="Reject"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
};

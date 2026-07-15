/**
 * Toolbar with Ask AI, Suggest, Copy, Highlight, and Favorite buttons shown at the top of the article extract panel.
 */
import React from 'react';
import { Bot, MessageCircleQuestion, Clipboard, Star, Highlighter } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../lib/utils';

interface ArticleActionButtonsProps {
  isLoadingAI: boolean;
  isLoadingFollowups: boolean;
  isLoadingFavorite: boolean;
  isFavorited: boolean;
  isHighlightMode: boolean;
  onAskClick: () => void;
  onSuggestClick: () => void;
  onCopyClick: () => void;
  onFavoriteClick: () => void;
  onHighlightToggle: () => void;
}

const ArticleActionButtons: React.FC<ArticleActionButtonsProps> = ({
  isLoadingAI,
  isLoadingFollowups,
  isLoadingFavorite,
  isFavorited,
  isHighlightMode,
  onAskClick,
  onSuggestClick,
  onCopyClick,
  onFavoriteClick,
  onHighlightToggle,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-muted bg-gradient-to-b from-background to-muted/30 p-1 shadow-sm">
      <Button
        onClick={onAskClick}
        disabled={isLoadingAI}
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-2 px-3 h-9 rounded-xl transition-all duration-200",
          "hover:bg-muted/80 hover:text-foreground text-muted-foreground"
        )}
      >
        <Bot className="size-4" />
        <span className="font-medium">{isLoadingAI ? '...' : 'Ask'}</span>
      </Button>

      <Button
        onClick={onSuggestClick}
        disabled={isLoadingFollowups}
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-2 px-3 h-9 rounded-xl transition-all duration-200",
          "hover:bg-muted/80 hover:text-foreground text-muted-foreground"
        )}
      >
        <MessageCircleQuestion className="size-4" />
        <span className="font-medium">Suggest</span>
      </Button>

      <Button
        onClick={onCopyClick}
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-xl transition-all duration-200",
          "hover:bg-muted/80 hover:text-foreground text-muted-foreground"
        )}
      >
        <Clipboard className="size-4" />
      </Button>

      <Button
        onClick={onHighlightToggle}
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-xl transition-all duration-200",
          isHighlightMode
            ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50"
            : "hover:bg-muted/80 hover:text-foreground text-muted-foreground"
        )}
        title={isHighlightMode ? 'Disable highlighting' : 'Enable highlighting'}
      >
        <Highlighter className="size-4" />
      </Button>

      <Button
        onClick={onFavoriteClick}
        disabled={isLoadingFavorite}
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-xl transition-all duration-200",
          isFavorited
            ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
            : "hover:bg-muted/80 hover:text-foreground text-muted-foreground"
        )}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={cn(
            "size-4",
            isFavorited && "fill-yellow-400"
          )}
        />
      </Button>
    </div>
  );
};

export default ArticleActionButtons;

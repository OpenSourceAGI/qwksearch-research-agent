/**
 * Toolbar with Ask AI, Suggest, Copy, Highlight, Favorite, Open-in-new-tab, and Close buttons
 * shown at the top of the article extract panel.
 */
import React from 'react';
import { Bot, MessageCircleQuestion, Clipboard, Star, Highlighter, ExternalLink, ZoomIn, ZoomOut, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../lib/utils';

interface ArticleActionButtonsProps {
  isLoadingAI: boolean;
  isLoadingFollowups: boolean;
  isLoadingFavorite: boolean;
  isFavorited: boolean;
  isHighlightMode: boolean;
  articleUrl?: string;
  fontScale?: number;
  onAskClick: () => void;
  onSuggestClick: () => void;
  onCopyClick: () => void;
  onFavoriteClick: () => void;
  onHighlightToggle: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onClose: () => void;
}

const iconButtonClass = cn(
  "h-9 w-9 rounded-xl transition-all duration-200",
  "hover:bg-muted/80 hover:text-foreground text-muted-foreground"
);

const ArticleActionButtons: React.FC<ArticleActionButtonsProps> = ({
  isLoadingAI,
  isLoadingFollowups,
  isLoadingFavorite,
  isFavorited,
  isHighlightMode,
  articleUrl,
  fontScale,
  onAskClick,
  onSuggestClick,
  onCopyClick,
  onFavoriteClick,
  onHighlightToggle,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onClose,
}) => {
  const showZoomControls = onZoomIn || onZoomOut;
  const zoomPercent = Math.round((fontScale ?? 1) * 100);
  return (
    <div className="flex flex-nowrap items-center gap-1 rounded-2xl border border-muted bg-gradient-to-b from-background to-muted/30 p-1 shadow-sm">
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
        className={iconButtonClass}
        title="Copy article"
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

      {articleUrl && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={iconButtonClass}
          title="Open in new tab"
        >
          <a href={articleUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
          </a>
        </Button>
      )}

      {showZoomControls && (
        <div className="ml-auto flex items-center gap-0.5 rounded-xl border border-muted/60 bg-muted/20 px-1">
          <Button
            onClick={onZoomOut}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <button
            type="button"
            onClick={onZoomReset}
            className="min-w-[3rem] rounded-md px-1 text-center text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground"
            title="Reset zoom"
          >
            {zoomPercent}%
          </button>
          <Button
            onClick={onZoomIn}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
        </div>
      )}

      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className={cn(iconButtonClass, !showZoomControls && "ml-auto")}
        title="Close"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};

export default ArticleActionButtons;

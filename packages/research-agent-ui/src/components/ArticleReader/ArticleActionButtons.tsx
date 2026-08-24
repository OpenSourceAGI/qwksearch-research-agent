/**
 * @fileoverview Toolbar with Ask AI, Suggest, Copy, Share, Highlight, Favorite, Open-in-new-tab, and Close buttons shown at the top of the article extract panel.
 *
 * Each button has a shadcn/Radix tooltip that appears on hover (zero delay) showing the
 * action label and its keyboard shortcut. The shortcut key definitions are exported as
 * {@link ARTICLE_TOOLBAR_SHORTCUTS} so the panel can wire up the matching key handlers.
 */
import React from 'react';
import { Bot, MessageCircleQuestion, Clipboard, Star, Highlighter, ExternalLink, Share2, ZoomIn, ZoomOut, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { cn } from '../../lib/utils';

/**
 * Keyboard shortcut definitions for the article toolbar actions. `alt` means the
 * shortcut requires the Alt/Option modifier; `close` uses a bare Escape key.
 * Shared between the tooltip hints here and the key handler in the panel so the
 * displayed shortcut and the actual binding never drift apart.
 */
export const ARTICLE_TOOLBAR_SHORTCUTS = {
  ask: { alt: true, key: 'a' },
  suggest: { alt: true, key: 's' },
  copy: { alt: true, key: 'c' },
  highlight: { alt: true, key: 'h' },
  favorite: { alt: true, key: 'f' },
  open: { alt: true, key: 'o' },
  zoomOut: { alt: true, key: '-' },
  zoomReset: { alt: true, key: '0' },
  zoomIn: { alt: true, key: '=' },
  close: { alt: false, key: 'Escape' },
} as const;

export type ArticleToolbarAction = keyof typeof ARTICLE_TOOLBAR_SHORTCUTS;

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

/**
 * Render a shortcut definition as a short, platform-aware label
 * (e.g. "⌥A" on macOS, "Alt+A" elsewhere, "Esc" for the close action).
 */
export function formatToolbarShortcut(action: ArticleToolbarAction): string {
  const { alt, key } = ARTICLE_TOOLBAR_SHORTCUTS[action];
  const keyLabel =
    key === 'Escape'
      ? 'Esc'
      : key.length === 1
        ? key.toUpperCase()
        : key;
  if (!alt) return keyLabel;
  return isMac ? `⌥${keyLabel}` : `Alt+${keyLabel}`;
}

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
  onShareClick: () => void;
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

/**
 * Wrap a toolbar control in a hover tooltip showing its label and keyboard shortcut.
 */
const ToolbarTip: React.FC<{
  label: string;
  action?: ArticleToolbarAction;
  children: React.ReactNode;
}> = ({ label, action, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="bottom">
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
        {action && (
          <kbd className="rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-semibold leading-none tracking-wide">
            {formatToolbarShortcut(action)}
          </kbd>
        )}
      </span>
    </TooltipContent>
  </Tooltip>
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
  onShareClick,
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
      <ToolbarTip label="Ask AI about this article" action="ask">
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
      </ToolbarTip>

      <ToolbarTip label="Suggest follow-up questions" action="suggest">
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
      </ToolbarTip>

      <ToolbarTip label="Copy article" action="copy">
        <Button
          onClick={onCopyClick}
          variant="ghost"
          size="icon"
          className={iconButtonClass}
        >
          <Clipboard className="size-4" />
        </Button>
      </ToolbarTip>

      <ToolbarTip label="Share article">
        <Button
          onClick={onShareClick}
          variant="ghost"
          size="icon"
          className={iconButtonClass}
        >
          <Share2 className="size-4" />
        </Button>
      </ToolbarTip>

      <ToolbarTip
        label={isHighlightMode ? 'Disable highlighting' : 'Enable highlighting'}
        action="highlight"
      >
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
        >
          <Highlighter className="size-4" />
        </Button>
      </ToolbarTip>

      <ToolbarTip
        label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        action="favorite"
      >
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
        >
          <Star
            className={cn(
              "size-4",
              isFavorited && "fill-yellow-400"
            )}
          />
        </Button>
      </ToolbarTip>

      {articleUrl && (
        <ToolbarTip label="Open in new tab" action="open">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className={iconButtonClass}
          >
            <a href={articleUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </ToolbarTip>
      )}

      {showZoomControls && (
        <div className="ml-auto flex items-center gap-0.5 rounded-xl border border-muted/60 bg-muted/20 px-1">
          <ToolbarTip label="Zoom out" action="zoomOut">
            <Button
              onClick={onZoomOut}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
            >
              <ZoomOut className="size-4" />
            </Button>
          </ToolbarTip>
          <ToolbarTip label="Reset zoom" action="zoomReset">
            <button
              type="button"
              onClick={onZoomReset}
              className="min-w-[3rem] rounded-md px-1 text-center text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground"
            >
              {zoomPercent}%
            </button>
          </ToolbarTip>
          <ToolbarTip label="Zoom in" action="zoomIn">
            <Button
              onClick={onZoomIn}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
            >
              <ZoomIn className="size-4" />
            </Button>
          </ToolbarTip>
        </div>
      )}

      <ToolbarTip label="Close" action="close">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className={cn(iconButtonClass, !showZoomControls && "ml-auto")}
        >
          <X className="size-4" />
        </Button>
      </ToolbarTip>
    </div>
  );
};

export default ArticleActionButtons;

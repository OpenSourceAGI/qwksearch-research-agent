/**
 * @fileoverview Resizable side panel (desktop) or full-screen dialog (mobile) that fetches and displays a web article, supports AI Q&A, follow-up question generation, text highlighting, favorites, and clipboard copy.
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getArticle,
  updateArticle,
  listFavorites,
  addFavorite,
  removeFavorite,
  articleQa,
  articleFollowups,
} from 'qwksearch-api-client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '../../ui/dialog';
import { VisuallyHidden } from '../../ui/visually-hidden';
import { useExtractPanel } from './ExtractPanelContext';
import {
  ArticleActionButtons,
  ArticlePromptInput,
  ArticleFollowupQuestions,
  ArticleAIResponse,
  ArticleContent,
  Article,
  ChatMessage,
  ArticleExtractPanelProps
} from '.';
import { ARTICLE_TOOLBAR_SHORTCUTS } from './ArticleActionButtons';
import { researchAgentUIConfig } from '../../config';
import { useSession } from '../../hooks/useSession';
import { useChat } from '../../hooks/useChat';
import { shareArticle } from '../../lib/shareArticle';

const ArticleExtractPanel: React.FC<ArticleExtractPanelProps> = (props) => {
  const {
    isOpen: contextIsOpen,
    url: contextUrl,
    searchText: contextSearchText,
    panelWidth: contextPanelWidth,
    setPanelWidth: contextSetPanelWidth,
    closePanel,
  } = useExtractPanel();

  const { isAuthenticated } = useSession();
  const { chatModelProvider } = useChat();

  const isOpen = props.isOpen !== undefined ? props.isOpen : contextIsOpen;
  const onClose = props.onClose || closePanel;
  const url = props.url || contextUrl;
  const searchText = props.searchText !== undefined ? props.searchText : contextSearchText;

  const [extractedArticle, setExtractedArticle] = useState<Article | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [showLinkCopiedMessage, setShowLinkCopiedMessage] = useState(false);
  const [userPrompt, setUserPrompt] = useState(researchAgentUIConfig.defaultSummarizePrompt);
  const [isLoadingExtract, setIsLoadingExtract] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingFollowups, setIsLoadingFollowups] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiError, setAiError] = useState('');
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [followupError, setFollowupError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [panelWidth, setPanelWidth] = useState(contextPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanelReady, setIsPanelReady] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const resizeRef = useRef<HTMLDivElement>(null);
  // Holds the latest toolbar action handlers so the global keydown listener
  // (registered once per open) always calls current closures, never stale ones.
  const shortcutActionsRef = useRef<Partial<Record<string, () => void>>>({});

  const MIN_FONT_SCALE = 0.5;
  const MAX_FONT_SCALE = 1.8;
  const FONT_SCALE_STEP = 0.1;

  // Restore the reader's preferred zoom level
  useEffect(() => {
    const stored = parseFloat(localStorage.getItem('articleFontScale') || '');
    if (!Number.isNaN(stored)) {
      setFontScale(Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, stored)));
    }
  }, []);

  const persistFontScale = (scale: number) => {
    const clamped = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(scale * 100) / 100));
    setFontScale(clamped);
    try {
      localStorage.setItem('articleFontScale', String(clamped));
    } catch (error) {
      console.error('Error storing article font scale:', error);
    }
  };

  const handleZoomIn = () => persistFontScale(fontScale + FONT_SCALE_STEP);
  const handleZoomOut = () => persistFontScale(fontScale - FONT_SCALE_STEP);
  const handleZoomReset = () => persistFontScale(1);

  // Track window width for desktop/mobile layout
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Handle horizontal resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(400, Math.min(newWidth, window.innerWidth - 100));
      setPanelWidth(clampedWidth);
      contextSetPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, contextSetPanelWidth]);

  // Extract URL content when panel opens
  useEffect(() => {
    if (isOpen && url) {
      setIsPanelReady(false);
      extractURL();
    } else if (!isOpen) {
      setIsPanelReady(false);
    }
  }, [isOpen, url]);

  const extractURL = async () => {
    console.log('[ArticleExtractPanel] Extracting URL:', url);

    // Validate URL before fetching
    try {
      const parsedUrl = new URL(url);
      const searchEnginePatterns = [
        /^https?:\/\/(www\.)?google\.[^/]+\/search/i,
        /^https?:\/\/(www\.)?bing\.com\/search/i,
        /^https?:\/\/(www\.)?duckduckgo\.com\/\?/i,
      ];
      if (searchEnginePatterns.some((p) => p.test(url))) {
        toast.error('Cannot extract articles from search result pages');
        setIsLoadingExtract(false);
        setIsPanelReady(true);
        return;
      }
      if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
        console.error('[ArticleExtractPanel] URL is domain-only, missing article path:', url);
        toast.error('Invalid article URL - only domain provided');
      }
    } catch (e) {
      console.error('[ArticleExtractPanel] Invalid URL format:', url, e);
    }

    setIsLoadingExtract(true);
    try {
      const { data: articleData } = await getArticle({ query: { url } });
      const article = articleData?.article;

      const textContent = article?.html?.replace(/<[^>]*>/g, '').trim() || '';

      if ((article as any)?.error || textContent.length < 20) {
        // Fallback: request Chrome extension to extract the URL
        document.dispatchEvent(
          new CustomEvent('onInvokeChromeAPI', {
            detail: { type: 'extractURL', url },
          }),
        );

        // Race against a 10s timeout so the panel always becomes ready even if no extension is present
        await Promise.race([
          new Promise<void>((resolve) => {
            const handler = async (event: Event) => {
              window.removeEventListener('onExtractionResult', handler);
              const { data: fallbackData } = await getArticle({ query: { url } });
              const fallbackArticle = fallbackData?.article;
              if (fallbackArticle) {
                setExtractedArticle(fallbackArticle);
                if (fallbackArticle.followUpQuestions?.length > 0) {
                  setFollowupQuestions(fallbackArticle.followUpQuestions);
                }
              }
              resolve();
            };
            window.addEventListener('onExtractionResult', handler);
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 10000)),
        ]);
      } else {
        setExtractedArticle(article);
        if (article?.followUpQuestions && article.followUpQuestions.length > 0) {
          setFollowupQuestions(article.followUpQuestions);
        }
      }

      if (isAuthenticated) checkIfFavorited();
    } catch (error) {
      console.error('[ArticleExtractPanel] Error extracting URL:', error);
      toast.error('Failed to load article');
    } finally {
      setIsLoadingExtract(false);
      setIsPanelReady(true);
    }
  };

  const checkIfFavorited = async () => {
    try {
      const { data } = await listFavorites();
      const isFav = data?.favorites?.some((fav: any) => fav.url === url);
      setIsFavorited(!!isFav);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!extractedArticle) return;

    setIsLoadingFavorite(true);
    try {
      if (isFavorited) {
        await removeFavorite({ query: { url } });
        setIsFavorited(false);
        toast.info('Removed from favorites');
      } else {
        await addFavorite({
          body: {
            url: extractedArticle.url || url,
            title: extractedArticle.title,
            cite: extractedArticle.cite,
            author: extractedArticle.author,
            author_cite: extractedArticle.author_cite,
            date: extractedArticle.date,
            source: extractedArticle.source,
            word_count: extractedArticle.word_count,
            html: extractedArticle.html,
          },
        });
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to toggle favorite');
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  /**
   * Resolve the chat model to use for Ask / Suggest, mirroring the chat input.
   *
   * The panel can render without a mounted ModelSelector, in which case the
   * ChatProvider's `chatModelProvider` is still the empty default and sending
   * it makes the article-qa/followups endpoints fail. The chat input persists
   * its selection in localStorage (`chatModelProviderId` / `chatModelKey`), so
   * fall back to those keys to reuse the exact same model the user picked.
   */
  const resolveChatModel = () => {
    if (chatModelProvider?.key && chatModelProvider?.providerId) {
      return chatModelProvider;
    }
    try {
      const key = localStorage.getItem('chatModelKey') || '';
      const providerId = localStorage.getItem('chatModelProviderId') || '';
      if (key && providerId) {
        return { key, providerId };
      }
    } catch (error) {
      console.error('Error reading persisted chat model:', error);
    }
    // Let the server pick its default provider/model when nothing is selected.
    return chatModelProvider;
  };

  const callLanguageAPI = async (agent: 'question' | 'suggest-followups') => {
    if (!extractedArticle) return;

    const chatModel = resolveChatModel();

    const article = extractedArticle.html
      ?.replace(/<[^>]*>?/g, '')
      .slice(0, researchAgentUIConfig.maxArticleLength);

    const isQuestion = agent === 'question';
    const setLoading = isQuestion ? setIsLoadingAI : setIsLoadingFollowups;
    const setError = isQuestion ? setAiError : setFollowupError;

    setLoading(true);
    setError('');

    try {
      if (isQuestion) {
        // Use the new article-qa endpoint for questions
        const queryText = [searchText, userPrompt].filter(Boolean).join('\n');

        if (!article || article.length === 0) {
          throw new Error('Article content is empty');
        }

        const { data, error } = await articleQa({
          body: {
            article,
            question: queryText,
            chatHistory: chatHistory.slice(-5),
            chatModel,
          },
        });

        if (error) {
          const errorDetails =
            (error as any).details || (error as any).error || (error as any).message || 'Article QA failed';
          throw new Error(errorDetails);
        }

        const aiAnswer = data?.content || '';
        setAiResponse(aiAnswer);
        setChatHistory((prev) => [
          ...prev,
          { role: 'user', content: userPrompt, time: new Date().toISOString() },
          { role: 'assistant', content: aiAnswer, time: new Date().toISOString() },
        ]);

        try {
          await updateArticle({ body: { url, question: userPrompt, answer: aiAnswer } });
        } catch (error) {
          console.error('Error storing Q&A in cache:', error);
        }
      } else {
        // Use the new article-followups endpoint for follow-up questions
        const maxQuestions = parseInt(localStorage.getItem('maxFollowupQuestions') || '4');

        if (!article || article.length === 0) {
          throw new Error('Article content is empty');
        }

        const { data, error } = await articleFollowups({
          body: {
            article,
            chatHistory: chatHistory.slice(-5),
            maxQuestions,
            chatModel,
          },
        });

        if (error) {
          const errorDetails =
            (error as any).details || (error as any).error || (error as any).message || 'Article followups failed';
          throw new Error(errorDetails);
        }

        const questions = data?.extract || [];
        setFollowupQuestions(questions);

        try {
          await updateArticle({ body: { url, followUpQuestions: questions } });
        } catch (error) {
          console.error('Error storing follow-up questions in cache:', error);
        }
      }
    } catch (error) {
      console.error('Error calling language API:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? (error as any).message
            : 'Failed to get AI response';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setUserPrompt(question);
    callLanguageAPI('question');
  };

  const handleCopyHTMLToClipboard = async () => {
    if (!extractedArticle) return;

    const textToCopy = `${aiResponse}\n\n\n${extractedArticle.cite || ''}\n\n\n${extractedArticle.html}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleShareArticle = async () => {
    const targetUrl = extractedArticle?.url || url;
    if (!targetUrl) return;

    try {
      const result = await shareArticle(
        { title: extractedArticle?.title, text: extractedArticle?.cite, url: targetUrl },
        {
          share:
            typeof navigator !== 'undefined' && navigator.share
              ? (data) => navigator.share(data)
              : undefined,
          writeText: (text) => navigator.clipboard.writeText(text),
        },
      );
      if (result === 'copied') {
        setShowLinkCopiedMessage(true);
        setTimeout(() => setShowLinkCopiedMessage(false), 2000);
      }
    } catch (error) {
      console.error('Failed to share article:', error);
    }
  };

  // Keep the shortcut handler map pointing at the freshest closures every render.
  shortcutActionsRef.current = {
    ask: () => callLanguageAPI('question'),
    suggest: () => callLanguageAPI('suggest-followups'),
    copy: handleCopyHTMLToClipboard,
    highlight: () => setIsHighlightMode((prev) => !prev),
    favorite: toggleFavorite,
    open: () => {
      const target = extractedArticle?.url || url;
      if (target) window.open(target, '_blank', 'noopener,noreferrer');
    },
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    zoomReset: handleZoomReset,
    close: onClose,
  };

  // Global keyboard shortcuts for the toolbar actions while the panel is open.
  // Alt/Option + key triggers an action; Escape always closes. Typing in an
  // input, textarea, or contenteditable is never intercepted.
  useEffect(() => {
    if (!isOpen) return;

    // Map a shortcut key to its physical KeyboardEvent.code. Matching on `code`
    // (not `key`) is required because holding Alt/Option on macOS rewrites
    // `event.key` to an alternate character (e.g. Option+A -> "å").
    const codeForKey = (key: string): string => {
      if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
      if (/^[0-9]$/.test(key)) return `Digit${key}`;
      if (key === '-') return 'Minus';
      if (key === '=') return 'Equal';
      return key;
    };

    const actionByCode: Record<string, string> = {};
    (Object.keys(ARTICLE_TOOLBAR_SHORTCUTS) as Array<keyof typeof ARTICLE_TOOLBAR_SHORTCUTS>)
      .forEach((action) => {
        const { alt, key } = ARTICLE_TOOLBAR_SHORTCUTS[action];
        if (alt) actionByCode[codeForKey(key.toLowerCase())] = action;
      });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        shortcutActionsRef.current.close?.();
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const action = actionByCode[event.code];
      if (!action) return;

      const run = shortcutActionsRef.current[action];
      if (run) {
        event.preventDefault();
        run();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const renderPanelContent = () => (
    <div className="flex h-full flex-col bg-background shadow-xl">
      {/* Persistent top bar — stays fixed while the article scrolls */}
      <div className="shrink-0 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ArticleActionButtons
          isLoadingAI={isLoadingAI}
          isLoadingFollowups={isLoadingFollowups}
          isLoadingFavorite={isLoadingFavorite}
          isFavorited={isFavorited}
          isHighlightMode={isHighlightMode}
          articleUrl={extractedArticle?.url || url}
          fontScale={fontScale}
          onAskClick={() => callLanguageAPI('question')}
          onSuggestClick={() => callLanguageAPI('suggest-followups')}
          onCopyClick={handleCopyHTMLToClipboard}
          onShareClick={handleShareArticle}
          onFavoriteClick={toggleFavorite}
          onHighlightToggle={() => setIsHighlightMode(!isHighlightMode)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onClose={onClose}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
            <div className="space-y-4">
              {showCopiedMessage && (
                <div className="bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-md shadow-lg">
                  Copied!
                </div>
              )}

              {showLinkCopiedMessage && (
                <div className="bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-md shadow-lg">
                  Link copied!
                </div>
              )}

              <ArticlePromptInput
                value={userPrompt}
                onChange={setUserPrompt}
                onSubmit={() => callLanguageAPI('question')}
              />

              <ArticleFollowupQuestions
                questions={followupQuestions}
                isLoading={isLoadingFollowups}
                error={followupError}
                onQuestionClick={handleQuestionClick}
              />

              {/* Chat History */}
              {chatHistory.length > 0 && (
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div key={index} className="space-y-2">
                      {message.role === 'user' ? (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                          <div className="text-xs font-semibold text-primary mb-1">Your Question</div>
                          <div className="text-sm text-foreground">{message.content}</div>
                        </div>
                      ) : (
                        <div className="bg-muted rounded-lg shadow-md p-4">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">AI Response</div>
                          <div
                            className="text-sm"
                            dangerouslySetInnerHTML={{ __html: message.content }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Current AI Response (while loading or if no chat history yet) */}
              {(isLoadingAI || (aiResponse && chatHistory.length === 0)) && (
                <ArticleAIResponse
                  response={aiResponse}
                  isLoading={isLoadingAI}
                  error={aiError}
                />
              )}

              {aiError && !isLoadingAI && (
                <div className="bg-red-500 text-white p-2 rounded-md text-sm">
                  {aiError}
                </div>
              )}
            </div>

            {extractedArticle && (
              <ArticleContent
                article={extractedArticle}
                isHighlightMode={isHighlightMode}
                fontScale={fontScale}
              />
            )}
          </div>
      </div>
    </div>
  );

  // Don't render panel until it's open and content is ready
  if (!isOpen || !isPanelReady) return null;

  // Mobile: Full-screen overlay panel
  if (!isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="pointer-events-auto fixed inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 h-full w-full max-w-none p-0 m-0 rounded-none border-0 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          hideCloseButton
        >
          <VisuallyHidden>
            <DialogTitle>Article Details</DialogTitle>
          </VisuallyHidden>
          <div className="h-full overflow-y-auto">
            {renderPanelContent()}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop: Fixed column on the right
  return (
    <div
      className="fixed top-0 right-0 h-screen z-40 transition-all duration-300"
      style={{ width: `${panelWidth}px` }}
    >
      <div
        ref={resizeRef}
        onMouseDown={() => setIsResizing(true)}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary bg-transparent transition-colors z-50"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-muted-foreground opacity-50 hover:opacity-100 transition-opacity" />
      </div>

      {renderPanelContent()}
    </div>
  );
};

export default ArticleExtractPanel;

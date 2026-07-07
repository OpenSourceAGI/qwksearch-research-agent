/**
 * Resizable side panel (desktop) or full-screen dialog (mobile) that fetches and displays a web article,
 * supports AI Q&A, follow-up question generation, text highlighting, favorites, and clipboard copy.
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import grab from 'grab-url';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useExtractPanel } from './ExtractPanelContext';
import {
  ArticlePanelHeader,
  ArticleActionButtons,
  ArticlePromptInput,
  ArticleFollowupQuestions,
  ArticleAIResponse,
  ArticleContent,
  Article,
  ChatMessage,
  ArticleExtractPanelProps
} from '.';
import {
  DEFAULT_SUMMARIZE_PROMPT,
  MAX_ARTICLE_LENGTH,
  MAX_FOLLOWUP_QUESTIONS
} from "@/lib/config/site"

const ArticleExtractPanel: React.FC<ArticleExtractPanelProps> = (props) => {
  const {
    isOpen: contextIsOpen,
    url: contextUrl,
    searchText: contextSearchText,
    panelWidth: contextPanelWidth,
    setPanelWidth: contextSetPanelWidth,
    closePanel,
  } = useExtractPanel();

  const isOpen = props.isOpen !== undefined ? props.isOpen : contextIsOpen;
  const onClose = props.onClose || closePanel;
  const url = props.url || contextUrl;
  const searchText = props.searchText !== undefined ? props.searchText : contextSearchText;

  const [extractedArticle, setExtractedArticle] = useState<Article | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [userPrompt, setUserPrompt] = useState(DEFAULT_SUMMARIZE_PROMPT);
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
  const resizeRef = useRef<HTMLDivElement>(null);

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
      if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
        console.error('[ArticleExtractPanel] URL is domain-only, missing article path:', url);
        toast.error('Invalid article URL - only domain provided');
      }
    } catch (e) {
      console.error('[ArticleExtractPanel] Invalid URL format:', url, e);
    }

    setIsLoadingExtract(true);
    const { article } = await grab(`doc/article?url=${encodeURIComponent(url)}`);

    const textContent = article?.html?.replace(/<[^>]*>/g, '').trim() || '';

    if (article?.error || textContent.length < 20) {
      // Fallback: request Chrome extension to extract the URL
      document.dispatchEvent(
        new CustomEvent('onInvokeChromeAPI', {
          detail: { type: 'extractURL', url },
        }),
      );

      await new Promise<void>((resolve) => {
        const handler = async (event: Event) => {
          window.removeEventListener('onExtractionResult', handler);
          const { article: fallbackArticle } = await grab(`doc/article?url=${encodeURIComponent(url)}`);
          if (fallbackArticle) {
            setExtractedArticle(fallbackArticle);
            if (fallbackArticle.followUpQuestions?.length > 0) {
              setFollowupQuestions(fallbackArticle.followUpQuestions);
            }
          }
          resolve();
        };
        window.addEventListener('onExtractionResult', handler);
      });
    } else {
      setExtractedArticle(article);
      if (article?.followUpQuestions && article.followUpQuestions.length > 0) {
        setFollowupQuestions(article.followUpQuestions);
      }
    }

    checkIfFavorited();
    setIsLoadingExtract(false);
    setIsPanelReady(true);
  };

  const checkIfFavorited = async () => {
    try {
      const data = await grab('doc/favorites');
      const isFav = data.favorites.some((fav: any) => fav.url === url);
      setIsFavorited(isFav);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!extractedArticle) return;

    setIsLoadingFavorite(true);
    try {
      if (isFavorited) {
        await grab(`doc/favorites?url=${encodeURIComponent(url)}`, {
          method: 'DELETE',
        });
        setIsFavorited(false);
        toast.info('Removed from favorites');
      } else {
        await grab('doc/favorites', {
          method: 'POST',
          body: JSON.stringify({
            url: extractedArticle.url || url,
            title: extractedArticle.title,
            cite: extractedArticle.cite,
            author: extractedArticle.author,
            author_cite: extractedArticle.author_cite,
            date: extractedArticle.date,
            source: extractedArticle.source,
            word_count: extractedArticle.word_count,
            html: extractedArticle.html,
          }),
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

  const callLanguageAPI = async (agent: 'question' | 'suggest-followups') => {
    if (!extractedArticle) return;

    const article = extractedArticle.html
      ?.replace(/<[^>]*>?/g, '')
      .slice(0, MAX_ARTICLE_LENGTH);

    const isQuestion = agent === 'question';
    const setLoading = isQuestion ? setIsLoadingAI : setIsLoadingFollowups;
    const setError = isQuestion ? setAiError : setFollowupError;

    setLoading(true);
    setError('');

    try {
      if (isQuestion) {
        // Use the new article-qa endpoint for questions
        const queryText = [searchText, userPrompt].filter(Boolean).join('\n');

        const data = await grab('/api/agent/article-qa', {
          method: 'POST',
          body: JSON.stringify({
            article,
            question: queryText,
            chatHistory: chatHistory.slice(-5),
            provider: 'groq',
          }),
        });

        if (data.error) throw new Error(data.error);

        const aiAnswer = data.content || '';
        setAiResponse(aiAnswer);
        setChatHistory((prev) => [
          ...prev,
          { role: 'user', content: userPrompt, time: new Date().toISOString() },
          { role: 'assistant', content: aiAnswer, time: new Date().toISOString() },
        ]);

        try {
          await grab('doc/article', {
            method: 'POST',
            body: JSON.stringify({ url, question: userPrompt, answer: aiAnswer }),
          });
        } catch (error) {
          console.error('Error storing Q&A in cache:', error);
        }
      } else {
        // Use the new article-followups endpoint for follow-up questions
        const data = await grab('/api/agent/article-followups', {
          method: 'POST',
          body: JSON.stringify({
            article,
            chatHistory: chatHistory.slice(-5),
            maxQuestions: MAX_FOLLOWUP_QUESTIONS,
            provider: 'groq',
          }),
        });

        if (data.error) throw new Error(data.error);

        const questions = data.extract || [];
        setFollowupQuestions(questions);

        try {
          await grab('doc/article', {
            method: 'POST',
            body: JSON.stringify({ url, followUpQuestions: questions }),
          });
        } catch (error) {
          console.error('Error storing follow-up questions in cache:', error);
        }
      }
    } catch (error) {
      console.error('Error calling language API:', error);
      setError('Failed to get AI response');
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

  const renderPanelContent = () => (
    <div className="flex h-full flex-col bg-background shadow-xl">
      <ArticlePanelHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
            <div className="space-y-4">
              <ArticleActionButtons
                isLoadingAI={isLoadingAI}
                isLoadingFollowups={isLoadingFollowups}
                isLoadingFavorite={isLoadingFavorite}
                isFavorited={isFavorited}
                isHighlightMode={isHighlightMode}
                onAskClick={() => callLanguageAPI('question')}
                onSuggestClick={() => callLanguageAPI('suggest-followups')}
                onCopyClick={handleCopyHTMLToClipboard}
                onFavoriteClick={toggleFavorite}
                onHighlightToggle={() => setIsHighlightMode(!isHighlightMode)}
              />

              {showCopiedMessage && (
                <div className="bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-md shadow-lg">
                  Copied!
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

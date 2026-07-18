/**
 * Source card grid with category tabs (Web/News/Videos/Images/Academic/Files) that renders search results as
 * image tiles, video thumbnails, or web-result cards; supports infinite scroll pagination and opens URLs in
 * the article extract panel. Auto-opens the first source on desktop.
 */
/* eslint-disable @next/next/no-img-element */
import type { Document } from 'extract-webpage/search';
import { File, Video, Loader2, ExternalLink, FileText } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getArticle, agentSearch } from 'qwksearch-api-client';
import { convertURLSafeHTMLToHTML } from 'extract-webpage/html-to-content/html-utils';
import { cn } from '../../lib/utils';

import { GlowingEffect } from '../../ui/glowing-effect';
import { useExtractPanel } from '../ArticleReader/ExtractPanelContext';
import type { SearchCategory, SearchResult } from '../../types/research';
import { categories } from '../SearchConfig/categories';

const CATEGORY_TABS = categories.filter(c =>
  ['general', 'news', 'videos', 'images', 'science', 'files'].includes(c.code)
);

const MessageSources = ({
  sources: initialSources,
  query,
}: {
  sources: Document[];
  query?: string;
}) => {
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('general');
  const [sources, setSources] = useState<Document[]>(initialSources);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const userClosedPanelRef = useRef(false);
  const { openPanel, isOpen } = useExtractPanel();

  // Track article loading/loaded states
  const [articleStates, setArticleStates] = useState<Record<string, 'loading' | 'loaded'>>({});

  // Track window width for desktop/mobile layout
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Update sources when initial sources change
  useEffect(() => {
    setSources(initialSources);
    setActiveCategory('general');
    setCurrentPage(1);
    setHasMore(true);
    setArticleStates({}); // Reset article states on new sources

    // Check which articles are already cached
    checkCachedArticles(initialSources);
  }, [initialSources]);

  // Check which articles are already cached/fetched
  const checkCachedArticles = useCallback(async (sourcesToCheck: Document[]) => {
    const webSources = sourcesToCheck.filter(
      s => s.metadata.url &&
      s.metadata.url !== 'File' &&
      !s.metadata.iframe_src // Skip video URLs
    );

    // Check cache status for each article (without triggering fetch)
    for (const source of webSources) {
      try {
        const response = await fetch(`/api/doc/article?url=${encodeURIComponent(source.metadata.url)}`);
        const data = await response.json();

        // If article is cached and has content, mark as loaded
        if (data.cached && data.article?.html) {
          setArticleStates(prev => ({ ...prev, [source.metadata.url]: 'loaded' }));
        }
      } catch (error) {
        // Silently fail - just won't show loaded icon
      }
    }
  }, []);

  // Check for extract parameter in URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const extractUrl = params.get('extract');
      if (extractUrl) {
        openPanel(decodeURIComponent(extractUrl), '');
        userClosedPanelRef.current = false;
      }
    }
  }, [openPanel]);

  // Reset userClosedPanel when sources change (new search)
  useEffect(() => {
    userClosedPanelRef.current = false;
  }, [initialSources]);

  // Track when panel is closed (from any source) to prevent auto-reopen
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      userClosedPanelRef.current = true;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Auto-open first source by default (only on desktop, and if user hasn't manually closed)
  useEffect(() => {
    if (isDesktop && sources && sources.length > 0 && !isOpen && !userClosedPanelRef.current) {
      const firstSource = sources[0];
      if (firstSource?.metadata?.url) {
        openPanel(firstSource.metadata.url, '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, isDesktop]);

  const handleSourceClick = async (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    userClosedPanelRef.current = false;

    // Set article to loading state
    setArticleStates(prev => ({ ...prev, [url]: 'loading' }));

    // Open the panel (this will trigger article fetch in ArticleExtractPanel)
    openPanel(url, '');

    // Check if article is cached or needs to be fetched
    try {
      await getArticle({ query: { url } });
      setArticleStates(prev => ({ ...prev, [url]: 'loaded' }));
    } catch (error) {
      // Even on error, mark as loaded (failed) to stop spinner
      setArticleStates(prev => ({ ...prev, [url]: 'loaded' }));
    }
  };

  const loadMoreResults = useCallback(async () => {
    if (!query || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    const { data: searchData } = await agentSearch({ query: { q: query, cat: activeCategory as any, page: nextPage } });
    const results = searchData?.results ?? [];

    // If no results, we've reached the end
    if (results.length === 0) {
      setHasMore(false);
      setIsLoadingMore(false);
      return;
    }


    // Convert search results to Document format
    const newSources: Document[] = results.map((result: SearchResult) => {
      // Log any domain-only URLs
      if (result.url) {
        try {
          const parsedUrl = new URL(result.url);
          if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
            console.warn('[MessageSources] Search result URL is domain-only:', result.url, 'Title:', result.title);
          }
        } catch (e) {
          console.error('[MessageSources] Invalid URL in search result:', result.url);
        }
      }

      return {
        pageContent: result.snippet || result.content || '',
        metadata: {
          title: result.title || '',
          source: result.source || '',
          thumbnail: result.thumbnail || '',
          url: result.url || '',
          ...(result.thumbnail && { thumbnail: result.thumbnail }),
        },
      };
    });

    setSources(prev => [...prev, ...newSources]);
    setCurrentPage(nextPage);

    setIsLoadingMore(false);
  }, [query, activeCategory, currentPage, isLoadingMore, hasMore]);

  const handleCategoryChange = async (category: SearchCategory) => {
    if (category === activeCategory || !query) return;

    setActiveCategory(category);
    setIsSearching(true);
    setCurrentPage(1);
    setHasMore(true);

    try {
      const { data: searchData } = await agentSearch({ query: { q: query, cat: category as any, page: 1 } });
      const results = searchData?.results ?? [];

      // Convert search results to Document format
      const newSources: Document[] = results.map((result: SearchResult) => {
        // Log any domain-only URLs
        if (result.url) {
          try {
            const parsedUrl = new URL(result.url);
            if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
              console.warn('[MessageSources] Category search result URL is domain-only:', result.url, 'Title:', result.title);
            }
          } catch (e) {
            console.error('[MessageSources] Invalid URL in category search result:', result.url);
          }
        }

        return {
          pageContent: result.snippet || result.content || '',
          metadata: {
            title: result.title || '',
            source: result.source || '',
            thumbnail: result.thumbnail || '',
            url: result.url || '',
            ...(result.img_src && { img_src: (result as any).img_src }),
            ...(result.thumbnail && { thumbnail: result.thumbnail }),
            ...(result.iframe_src && { iframe_src: (result as any).iframe_src }),
          },
        };
      });

      setSources(newSources);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Infinite scroll: detect when user scrolls to bottom
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Trigger load more when user is within 100px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMoreResults();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [loadMoreResults]);

  const renderSourceCard = (source: Document, index: number) => {
    const isImageCategory = activeCategory === 'images';
    const isVideoCategory = activeCategory === 'videos';
    const imgSrc = source.metadata.img_src || source.metadata.thumbnail;

    if (isImageCategory && imgSrc) {
      return (
        <div key={index} className="relative rounded-lg group">
          <a
            className="relative block overflow-hidden rounded-lg cursor-pointer"
            href={source.metadata.url}
            onClick={(e) => handleSourceClick(e, source.metadata.url)}
          >
            <img
              src={imgSrc}
              alt={source.metadata.title}
              className="w-full h-auto object-cover rounded-lg hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-xs text-white line-clamp-2">
                {convertURLSafeHTMLToHTML(source.metadata.title)}
              </p>
              <p className="text-[10px] text-white/70 truncate mt-0.5">
                {source.metadata.source}
              </p>
            </div>
          </a>
        </div>
      );
    }

    if (isVideoCategory && imgSrc) {
      return (
        <div key={index} className="relative rounded-xl">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={2}
          />
          <a
            className="relative bg-card text-card-foreground border border-border rounded-xl overflow-hidden flex flex-col cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
            href={source.metadata.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="relative">
              <img
                src={imgSrc}
                alt={source.metadata.title}
                className="w-full h-24 object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center">
                  <Video size={18} className="text-white ml-0.5" />
                </div>
              </div>
            </div>
            <p className="text-xs line-clamp-2 p-2 text-muted-foreground">
              {convertURLSafeHTMLToHTML(source.metadata.title)}
            </p>
          </a>
        </div>
      );
    }

    // Default web/news/academic card
    const articleState = articleStates[source.metadata.url];
    return (
      <div key={index} className="relative rounded-xl group h-full">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div
          className="relative bg-card text-card-foreground border border-border rounded-xl p-2.5 flex flex-col font-medium cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 h-full"
          onClick={(e) => handleSourceClick(e, source.metadata.url)}
        >
          {/* Article state icon (loading or loaded) - always visible when present */}
          {articleState && (
            <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-background/80 backdrop-blur-sm z-[5]">
              {articleState === 'loading' ? (
                <Loader2 size={14} className="text-primary animate-spin" />
              ) : (
                <FileText size={14} className="text-green-500" />
              )}
            </div>
          )}
          <a
            href={source.metadata.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary z-10"
            title="Open in new tab"
          >
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
          <p className="text-xs line-clamp-4 text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground/70 align-middle">
              {source.metadata.url === 'File' ? (
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-secondary flex-shrink-0">
                  <File size={10} className="text-muted-foreground" />
                </span>
              ) : (
                <img
                  src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                  width={20}
                  height={20}
                  alt="favicon"
                  className="inline rounded h-5 w-5 flex-shrink-0"
                />
              )}
              {source.metadata.source}
            </span>{' '}
            <span className="align-middle">{convertURLSafeHTMLToHTML(source.metadata.title)}</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Category Tabs */}
      {query && (
        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.code}
              onClick={() => handleCategoryChange(tab.code)}
              disabled={isSearching}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                activeCategory === tab.code
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sources Grid */}
      <div ref={scrollContainerRef} className={cn(
        "overflow-y-auto pb-2 pr-1",
        activeCategory === 'images' ? "max-h-[400px] lg:max-h-[500px]" : "max-h-[180px] lg:max-h-[280px]"
      )}>
        {isSearching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sources.length > 0 ? (
          <>
            <div className={cn(
              activeCategory === 'images'
                ? "columns-2 sm:columns-3 lg:columns-4 gap-2 [&>div]:mb-2 [&>div]:break-inside-avoid"
                : cn("grid gap-3 auto-rows-fr", isOpen && isDesktop ? "grid-cols-2" : "grid-cols-3")
            )}>
              {sources.map((source, i) => renderSourceCard(source, i))}
            </div>
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && sources.length > 0 && (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
                No more results
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No results found
          </div>
        )}
      </div>
    </>
  );
};

export default MessageSources;

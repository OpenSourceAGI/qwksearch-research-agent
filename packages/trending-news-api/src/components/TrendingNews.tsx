import React, { useState } from 'react';
import { useTrendingNews } from '../hooks/useTrendingNews';
import type { TrendingNewsOptions, TrendingTopic } from '../types';

type Props = TrendingNewsOptions & {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  /** Max trending topics to render (default 8). */
  maxTopics?: number;
  /**
   * When set on a `compact` card, a chevron toggles between the compact
   * topic row and a full topic-by-topic article list, without leaving the
   * card's layout. Ignored outside `compact` mode, which already shows the
   * full list.
   */
  expandable?: boolean;
  /** Max topics to render once expanded (default 15). */
  expandedMaxTopics?: number;
  /** Show each topic's lead article thumbnail image, when available (default true). */
  showImages?: boolean;
};

function ChevronIcon({ up }: { up?: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: up ? 'rotate(180deg)' : undefined, transition: 'transform 150ms ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const styles = {
  root: {
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    background: '#fff',
    color: '#111827',
    maxWidth: 640,
  } as React.CSSProperties,
  compactRoot: {
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 8,
  } as React.CSSProperties,
  compactHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as React.CSSProperties,
  compactHeader: {
    fontSize: 11,
    fontWeight: 600,
    opacity: 0.75,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } as React.CSSProperties,
  expandToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    padding: 2,
    margin: 0,
    color: 'inherit',
    opacity: 0.6,
    cursor: 'pointer',
  } as React.CSSProperties,
  expandedList: { display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' } as React.CSSProperties,
  topicRow: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 } as React.CSSProperties,
  topicCard: {
    minWidth: 160,
    maxWidth: 200,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textDecoration: 'none',
    color: 'inherit',
    overflow: 'hidden',
  } as React.CSSProperties,
  topicCardBody: { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 } as React.CSSProperties,
  topicThumb: {
    width: '100%',
    height: 84,
    objectFit: 'cover',
    display: 'block',
  } as React.CSSProperties,
  articleThumb: {
    width: 48,
    height: 48,
    objectFit: 'cover',
    borderRadius: 6,
    flexShrink: 0,
  } as React.CSSProperties,
  fullTopicWithThumb: { display: 'flex', gap: 10, alignItems: 'flex-start' } as React.CSSProperties,
  topicName: {
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,
  headline: {
    fontSize: 11,
    opacity: 0.8,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  } as React.CSSProperties,
  count: { fontSize: 10, opacity: 0.6 } as React.CSSProperties,
  list: { display: 'flex', flexDirection: 'column', gap: 16 } as React.CSSProperties,
  fullTopic: { display: 'flex', flexDirection: 'column', gap: 6 } as React.CSSProperties,
  fullTopicHeader: { display: 'flex', alignItems: 'baseline', gap: 8 } as React.CSSProperties,
  article: { fontSize: 13 } as React.CSSProperties,
  articleLink: { color: 'inherit', textDecoration: 'none' } as React.CSSProperties,
};

function ArticleLine({ article, showImage }: { article: TrendingTopic['articles'][number]; showImage?: boolean }) {
  return (
    <div style={{ ...styles.article, ...(showImage && article.imageUrl ? styles.fullTopicWithThumb : {}) }}>
      {showImage && article.imageUrl && <img src={article.imageUrl} alt="" style={styles.articleThumb} />}
      <div>
        {article.url ? (
          <a href={article.url} target="_blank" rel="noreferrer" style={styles.articleLink}>
            {article.title}
          </a>
        ) : (
          article.title
        )}
        {article.source && <span style={{ opacity: 0.6 }}> &middot; {article.source}</span>}
      </div>
    </div>
  );
}

function TopicArticleList({ topic, showImages }: { topic: TrendingTopic; showImages: boolean }) {
  return (
    <div style={styles.fullTopic}>
      <div style={styles.fullTopicHeader}>
        <strong>{topic.topic}</strong>
        <span style={styles.count}>
          {topic.newsCount} article{topic.newsCount === 1 ? '' : 's'}
        </span>
      </div>
      {topic.articles.slice(0, 5).map((article, i) => (
        <ArticleLine key={article.url ?? i} article={article} showImage={showImages} />
      ))}
    </div>
  );
}

/**
 * Trending news widget. Requires `apiEndpoint` pointing at a deployed
 * instance of the bundled Cloudflare Worker (`worker/index.ts`) — renders
 * nothing when it's not configured, still loading, or errored, so it never
 * disrupts the layout it's dropped into.
 */
export function TrendingNews(props: Props) {
  const {
    className,
    style,
    compact,
    maxTopics = 8,
    expandable,
    expandedMaxTopics = 15,
    showImages = true,
    ...options
  } = props;
  const { data, loading, error } = useTrendingNews(options);
  const [expanded, setExpanded] = useState(false);

  if (!options.apiEndpoint) return null;
  if (loading && !data) return null;
  if (error) return null;
  if (!data || data.topics.length === 0) return null;

  const topics = data.topics.slice(0, maxTopics);

  if (compact) {
    const showExpanded = expandable && expanded;
    const expandedTopics = showExpanded ? data.topics.slice(0, expandedMaxTopics) : [];

    return (
      <div className={className} style={{ ...styles.compactRoot, ...style }}>
        <div style={styles.compactHeaderRow}>
          <div style={styles.compactHeader}>Trending</div>
          {expandable && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={showExpanded}
              aria-label={showExpanded ? 'Collapse trending news' : 'Expand trending news'}
              style={styles.expandToggle}
            >
              <ChevronIcon up={showExpanded} />
            </button>
          )}
        </div>

        {showExpanded ? (
          <div style={styles.expandedList}>
            {expandedTopics.map((topic) => (
              <TopicArticleList key={topic.topic} topic={topic} showImages={showImages} />
            ))}
          </div>
        ) : (
          <div style={styles.topicRow}>
            {topics.map((topic) => {
              const thumb = showImages ? topic.articles[0]?.imageUrl : undefined;
              return (
                <a
                  key={topic.topic}
                  href={topic.articles[0]?.url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.topicCard}
                >
                  {thumb && <img src={thumb} alt="" style={styles.topicThumb} />}
                  <div style={styles.topicCardBody}>
                    <div style={styles.topicName}>{topic.topic}</div>
                    {topic.articles[0] && <div style={styles.headline}>{topic.articles[0].title}</div>}
                    <div style={styles.count}>
                      {topic.newsCount} article{topic.newsCount === 1 ? '' : 's'}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className} style={{ ...styles.root, ...styles.list, ...style }}>
      {topics.map((topic) => (
        <TopicArticleList key={topic.topic} topic={topic} showImages={showImages} />
      ))}
    </div>
  );
}

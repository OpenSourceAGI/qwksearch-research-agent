import React from 'react';
import { useTrendingNews } from '../hooks/useTrendingNews';
import type { TrendingNewsOptions } from '../types';

type Props = TrendingNewsOptions & {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  /** Max trending topics to render (default 8). */
  maxTopics?: number;
};

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
  compactHeader: {
    fontSize: 11,
    fontWeight: 600,
    opacity: 0.75,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } as React.CSSProperties,
  topicRow: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 } as React.CSSProperties,
  topicCard: {
    minWidth: 160,
    maxWidth: 200,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textDecoration: 'none',
    color: 'inherit',
  } as React.CSSProperties,
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

/**
 * Trending news widget. Requires `apiEndpoint` pointing at a deployed
 * instance of the bundled Cloudflare Worker (`worker/index.ts`) — renders
 * nothing when it's not configured, still loading, or errored, so it never
 * disrupts the layout it's dropped into.
 */
export function TrendingNews(props: Props) {
  const { className, style, compact, maxTopics = 8, ...options } = props;
  const { data, loading, error } = useTrendingNews(options);

  if (!options.apiEndpoint) return null;
  if (loading && !data) return null;
  if (error) return null;
  if (!data || data.topics.length === 0) return null;

  const topics = data.topics.slice(0, maxTopics);

  if (compact) {
    return (
      <div className={className} style={{ ...styles.compactRoot, ...style }}>
        <div style={styles.compactHeader}>Trending</div>
        <div style={styles.topicRow}>
          {topics.map((topic) => (
            <a
              key={topic.topic}
              href={topic.articles[0]?.url}
              target="_blank"
              rel="noreferrer"
              style={styles.topicCard}
            >
              <div style={styles.topicName}>{topic.topic}</div>
              {topic.articles[0] && <div style={styles.headline}>{topic.articles[0].title}</div>}
              <div style={styles.count}>
                {topic.newsCount} article{topic.newsCount === 1 ? '' : 's'}
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...styles.root, ...styles.list, ...style }}>
      {topics.map((topic) => (
        <div key={topic.topic} style={styles.fullTopic}>
          <div style={styles.fullTopicHeader}>
            <strong>{topic.topic}</strong>
            <span style={styles.count}>
              {topic.newsCount} article{topic.newsCount === 1 ? '' : 's'}
            </span>
          </div>
          {topic.articles.slice(0, 5).map((article, i) => (
            <div key={article.url ?? i} style={styles.article}>
              {article.url ? (
                <a href={article.url} target="_blank" rel="noreferrer" style={styles.articleLink}>
                  {article.title}
                </a>
              ) : (
                article.title
              )}
              {article.source && <span style={{ opacity: 0.6 }}> &middot; {article.source}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders the full extracted article body including the source URL link, citation info, word count,
 * and the Lexical rich-text viewer with optional text-highlight mode.
 */
'use client';

import React from 'react';
import { Article } from '../../types/research';
import LexicalArticleViewer from './LexicalArticleViewer';

interface ArticleContentProps {
  article: Article;
  isHighlightMode: boolean;
}

const ArticleContent: React.FC<ArticleContentProps> = ({ article, isHighlightMode }) => {
  return (
    <div className="border-t border-border pt-6">
      <div>
        {/* Title and Favorite Button */}
        <div className="flex items-start justify-between mb-2"></div>

        {/* Citation Information */}
        {article.cite && (
          <div
            className="mb-3 text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: article.cite }}
          />
        )}

        {/* Metadata */}
        <div className="mb-3 text-xs text-muted-foreground space-y-1">
          {article.word_count && (
            <p>
              <span className="font-semibold">Words:</span>{' '}
              {article.word_count.toLocaleString()}
            </p>
          )}
        </div>

        {/* Article Content with Lexical Editor */}
        <div id="article-content">
          <LexicalArticleViewer
            html={article.html || ''}
            isHighlightMode={isHighlightMode}
          />
        </div>
      </div>
    </div>
  );
};

export default ArticleContent;

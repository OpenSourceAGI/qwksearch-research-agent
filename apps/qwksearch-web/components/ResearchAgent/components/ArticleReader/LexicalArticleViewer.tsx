/**
 * Lightweight read-only article viewer that renders sanitized extracted HTML.
 * Replaces the previous reason-editor (Lexical) based reader so the web app has
 * no dependency on the reason-editor package.
 */
'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface LexicalArticleViewerProps {
  html: string;
  isHighlightMode?: boolean;
}

/**
 * Renders extracted article HTML as sanitized, styled prose.
 */
const LexicalArticleViewer: React.FC<LexicalArticleViewerProps> = ({
  html,
  isHighlightMode = false,
}) => {
  const cleanHtml = useMemo(
    () => DOMPurify.sanitize(html || '', {
      ADD_TAGS: ['figure', 'figcaption'],
      ADD_ATTR: ['loading'],
    }),
    [html],
  );

  return (
    <div
      className={`prose prose-neutral dark:prose-invert max-w-none ${
        isHighlightMode ? 'select-text' : ''
      }`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export default LexicalArticleViewer;

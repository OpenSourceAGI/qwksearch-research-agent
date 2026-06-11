/**
 * Lightweight read-only article viewer that renders sanitized extracted HTML.
 * Replaces the previous reason-editor (Lexical) based reader so the web app has
 * no dependency on the reason-editor package.
 */
'use client';

import React, { useMemo } from 'react';
import sanitizeHtml from 'sanitize-html';

interface LexicalArticleViewerProps {
  html: string;
  isHighlightMode?: boolean;
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'figure',
    'figcaption',
    'h1',
    'h2',
    'span',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'id', 'style'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
};

/**
 * Renders extracted article HTML as sanitized, styled prose.
 */
const LexicalArticleViewer: React.FC<LexicalArticleViewerProps> = ({
  html,
  isHighlightMode = false,
}) => {
  const cleanHtml = useMemo(
    () => sanitizeHtml(html || '', SANITIZE_OPTIONS),
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

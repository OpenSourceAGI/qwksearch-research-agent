/**
 * Lightweight read-only article viewer that renders sanitized extracted HTML.
 * Replaces the previous reason-editor (Lexical) based reader so the web app has
 * no dependency on the reason-editor package.
 */
'use client';

import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

interface LexicalArticleViewerProps {
  html: string;
  isHighlightMode?: boolean;
}

/**
 * Renders extracted article HTML as sanitized, styled prose.
 *
 * Sanitization runs only in the browser: `dompurify` requires a real DOM, and
 * the isomorphic build pulls in `jsdom`, which cannot be bundled for the
 * Cloudflare Workers runtime. SSR renders an empty container; the sanitized
 * markup is injected after mount.
 */
const LexicalArticleViewer: React.FC<LexicalArticleViewerProps> = ({
  html,
  isHighlightMode = false,
}) => {
  const [cleanHtml, setCleanHtml] = useState('');

  useEffect(() => {
    setCleanHtml(
      DOMPurify.sanitize(html || '', {
        ADD_TAGS: ['figure', 'figcaption'],
        ADD_ATTR: ['loading'],
      }),
    );
  }, [html]);

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

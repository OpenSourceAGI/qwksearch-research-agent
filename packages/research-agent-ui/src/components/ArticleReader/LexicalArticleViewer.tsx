/**
 * @fileoverview Lightweight read-only article viewer that renders sanitized extracted HTML.
 *
 * Replaces the previous reason-editor (Lexical) based reader so the web app has no dependency on the reason-editor package.
 */
'use client';

import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

interface LexicalArticleViewerProps {
  html: string;
  isHighlightMode?: boolean;
  /** Reading zoom multiplier applied to the article font size (1 = 100%). */
  fontScale?: number;
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
  fontScale = 1,
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
      className={[
        'prose prose-neutral dark:prose-invert max-w-none',
        // Comfortable, generous line spacing for long-form reading
        'prose-p:leading-[1.9] prose-li:leading-[1.9] prose-p:my-5 prose-li:my-1.5',
        // Refined typographic rhythm and headings
        'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:leading-snug',
        'prose-h1:mt-8 prose-h2:mt-8 prose-h3:mt-6',
        'prose-blockquote:leading-[1.8] prose-blockquote:border-l-2',
        'prose-img:rounded-lg prose-img:my-6',
        isHighlightMode ? 'select-text' : '',
      ].join(' ')}
      style={{
        // Scale the whole article for the zoom feature; em keeps prose ratios intact
        fontSize: `${fontScale}em`,
        // A slightly warmer reading font stack improves long-form legibility
        fontFamily:
          'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export default LexicalArticleViewer;

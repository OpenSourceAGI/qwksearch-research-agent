/**
 * @fileoverview The article's outline — its H1, H2 and H3 headings as the
 * Fumadocs "On this page" table of contents (the same `TOCProvider`,
 * `TOCScrollArea` and clerk-style `TOCItems`/`TOCItem` that Fumadocs docs
 * pages and the extract-refdoc runtime use). Fumadocs' scroll-spy marks the
 * heading in view as active; clicking an entry scrolls the article to it.
 */
'use client';

import React, { useCallback } from 'react';
import { TOCProvider, TOCScrollArea } from 'fumadocs-ui/components/toc';
import { TOCEmpty, TOCItem, TOCItems } from 'fumadocs-ui/components/toc/clerk';
import type { ArticleOutlineItem } from './articleOutline';

interface ArticleOutlineProps {
  items: ArticleOutlineItem[];
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scrolls to the heading an outline link names and moves focus to it, so
 * keyboard and screen-reader users land where the page did. Handled here
 * rather than left to the anchor so the page URL's hash is not rewritten.
 */
function goToHeading(event: React.MouseEvent<HTMLAnchorElement>) {
  const id = decodeURIComponent((event.currentTarget.getAttribute('href') ?? '').slice(1));
  const heading = id ? document.getElementById(id) : null;
  if (!heading) return;
  event.preventDefault();
  heading.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

const ArticleOutline: React.FC<ArticleOutlineProps> = ({ items }) => {
  const onClick = useCallback(goToHeading, []);

  if (items.length === 0) return <TOCEmpty />;

  return (
    <TOCProvider toc={items}>
      <TOCScrollArea>
        <TOCItems>
          {items.map((item) => (
            <TOCItem key={item.url} item={item} onClick={onClick} />
          ))}
        </TOCItems>
      </TOCScrollArea>
    </TOCProvider>
  );
};

export default ArticleOutline;

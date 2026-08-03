/**
 * Toolbar control (React) for the TableOfContents extension, which adds an automatic table of contents. Renders the button and dispatches the matching editor command when activated.
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { TocItem } from '../TableOfContents';

interface RichTextTableOfContentsProps {
  editor: any;
  className?: string;
  maxDepth?: number;
}

export function RichTextTableOfContents({
  editor,
  className = '',
  maxDepth = 3,
}: RichTextTableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrolledOverIds, setScrolledOverIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!editor) return;

    const updateToc = () => {
      const headings: TocItem[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'heading' && maxDepth && node.attrs.level <= maxDepth) {
          const id = node.attrs.id || `heading-${pos}`;
          headings.push({
            id,
            level: node.attrs.level,
            title: node.textContent,
            textContent: node.textContent,
            position: pos,
            isActive: false,
            isScrolledOver: false,
          });
        }
      });
      setToc(headings);
    };

    updateToc();
    editor.on('update', updateToc);
    return () => editor.off('update', updateToc);
  }, [editor, maxDepth]);

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  }, []);

  useEffect(() => {
    if (!editor?.view?.dom) return;

    const handleScroll = () => {
      const viewportCenter = window.innerHeight / 2;
      const scrolledIds = new Set<string>();

      toc.forEach(item => {
        const element = document.getElementById(item.id);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        if (rect.top < viewportCenter && rect.bottom > viewportCenter) {
          setActiveId(item.id);
        }

        if (rect.bottom < window.innerHeight && rect.top >= 0) {
          scrolledIds.add(item.id);
        }
      });

      setScrolledOverIds(scrolledIds);
    };

    const container = editor?.view?.dom?.parentElement || document;
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [toc, editor?.view?.dom]);

  if (!toc.length) {
    return null;
  }

  const getIndentation = (level: number) => {
    return `ml-${(level - 1) * 3}`;
  };

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Contents</h3>
      <nav className="space-y-1">
        {toc.map(item => (
          <button
            key={item.id}
            onClick={() => scrollToHeading(item.id)}
            className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors ${
              getIndentation(item.level)
            } ${
              activeId === item.id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : scrolledOverIds.has(item.id)
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {item.textContent || `Heading ${item.level}`}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default RichTextTableOfContents;

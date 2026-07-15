/**
 * Inline citation badge rendered from `<citation>` tags in AI responses; clicking opens the source in the
 * article extract panel, and hovering shows the page title and favicon in a tooltip.
 */
'use client';

import { useMemo } from 'react';
import type { Document } from 'extract-webpage/search';
import { useExtractPanel } from '../ArticleReader/ExtractPanelContext';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../../ui/tooltip';

const Citation = ({
  href,
  children,
  sources,
}: {
  href: string;
  children: React.ReactNode;
  sources?: Document[];
}) => {
  const { openPanel } = useExtractPanel();

  const source = useMemo(() => {
    if (!sources || !href) return null;
    return sources.find((s) => s.metadata?.url === href) ?? null;
  }, [sources, href]);

  const domain = useMemo(() => {
    try {
      return new URL(href).hostname.replace('www.', '');
    } catch {
      return source?.metadata?.source || '';
    }
  }, [href, source]);

  const title = source?.metadata?.title || '';
  const faviconUrl = `https://s2.googleusercontent.com/s2/favicons?domain_url=${href}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            openPanel(href, '');
          }}
          className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative cursor-pointer hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
        >
          {children}
        </a>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-72 p-2.5"
      >
        <div className="flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconUrl}
            alt=""
            width={16}
            height={16}
            className="rounded flex-shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium leading-snug line-clamp-2">
              {title || domain}
            </p>
            {title && (
              <p className="text-[10px] opacity-70 truncate mt-0.5">
                {domain}
              </p>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default Citation;

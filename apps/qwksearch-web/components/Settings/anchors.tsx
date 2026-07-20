"use client";

import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const HIGHLIGHT_CLASS = 'settings-anchor-highlight';
const HIGHLIGHT_DURATION_MS = 2400;

export const highlightAnchor = (id: string, scroll = true): boolean => {
  const el = document.getElementById(id);
  if (!el) return false;
  if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove(HIGHLIGHT_CLASS);
  // force a reflow so the animation restarts on repeated clicks
  void el.offsetWidth;
  el.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(
    () => el.classList.remove(HIGHLIGHT_CLASS),
    HIGHLIGHT_DURATION_MS,
  );
  return true;
};

export const copyAnchorLink = (anchorId?: string) => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = anchorId ?? '';
  window.history.replaceState(null, '', url);
  navigator.clipboard
    .writeText(url.toString())
    .then(() => toast.success('Link copied to clipboard'))
    .catch(() => toast.error('Failed to copy link'));
  if (anchorId) highlightAnchor(anchorId, false);
};

export const AnchorTitle = ({
  anchorId,
  className,
  children,
}: {
  anchorId?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={() => copyAnchorLink(anchorId)}
    title="Copy link to this section"
    className={cn(
      'group/anchor inline-flex items-center gap-1.5 text-left cursor-pointer',
      className,
    )}
  >
    {children}
    <Link2
      size={12}
      className="shrink-0 opacity-0 group-hover/anchor:opacity-60 transition-opacity"
    />
  </button>
);

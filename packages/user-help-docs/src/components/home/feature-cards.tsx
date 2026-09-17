/**
 * @file feature-cards.tsx
 * @description The "where to go next" grid on the docs landing page.
 *
 * Fumadocs' own `<Cards>` is a fine in-page aside, but on a front door it reads
 * as four paragraphs in boxes. These carry an icon, lift on hover, and say
 * where they go — the difference between a list of links and a way in.
 *
 * Icons are named rather than passed as elements so MDX can use the grid
 * without importing anything, and resolved from an explicit map so the docs
 * bundle carries the handful of glyphs it actually shows rather than all of
 * Lucide.
 */
import type { ReactNode } from 'react';

import {
  ArrowRight,
  BookOpen,
  Blocks,
  FileText,
  Puzzle,
  Rocket,
  Search,
  SquareTerminal,
} from 'lucide-react';

import { cn } from '../../lib/utils';

const icons = {
  blocks: Blocks,
  book: BookOpen,
  file: FileText,
  puzzle: Puzzle,
  rocket: Rocket,
  search: Search,
  terminal: SquareTerminal,
} as const;

/** Name of one of the icons this grid can draw. */
export type FeatureIcon = keyof typeof icons;

export function FeatureCards({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
}: {
  icon: FeatureIcon;
  title: ReactNode;
  description: ReactNode;
  href: string;
}) {
  const Icon = icons[icon];

  return (
    <a
      href={href}
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border bg-fd-card p-5 no-underline',
        'transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg border bg-fd-background text-fd-primary [&_svg]:size-4.5">
        <Icon />
      </span>
      <span className="mt-1 flex items-center gap-1.5 font-medium text-fd-card-foreground">
        {title}
        <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </span>
      <span className="text-sm text-fd-muted-foreground">{description}</span>
    </a>
  );
}

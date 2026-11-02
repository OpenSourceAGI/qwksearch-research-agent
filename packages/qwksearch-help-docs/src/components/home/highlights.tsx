/**
 * @file highlights.tsx
 * @description The "what makes it different" rows on the docs landing page.
 *
 * This was a two-column Markdown table with an empty header row — which renders
 * as a table with a blank strip on top, and wraps badly on a phone because a
 * table cannot reflow. The same content as rows of term + explanation says the
 * same thing, reads down a narrow screen, and needs no header to excuse itself.
 */
import type { ReactNode } from 'react';

import { Check } from 'lucide-react';

export function Highlights({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-6 divide-y rounded-xl border bg-fd-card">{children}</div>
  );
}

export function Highlight({
  /** The claim, in two or three words. */
  title,
  /** What it means in practice; may contain links. */
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 p-4">
      <Check className="mt-0.5 size-4 shrink-0 text-fd-primary" />
      <div className="text-sm">
        <span className="font-medium text-fd-card-foreground">{title}</span>
        <span className="text-fd-muted-foreground"> — </span>
        <span className="text-fd-muted-foreground [&_a]:font-medium [&_a]:text-fd-foreground [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </span>
      </div>
    </div>
  );
}

/**
 * @file hero.tsx
 * @description The masthead of the docs landing page.
 *
 * A doc page's chrome — breadcrumb, title, description, the copy-for-LLM row —
 * is right for a doc and wrong for a front door, so the index page turns it off
 * (see the `isLandingPage` branch in `app/docs/[[...slug]]/page.tsx`) and opens
 * with this instead.
 *
 * Rendered on the server: nothing here is interactive, and the docs ship to a
 * Cloudflare Worker where every avoidable client component is worth avoiding.
 */
import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export function Hero({
  /** Small capitalised line above the title, e.g. "Open-source research agent". */
  eyebrow,
  /** The page's real `<h1>`. */
  title,
  /** One or two sentences under the title. */
  description,
  /** {@link HeroAction} links, laid out in a row. */
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative isolate -mx-4 mb-12 overflow-hidden border-b px-4 pt-10 pb-12 sm:-mx-6 sm:px-6 md:pt-16 md:pb-16',
        className,
      )}
    >
      {/* Decorative only: a soft wash plus a faint grid, both built from theme
          tokens so they follow the light/dark switch without a second palette. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-fd-primary/8 via-fd-background to-fd-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-fd-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-fd-border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {eyebrow ? (
        <p className="mb-4 inline-flex items-center rounded-full border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground">
          {eyebrow}
        </p>
      ) : null}

      <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h1>

      {description ? (
        <p className="mt-4 max-w-2xl text-pretty text-base text-fd-muted-foreground sm:text-lg">
          {description}
        </p>
      ) : null}

      {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}

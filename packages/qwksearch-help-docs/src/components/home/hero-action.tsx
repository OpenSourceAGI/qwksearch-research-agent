/**
 * @file hero-action.tsx
 * @description The call-to-action links under the hero.
 *
 * Styled with fumadocs' `buttonVariants` — the same shadcn `cva` button the
 * rest of the docs chrome uses — so a CTA here and a button in the navbar are
 * the same object, and a theme change moves both.
 */
import type { ReactNode } from 'react';

import { buttonVariants } from 'fumadocs-ui/components/ui/button';

import { cn } from '../../lib/utils';

export function HeroAction({
  href,
  /** `primary` for the one thing we want clicked; `secondary` for the rest. */
  variant = 'secondary',
  children,
  className,
}: {
  href: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  children: ReactNode;
  className?: string;
}) {
  const external = /^https?:\/\//.test(href);

  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className={cn(
        buttonVariants({ color: variant }),
        'gap-2 px-4 py-2 text-sm [&_svg]:size-4',
        className,
      )}
    >
      {children}
    </a>
  );
}

/**
 * @file layout.config.tsx
 * @description Shared nav/links for the home and docs layouts. Every link
 * comes from `docsConfig.topLinks` (lib/fumadocs/customize-docs.ts).
 */
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpen, FlaskConical, Package, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { docsConfig } from '@/lib/fumadocs/customize-docs';

const icons: Record<string, ReactNode> = {
  Docs: <BookOpen />,
  Playground: <FlaskConical />,
  npm: <Package />,
};

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="inline-flex items-center gap-2 font-semibold">
        <TrendingUp className="size-5 text-fd-primary" />
        {docsConfig.title}
      </span>
    ),
  },
  links: docsConfig.topLinks
    // GitHub gets the dedicated icon link via `githubUrl` below.
    .filter((link) => link.text !== 'GitHub')
    .map((link) => ({
      text: link.text,
      url: link.url,
      icon: icons[link.text],
      external: link.external,
    })),
  githubUrl: docsConfig.topLinks.find((link) => link.text === 'GitHub')?.url ?? docsConfig.github,
};

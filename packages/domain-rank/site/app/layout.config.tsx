import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpen, Globe, Package, PlayCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { docsConfig } from '@/lib/fumadocs/customize-docs';

const icons: Record<string, ReactNode> = {
  Docs: <BookOpen />,
  'Live demo': <PlayCircle />,
  npm: <Package />,
};

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="inline-flex items-center gap-2 font-semibold">
        <Globe className="size-5 text-fd-primary" />
        {docsConfig.title}
      </span>
    ),
  },
  links: docsConfig.topLinks
    .filter((link) => link.text !== 'GitHub')
    .map((link) => ({
      text: link.text,
      url: link.url,
      icon: icons[link.text],
      external: link.external,
    })),
  githubUrl: docsConfig.github,
};

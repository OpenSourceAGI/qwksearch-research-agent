/**
 * @file layout.config.tsx
 * @description Navbar/sidebar options for the docs layout, driven by
 * `docsConfig` so a consuming app only has to render `<DocsLayout>`.
 */
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { docsConfig } from './config';
import { ThemeDropdown } from './components/layout/theme-dropdown';

export const docsLayoutOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="inline-flex items-center gap-2">
        <img src={docsConfig.favicon} alt="" className="size-5 rounded" />
        {docsConfig.title}
      </span>
    ),
    url: docsConfig.baseUrl,
  },
  links: [
    ...docsConfig.topLinks.map((link) => ({
      text: link.text,
      url: link.url,
      external: link.external,
    })),
    {
      type: 'custom' as const,
      children: <ThemeDropdown />,
    },
  ],
  githubUrl: docsConfig.github,
};

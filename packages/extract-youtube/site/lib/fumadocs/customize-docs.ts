/**
 * @file customize-docs.ts
 * @description Site-wide settings for the extract-youtube docs: title, links
 * and the GitHub locations the "Edit"/"Open in GitHub" buttons point at.
 */

/**
 * Where this site is served. The docs, the live demo (`/demo`) and the
 * Storybook (`/storybook/`) are one Worker, so everything below is a path on
 * this origin; the full URL is only for links that leave the site (READMEs,
 * npm).
 */
export const SITE_URL = 'https://youtube.js.org';

/** The live demo: video grid, floating player, transcript modal, admin library. */
export const DEMO_URL = '/demo';

/** Storybook for the React components, built into this site's static assets. */
export const STORYBOOK_URL = '/storybook/';

export const NPM_URL = 'https://www.npmjs.com/package/extract-youtube';

export const GITHUB_URL = 'https://github.com/OpenSourceAGI/qwksearch-research-agent';

export const docsConfig: DocsConfig = {
  title: 'extract-youtube',
  description:
    'Fast, no-browser YouTube transcript extraction for Node, serverless and Cloudflare Workers — plus React components for a floating player, synced transcripts and video grids.',
  github: GITHUB_URL,
  githubPackages: `${GITHUB_URL}/tree/master/packages`,
  githubDocs: `${GITHUB_URL}/tree/master/packages/extract-youtube/site/content/docs`,
  favicon: '/icon.svg',
  topLinks: [
    { text: 'Docs', url: '/docs' },
    { text: 'Live demo', url: DEMO_URL },
    // Not an App Router route: `external` makes it a full page load.
    { text: 'Storybook', url: STORYBOOK_URL, external: true },
    { text: 'npm', url: NPM_URL, external: true },
    { text: 'GitHub', url: GITHUB_URL, external: true },
  ],
};

export interface DocsConfig {
  /** The title of the documentation site */
  title: string;
  /** A short description of the project */
  description: string;
  /** URL to the GitHub repository */
  github: string;
  /** Base URL for editing the docs pages on GitHub */
  githubDocs: string;
  /** Base URL for the packages directory on GitHub */
  githubPackages?: string;
  /** Path to the favicon */
  favicon?: string;
  /** Links displayed in the navigation bar */
  topLinks: {
    text: string;
    url: string;
    external?: boolean;
  }[];
}

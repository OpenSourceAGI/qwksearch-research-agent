/**
 * @file customize-docs.ts
 * @description Site-wide settings for the extract-youtube docs: title, links
 * and the GitHub locations the "Edit"/"Open in GitHub" buttons point at.
 */

/**
 * Where the live demo (video grid, floating player, transcript modal, admin
 * library) is deployed. Change it here and every link on the site follows,
 * including the Storybook link, which is served from `${DEMO_URL}/storybook/`.
 */
export const DEMO_URL = 'https://extract-youtube-demo.qwksearch.workers.dev';

/** Storybook for the React components, published alongside the demo. */
export const STORYBOOK_URL = `${DEMO_URL}/storybook/`;

export const NPM_URL = 'https://www.npmjs.com/package/extract-youtube';

export const GITHUB_URL = 'https://github.com/OpenSourceAGI/qwksearch-research-agent';

export const docsConfig: DocsConfig = {
  title: 'extract-youtube',
  description:
    'Fast, no-browser YouTube transcript extraction for Node, serverless and Cloudflare Workers — plus React components for a floating player, synced transcripts and video grids.',
  github: GITHUB_URL,
  githubPackages: `${GITHUB_URL}/tree/master/packages`,
  githubDocs: `${GITHUB_URL}/tree/master/apps/extract-youtube-docs/content/docs`,
  favicon: '/icon.svg',
  topLinks: [
    { text: 'Docs', url: '/docs' },
    { text: 'Live demo', url: DEMO_URL, external: true },
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

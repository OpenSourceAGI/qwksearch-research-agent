/**
 * @file config.ts
 * @description Branding, links and route configuration for the QwkSearch help
 * docs. Everything a consuming app needs to render the docs chrome lives here,
 * so the app's `/docs` routes stay thin.
 */

export interface DocsConfig {
  /** Title shown in the docs navbar and used as the metadata title template. */
  title: string;
  /** One-line description of the docs site. */
  description: string;
  /** Route the docs are mounted at, without a trailing slash. */
  baseUrl: string;
  /** Repository the docs are written in. */
  github: string;
  /** Base URL for viewing a docs page's source on GitHub. */
  githubDocs: string;
  /** Base URL for the monorepo's packages directory on GitHub. */
  githubPackages: string;
  /** Coordinates for the "Edit on GitHub" link on each page. */
  githubEdit: { owner: string; repo: string; sha: string; pathPrefix: string };
  /** Static search index endpoint served by the consuming app. */
  searchApi: string;
  /** Favicon shown next to the title in the navbar. */
  favicon: string;
  /** Links rendered in the docs navbar. */
  topLinks: { text: string; url: string; external?: boolean }[];
}

const repo = 'https://github.com/OpenSourceAGI/qwksearch-research-agent';

export const docsConfig: DocsConfig = {
  title: 'QwkSearch Docs',
  description:
    'Search 100+ sites, extract articles, PDFs and transcripts, and write cited research with the REASON editor.',
  baseUrl: '/docs',
  github: repo,
  githubDocs: `${repo}/blob/master/packages/user-help-docs/content/docs`,
  githubPackages: `${repo}/tree/master/packages`,
  githubEdit: {
    owner: 'OpenSourceAGI',
    repo: 'qwksearch-research-agent',
    sha: 'master',
    pathPrefix: 'packages/user-help-docs/content/docs',
  },
  searchApi: '/docs/api/docs-search',
  favicon: '/favicon.ico',
  topLinks: [
    { text: 'Search', url: '/' },
    { text: 'API Reference', url: '/api' },
  ],
};

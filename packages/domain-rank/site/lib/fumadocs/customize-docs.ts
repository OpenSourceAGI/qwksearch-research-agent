export const DEMO_URL = '/demo';

export const NPM_URL = 'https://www.npmjs.com/package/domain-rank';

export const GITHUB_URL = 'https://github.com/OpenSourceAGI/qwksearch-research-agent';

export const PACKAGE_GITHUB_URL = `${GITHUB_URL}/tree/master/packages/domain-rank`;

export const docsConfig: DocsConfig = {
  title: 'domain-rank',
  description:
    'Offline lookup for top-ranked domains from Tranco and CommonCrawl — source labels, influence ranks, favicons, and sample top-domain listings with no API key.',
  github: GITHUB_URL,
  githubDocs: `${GITHUB_URL}/tree/master/packages/domain-rank/site/content/docs`,
  favicon: '/icon.svg',
  topLinks: [
    { text: 'Docs', url: '/docs' },
    { text: 'Live demo', url: DEMO_URL },
    { text: 'npm', url: NPM_URL, external: true },
    { text: 'GitHub', url: GITHUB_URL, external: true },
  ],
};

export interface DocsConfig {
  title: string;
  description: string;
  github: string;
  githubDocs: string;
  favicon?: string;
  topLinks: {
    text: string;
    url: string;
    external?: boolean;
  }[];
}

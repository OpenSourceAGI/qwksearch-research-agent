/**
 * @file customize-docs.ts
 * @description Site-wide settings for the investing docs: title, links and
 * the GitHub locations the "Open in GitHub" buttons point at.
 */

export const PLAYGROUND_URL = '/docs/playground';

export const NPM_URL = 'https://www.npmjs.com/package/investing';

export const GITHUB_URL = 'https://github.com/OpenSourceAGI/qwksearch-research-agent';

export const PACKAGE_GITHUB_URL = `${GITHUB_URL}/tree/master/packages/investing`;

export const docsConfig: DocsConfig = {
  title: 'investing',
  description:
    'A TypeScript toolkit for markets: Alpaca brokerage, Yahoo / Finnhub / SEC stock data with a unified quote service, Polymarket sync and analytics, the PredictOS prediction-market agents and arbitrage finder, LangGraph-style bull-vs-bear trading agents, and XGBoost correlation models.',
  github: GITHUB_URL,
  githubDocs: `${GITHUB_URL}/tree/master/packages/investing/site/content/docs`,
  favicon: '/icon.svg',
  topLinks: [
    { text: 'Docs', url: '/docs' },
    { text: 'Playground', url: PLAYGROUND_URL },
    { text: 'npm', url: NPM_URL, external: true },
    { text: 'GitHub', url: PACKAGE_GITHUB_URL, external: true },
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
  /** Path to the favicon */
  favicon?: string;
  /** Links displayed in the navigation bar */
  topLinks: {
    text: string;
    url: string;
    external?: boolean;
  }[];
}

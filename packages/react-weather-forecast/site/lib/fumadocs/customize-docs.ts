/**
 * @file customize-docs.ts
 * @description Site-wide settings for the use-weather-forecast docs: title,
 * links and the GitHub locations the "Open in GitHub" buttons point at.
 */

/** The interactive playground. */
export const DEMO_URL = '/demo';

/** Every component variant, built by Storybook into `public/storybook`. */
export const STORYBOOK_URL = '/storybook/index.html';

export const NPM_URL = 'https://www.npmjs.com/package/use-weather-forecast';

export const GITHUB_URL = 'https://github.com/OpenSourceAGI/qwksearch-research-agent';

export const PACKAGE_GITHUB_URL = `${GITHUB_URL}/tree/master/packages/react-weather-forecast`;

export const docsConfig: DocsConfig = {
  title: 'use-weather-forecast',
  description:
    'A React weather forecast widget and hook: current conditions, the next hours and days from Open-Meteo, located by IP, with four fallback weather APIs, a 12-hour location cache and no API key.',
  github: GITHUB_URL,
  githubDocs: `${GITHUB_URL}/tree/master/packages/react-weather-forecast/site/content/docs`,
  favicon: '/icon.svg',
  topLinks: [
    { text: 'Docs', url: '/docs' },
    { text: 'Live demo', url: DEMO_URL },
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
  /** Path to the favicon */
  favicon?: string;
  /** Links displayed in the navigation bar */
  topLinks: {
    text: string;
    url: string;
    external?: boolean;
  }[];
}

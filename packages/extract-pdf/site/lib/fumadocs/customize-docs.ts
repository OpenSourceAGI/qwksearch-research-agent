/**
 * @file customize-docs.ts
 * @description Site-wide settings for the extract-pdf + extract-webpage docs:
 * title, links and the GitHub locations the "Edit"/"Open in GitHub" buttons
 * point at.
 */

/**
 * Where this site is served, for links that leave it (READMEs, npm). Not set
 * yet: no custom domain is attached, so the Worker answers only on its
 * workers.dev address. Set it here (and in the two READMEs) once one is; the
 * site's own links are paths and need no change.
 */
export const SITE_URL: string | null = null;

/** The live demo: PDF → HTML with OCR follow-up, and webpage → article + citation. */
export const DEMO_URL = '/demo';

export const NPM_PDF_URL = 'https://www.npmjs.com/package/extract-pdf';

export const NPM_WEBPAGE_URL = 'https://www.npmjs.com/package/extract-webpage';

export const GITHUB_URL = 'https://github.com/OpenSourceAGI/qwksearch-research-agent';

export const docsConfig: DocsConfig = {
  title: 'extract-pdf + extract-webpage',
  description:
    'Turn PDFs and webpages into clean, structured HTML with citations — in Node, the browser and Cloudflare Workers, with optional Granite Docling OCR for scanned pages, tables and figures.',
  github: GITHUB_URL,
  githubPackages: `${GITHUB_URL}/tree/master/packages`,
  githubDocs: `${GITHUB_URL}/tree/master/packages/extract-pdf/site/content/docs`,
  favicon: '/icon.svg',
  topLinks: [
    { text: 'Docs', url: '/docs' },
    { text: 'Live demo', url: DEMO_URL },
    { text: 'extract-pdf', url: NPM_PDF_URL, external: true },
    { text: 'extract-webpage', url: NPM_WEBPAGE_URL, external: true },
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

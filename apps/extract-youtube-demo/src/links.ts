/**
 * Where the header links point. The Storybook ships inside this deploy, so it
 * is a same-origin path; the docs are their own Worker
 * (apps/extract-youtube-docs). Override the docs URL at build time with
 * `VITE_DOCS_URL` when it is deployed somewhere else.
 */
export const LINKS = {
  storybook: '/storybook/',
  docs: (import.meta.env.VITE_DOCS_URL as string | undefined) ?? 'https://extract-youtube-docs.qwksearch.workers.dev',
  npm: 'https://www.npmjs.com/package/extract-youtube',
  github: 'https://github.com/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/extract-youtube',
} as const;

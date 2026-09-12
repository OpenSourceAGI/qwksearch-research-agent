/**
 * @fileoverview The palette's curated list of app pages (`t ` prefix).
 *
 * The package ships the same UI to four shells and has no dependency on any
 * one of them, so — like CardMirror's `workspace-links.ts`, which this is
 * modelled on — the list is maintained here by hand rather than derived from
 * a router. Keep it in sync when `apps/qwksearch-web` gains a major page.
 */

/** One navigable destination in the app. */
export interface SpotlightLink {
  href: string;
  label: string;
  description: string;
  /** Extra search terms that should find this page but aren't worth showing. */
  keywords?: string;
  /** Only listed in builds that bundle the REASON editor. */
  docsOnly?: boolean;
}

export const SPOTLIGHT_LINKS: SpotlightLink[] = [
  {
    href: '/',
    label: 'Research',
    description: 'The search and chat window',
    keywords: 'home chat ask question search',
  },
  {
    href: '/workspace',
    label: 'REASON Editor',
    description: 'Write up findings in the document editor',
    keywords: 'docs document write draft report',
    docsOnly: true,
  },
  {
    href: '/library',
    label: 'Library',
    description: 'Saved chats, uploads and extracted articles',
    keywords: 'history saved files uploads archive',
  },
  {
    href: '/news',
    label: 'News',
    description: 'Trending stories by topic',
    keywords: 'discover trending headlines',
  },
  {
    href: '/docs',
    label: 'User Guide',
    description: 'How every part of the app works',
    keywords: 'documentation help manual',
  },
  {
    href: '/features',
    label: 'Features',
    description: 'Everything the research agent can do',
    keywords: 'capabilities tour',
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Models, connectors, search sources and preferences',
    keywords: 'preferences configure options',
  },
  {
    href: '/enterprise',
    label: 'Enterprise',
    description: 'Self-hosting and team plans',
    keywords: 'business pricing teams',
  },
  {
    href: '/legal/privacy',
    label: 'Privacy Policy',
    description: 'What is stored and what is not',
    keywords: 'legal terms data',
  },
];

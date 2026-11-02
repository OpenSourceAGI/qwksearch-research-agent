/**
 * @file search.ts
 * @description Search index for the help docs. Built with `structure()` over
 * the raw MDX body, since this package compiles content at request time rather
 * than through `fumadocs-mdx`'s build-time pipeline, so pages carry no
 * pre-computed structured data.
 */
import { structure } from 'fumadocs-core/mdx-plugins';
import { createFromSource } from 'fumadocs-core/search/server';

import { source, type HelpDocPageData } from './source';

export const searchServer = createFromSource(source, {
  buildIndex(page) {
    const data = page.data as HelpDocPageData;

    return {
      id: page.url,
      url: page.url,
      title: data.title,
      description: data.description,
      structuredData: structure(data.content),
    };
  },
});

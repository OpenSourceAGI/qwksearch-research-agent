/**
 * @file route.ts
 * @description Search index for the docs search dialog.
 *
 * `staticGET` returns the whole Orama index as JSON, and the dialog
 * (components/fumadocs/layout/search.tsx, `type: 'static'`) searches it in the
 * browser. The index is built from the in-bundle page data, so this works on a
 * Worker with no filesystem; `revalidate = false` lets it be cached forever.
 *
 * `?query=` is accepted but ignored: the static index is always the full
 * index. `searchGET` is not used because it would rebuild the index per
 * request on every Worker isolate.
 */
import { source } from '@/lib/fumadocs/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, { language: 'english' });

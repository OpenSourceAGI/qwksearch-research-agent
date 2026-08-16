/**
 * @fileoverview Converts a search API result into the `Document` shape the
 * source-card grid renders. `MessageSources.tsx` previously duplicated this
 * mapping at two call sites (category switch and "load more" pagination)
 * and the two had drifted apart — the pagination copy was missing `img_src`,
 * silently dropping images from paginated Images-category results.
 */
import type { Document } from 'chat-agent-toolkit';

export interface SearchResultDocumentInput {
  title?: string;
  source?: string;
  thumbnail?: string;
  url?: string;
  img_src?: string;
  iframe_src?: string;
  snippet?: string;
  content?: string;
}

export function mapSearchResultToDocument(result: SearchResultDocumentInput): Document {
  return {
    pageContent: result.snippet || result.content || '',
    metadata: {
      title: result.title || '',
      source: result.source || '',
      thumbnail: result.thumbnail || '',
      url: result.url || '',
      ...(result.img_src && { img_src: result.img_src }),
      ...(result.iframe_src && { iframe_src: result.iframe_src }),
    },
  };
}

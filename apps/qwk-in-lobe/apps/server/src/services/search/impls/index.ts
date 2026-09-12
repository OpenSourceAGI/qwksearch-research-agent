import { AnspireImpl } from './anspire';
import { BochaImpl } from './bocha';
import { BraveImpl } from './brave';
import { ExaImpl } from './exa';
import { FirecrawlImpl } from './firecrawl';
import { GoogleImpl } from './google';
import { JinaImpl } from './jina';
import { KagiImpl } from './kagi';
import { QwkSearchImpl } from './qwksearch';
import { Search1APIImpl } from './search1api';
import { SearXNGImpl } from './searxng';
import { TavilyImpl } from './tavily';
import { type SearchServiceImpl } from './type';

/**
 * Available search service implementations
 */
export enum SearchImplType {
  Anspire = 'anspire',
  Bocha = 'bocha',
  Brave = 'brave',
  Exa = 'exa',
  Firecrawl = 'firecrawl',
  Google = 'google',
  Jina = 'jina',
  Kagi = 'kagi',
  /** QwkSearch's own fan-out across 100+ engines (Worker A `/api/agent/search`). */
  QwkSearch = 'qwksearch',
  Search1API = 'search1api',
  SearXNG = 'searxng',
  Tavily = 'tavily',
}

/**
 * Caller context an impl may use, fixed for the impl's lifetime.
 *
 * Only the QwkSearch impl reads it today: `userId` is how the signed-in user's
 * stored search preferences reach the fan-out (migration to-do § 1.9). Every
 * other impl ignores it, and omitting it resolves the operator's configuration,
 * so the options bag is additive for callers that do not have a session.
 */
export interface SearchImplOptions {
  userId?: string;
}

/**
 * Create a search service implementation instance
 */
export const createSearchServiceImpl = (
  type: SearchImplType = SearchImplType.SearXNG,
  options: SearchImplOptions = {},
): SearchServiceImpl => {
  switch (type) {
    case SearchImplType.Anspire: {
      return new AnspireImpl();
    }

    case SearchImplType.Bocha: {
      return new BochaImpl();
    }

    case SearchImplType.Brave: {
      return new BraveImpl();
    }

    case SearchImplType.Exa: {
      return new ExaImpl();
    }

    case SearchImplType.Firecrawl: {
      return new FirecrawlImpl();
    }

    case SearchImplType.Google: {
      return new GoogleImpl();
    }

    case SearchImplType.Jina: {
      return new JinaImpl();
    }

    case SearchImplType.Kagi: {
      return new KagiImpl();
    }

    case SearchImplType.QwkSearch: {
      return new QwkSearchImpl({ userId: options.userId });
    }

    case SearchImplType.SearXNG: {
      return new SearXNGImpl();
    }

    case SearchImplType.Tavily: {
      return new TavilyImpl();
    }

    default: {
      return new Search1APIImpl();
    }
  }
};

export type { SearchServiceImpl } from './type';

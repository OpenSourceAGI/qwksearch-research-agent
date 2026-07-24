<p align="center">
    <img  src="https://i.imgur.com/1MRYUqC.png" />

<br /> 
    <a href="https://www.npmjs.com/package/domain-rank"><img src="https://img.shields.io/npm/dm/domain-rank.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://www.npmjs.com/package/domain-rank"><img src="https://img.shields.io/npm/v/domain-rank.svg" alt="npm version"></a>
    <a href="https://bundlephobia.com/package/domain-rank"><img src="https://img.shields.io/bundlephobia/minzip/domain-rank" alt="Size"></a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>  
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
<br />
    <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/vtempest/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>


# domain-rank 

Look up top-ranked domains to get their name, human-readable source label, influence rank, and favicon.

Rank data comes from the [Tranco List](https://tranco-list.eu/) (aggregates Cisco Umbrella, Majestic, Farsight, Chrome UX, and Cloudflare Radar) and [CommonCrawl](https://commoncrawl.org) backlink counts. 

**Use cases:** search/URL autocomplete, bookmark launchers, LLM web-app recommendations, domain reputation scoring.

## Installation

```bash
npm install domain-rank
# or
pnpm add domain-rank
# or
yarn add domain-rank
```

## Usage

### Look up a domain

```js
import { lookupDomain } from 'domain-rank';

const result = lookupDomain('facebook.com');
console.log(result);
// {
//   domain: 'facebook.com',
//   name: 'Facebook',
//   rank: 1,
//   title: 'Facebook',
//   newsRank: undefined,
//   newsTitle: undefined,
//   langCode: undefined
// }
```

### Get top domains

```js
import { getTopDomains } from 'domain-rank';

// Get top 10 domains
const top10 = getTopDomains(10);
console.log(top10);
// [
//   { domain: 'facebook.com', name: 'Facebook', rank: 1, ... },
//   { domain: 'google.com', name: 'Google', rank: 2, ... },
//   { domain: 'instagram.com', name: 'Instagram', rank: 3, ... },
//   ...
// ]
```

### Search domains

```js
import { searchDomains } from 'domain-rank';

const results = searchDomains('social', 5);
// Returns up to 5 domains matching 'social' in name, domain, or title
// sorted by rank
```

### Get favicon

```js
import { getFaviconForDomain } from 'domain-rank';

// Get as base64
const base64Favicon = await getFaviconForDomain('google.com');

// Get as URL
const faviconURL = await getFaviconForDomain('google.com', false);
// Returns: 'https://www.google.com/s2/favicons?domain=google.com'
```

### Format domain names

```js
import { formatDomainAsTitle } from 'domain-rank';

const formatted = formatDomainAsTitle('nytimes.com');
// Returns: "NY Times" - human-readable name with proper capitalization
```

### Utility functions

```js
import { convertURLToDomain, isURLValid, getTotalDomains } from 'domain-rank';

// Extract domain from URL
const domain = convertURLToDomain('https://en.wikipedia.org/wiki/Main_Page');
// Returns: 'wikipedia'

// Validate URL
const isValid = isURLValid('https://example.com');
// Returns: true

// Get total number of domains in dataset
const total = getTotalDomains();
// Returns: ~100000
```

## Dataset Statistics

- **Total domains**: 10,020 top-ranked domains
- **Data file**: `data/domain-rank-merged.json` (297 KB)
- **Format**: Pre-loaded in memory for instant lookups
- **Bundle size**: 
  - ESM: 828 KB (231 KB gzipped)
  - CJS: 828 KB (231 KB gzipped)

### Top 5 Domains

| Rank | Domain | Name |
|------|--------|------|
| 1 | facebook.com | Facebook |
| 2 | google.com | Google |
| 3 | instagram.com | Instagram |
| 4 | youtube.com | YouTube |
| 5 | linkedin.com | LinkedIn |

## Data Format

### Source Data

The raw data is stored in `data/domain-rank-merged.json` as a compact object format:

```json
{
  "facebook.com": ["Facebook", 1],
  "google.com": ["Google", 2],
  "nytimes.com": [197, 38, "NY Times"]
}
```

Format: `[name, rank]` or `[newsRank, rank, title]` for news domains.

### Library API

The library includes 10,020 top-ranked domains with the following information:

- **domain**: The domain name (e.g., "facebook.com")
- **name**: Human-readable name (e.g., "Facebook")
- **rank**: Overall influence rank (lower is better, 1 is top)
- **title**: Full title/description
- **newsRank**: Rank for news/media domains (if applicable)
- **newsTitle**: Media-specific title (if applicable)
- **langCode**: Primary language code (if applicable)

### Data Sources

The ranking combines multiple authoritative sources:

1. **[Tranco List](https://tranco-list.eu/)** - Aggregates:
   - Cisco Umbrella (DNS resolver data)
   - Majestic Million (backlink analysis)
   - Farsight (passive DNS data)
   - Chrome UX Report (real user metrics)
   - Cloudflare Radar (global network data)

2. **[CommonCrawl](https://commoncrawl.org)** - Web-wide backlink counts from petabytes of crawled data

This multi-source approach provides a more stable and manipulation-resistant ranking than single-source lists.

## API Reference

### `lookupDomain(domain: string): DomainLookupResult | null`
Look up information for a specific domain.

### `getTopDomains(n?: number): DomainLookupResult[]`
Get top N domains by rank. Default: 100.

### `searchDomains(query: string, limit?: number): DomainLookupResult[]`
Search domains by name/domain/title. Default limit: 10.

### `getAllDomains(): DomainLookupResult[]`
Get all domains sorted by rank.

### `getTotalDomains(): number`
Get total number of domains in the dataset.

### `getFaviconForDomain(urlOrDomain: string, formatBase64?: boolean): Promise<string>`
Fetch favicon for a domain. Returns base64 by default, or URL if `formatBase64` is false.

### `formatDomainAsTitle(domain: string): string`
Format domain into human-readable name with proper capitalization.

### `cleanSourceTitle(title: string): string | null`
Clean and normalize a page title (removes common suffixes, HTML, etc.).

### `shouldRemoveDomain(domain: string): boolean`
Check if a domain should be removed from rankings.

### `findMainDomain(domain: string): string | null`
Find the main domain for a given alternate domain.

### `getTitleOverride(domain: string): string | null`
Get a custom title override for a domain.

### `getSourceTitle(domain: string): Promise<string | null>`
Fetch the page title from a domain's website.

### `convertURLToDomain(url: string): string`
Extract domain from URL.

### `isURLValid(url: string): boolean`
Validate URL format.

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm run type-check

# Build library
pnpm run build

# Run tests
pnpm test
```

## License

MIT

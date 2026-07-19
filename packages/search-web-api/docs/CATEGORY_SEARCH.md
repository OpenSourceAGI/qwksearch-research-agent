# Category-Based Search with Weighted Ranking

This document explains how the TypeScript search API implements category-based search with weighted ranking, based on the Python SearXNG implementation.

## Overview

The search API now supports:

- **Multi-category search**: Search across specific categories (general, news, academic, etc.)
- **Result combination**: Automatically combine and deduplicate results from multiple engines
- **Weighted ranking**: Score results based on engine quality, category importance, and position
- **Category grouping**: Results are grouped by category for better organization

## Architecture

### Key Components

1. **CategoryRegistry** (`app/lib/category-registry.ts`)

   - Manages engines organized by category
   - Supports 13 categories: general, images, videos, news, maps, music, it, academic, social, files, torrents, shopping, specialized
   - Each category has configurable default weights

2. **ResultContainer** (`app/lib/result-container.ts`)

   - Deduplicates results by URL hash
   - Merges duplicate results from different engines
   - Calculates weighted scores
   - Groups results by category

3. **Search Class** (`app/lib/search.ts`)
   - Main search interface
   - Queries multiple engines in parallel
   - Applies category and engine filters
   - Returns combined, scored, and sorted results

## How Scoring Works

The scoring algorithm is based on SearXNG's Python implementation:

```
score = Σ (weight / position) for each position
```

Where:

- **weight** = `base_weight × engine_weight × category_weight × num_occurrences`
- **position**: The position of the result in the engine's results (1st, 2nd, 3rd, etc.)
- **num_occurrences**: How many engines found this result

### Engine Weights

Higher quality engines get higher weights:

- Google: 1.5
- Bing: 1.3
- DuckDuckGo: 1.2
- Google Scholar: 1.4
- Semantic Scholar: 1.3
- Default: 1.0

### Category Weights

Different categories can have different importance:

- Academic: 1.3 (higher credibility)
- IT: 1.2 (technical accuracy)
- News: 1.1
- Social: 0.9 (lower due to potential duplicates)
- Torrents: 0.8 (lower due to potential spam)
- Default: 1.0

### Example Score Calculation

If a result appears at:

- Position 1 in Google (weight 1.5)
- Position 3 in Bing (weight 1.3)
- Category: general (weight 1.0)

```
score = (1.5 × 1.0 × 2 / 1) + (1.3 × 1.0 × 2 / 3)
      = 3.0 + 0.87
      = 3.87
```

The multiplier of 2 is because the result appeared in 2 engines.

## Usage Examples

### 1. Search a Single Category

```typescript
import { Search } from "./app/lib/search.js";

const search = new Search();

// Search only general web engines
const results = await search.searchByCategories("typescript", ["general"]);
```

### 2. Search Multiple Categories

```typescript
// Search across general, IT, and academic categories
const results = await search.searchByCategories("machine learning", [
  "general",
  "it",
  "academic",
]);
```

### 3. Use the Standard Search with Category Filter

```typescript
// More explicit control
const results = await search.search(
  "climate change",
  1, // page number
  undefined, // engine names
  ["news", "general"] // categories
);
```

### 4. Search Specific Engines

```typescript
// Search only specific engines
const results = await search.search(
  "nodejs",
  1,
  ["google", "duckduckgo", "github"] // specific engines
);
```

## Available Categories

| Category    | Description         | Default Weight | Example Engines                    |
| ----------- | ------------------- | -------------- | ---------------------------------- |
| general     | General web search  | 1.0            | Google, Bing, DuckDuckGo           |
| images      | Image search        | 1.0            | Unsplash, Bing Images, Flickr      |
| videos      | Video search        | 1.0            | YouTube, Vimeo, Dailymotion        |
| news        | News search         | 1.1            | Google News, HackerNews, Bing News |
| maps        | Maps and locations  | 1.0            | OpenStreetMap, Photon              |
| it          | Programming/IT      | 1.2            | GitHub, StackOverflow, NPM         |
| academic    | Scientific papers   | 1.3            | Google Scholar, arXiv, PubMed      |
| social      | Social media        | 0.9            | Reddit, Twitter, Mastodon          |
| torrents    | Torrent search      | 0.8            | 1337x, ThePirateBay, YTS           |
| shopping    | Shopping            | 1.0            | eBay                               |
| specialized | Specialized engines | 1.1            | Wikipedia, IMDB, Genius            |

## Result Deduplication

Results with the same URL (normalized) are automatically merged:

1. **URL normalization**: Removes protocol, www, trailing slashes
2. **Title matching**: Includes partial title match for disambiguation
3. **Result merging**:
   - Combines engine names
   - Tracks all positions
   - Uses longer content/title
   - Prefers HTTPS URLs
   - Accumulates scores from all engines

Example:

```
Result from Google at position 1
+ Same URL from Bing at position 2
= Merged result with:
  - engines: ['google', 'bing']
  - positions: [1, 2]
  - Higher combined score
```

## Category Grouping

Results are grouped by category in the final output:

1. **First pass**: Sort all results by score (descending)
2. **Second pass**: Group similar categories together
   - Maximum 8 results per group
   - Maximum distance of 20 positions to look back
   - Groups by: category + template + has_image

This ensures related results appear together while maintaining score-based relevance.

## API Reference

### Search Class Methods

#### `search(query, pageno, engineNames?, categories?)`

Main search method with full control.

**Parameters:**

- `query`: Search query string
- `pageno`: Page number (default: 1)
- `engineNames`: Optional array of specific engine names
- `categories`: Optional array of category names

**Returns:** `Promise<MergedResult[]>`

#### `searchByCategories(query, categories, pageno?)`

Convenience method for multi-category search.

**Parameters:**

- `query`: Search query string
- `categories`: Array of category names
- `pageno`: Page number (default: 1)

**Returns:** `Promise<MergedResult[]>`

#### `getCategories()`

Get list of available categories.

**Returns:** `string[]`

#### `getEnginesByCategory(category)`

Get engines for a specific category.

**Parameters:**

- `category`: Category name

**Returns:** `Engine[]`

#### `getCategoryStats()`

Get statistics about engines and categories.

**Returns:** Object with category statistics

### MergedResult Interface

```typescript
interface MergedResult {
  url?: string;
  title: string;
  content: string;
  engines: string[]; // List of engines that found this result
  positions: number[]; // Positions in each engine's results
  score: number; // Calculated weighted score
  priority: "low" | "normal" | "high";
  category?: string; // Primary category
  template?: string; // Result template type
  thumbnail?: string;
  publishedDate?: string;
  author?: string;
  // ... other fields
}
```

## Performance Considerations

1. **Parallel execution**: All engines are queried in parallel using `Promise.all()`
2. **Health tracking**: Unhealthy engines are automatically skipped
3. **Timeout handling**: Individual engine timeouts don't block the overall search
4. **Deduplication**: Hash-based deduplication is O(1) using Map
5. **Sorting**: Results are sorted once using efficient native sort

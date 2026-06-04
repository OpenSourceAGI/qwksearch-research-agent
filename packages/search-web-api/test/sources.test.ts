/**
 * Unit tests for all search-web/sources engines
 *
 * Tests each engine function directly to verify it returns
 * valid JSON results with the expected structure.
 */

import { describe, it, expect } from "vitest";
import { EngineResult } from "../src/search-web-types.js";
import { extractResponseData } from "../src/engine.js";
import grab from "grab-url";

grab("", {
  setDefaults: true,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
});

// Import all engines from the exported list
import { ALL_ENGINES } from "../src/search.js";

/**
 * Validates that results are a non-empty array of objects with
 * at minimum title and content strings.
 */
function assertValidResults(results: EngineResult[], engineName: string) {
  expect(Array.isArray(results), `${engineName} should return an array`).toBe(
    true,
  );
  expect(
    results.length,
    `${engineName} should return at least 1 result`,
  ).toBeGreaterThan(0);

  for (const r of results) {
    expect(typeof r.title, `${engineName} result title should be string`).toBe(
      "string",
    );
    expect(
      r.title.length,
      `${engineName} result title should not be empty`,
    ).toBeGreaterThan(0);
    expect(
      typeof r.content,
      `${engineName} result content should be string`,
    ).toBe("string");
    if (r.url) {
      expect(typeof r.url).toBe("string");
    }
    if (r.engine) {
      expect(typeof r.engine).toBe("string");
    }
  }
}

const DEFAULT_QUERIES: Record<string, string> = {
  general: "typescript",
  it: "typescript",
  images: "sunset",
  videos: "tutorial",
  news: "technology",
  academic: "machine%20learning",
  torrents: "ubuntu",
  social: "programming",
  maps: "New%20York",
  shopping: "laptop",
  specialized: "books",
};

const SPECIFIC_QUERIES: Record<string, string> = {
  npm: "express",
  crates: "serde",
  dockerhub: "nginx",
  pypi: "requests",
  packagist: "laravel",
  rubygems: "rails",
  imgur: "cats",
  pixabay: "mountains",
  wallhaven: "landscape",
  deviantart: "art",
  openclipart: "arrow",
  vimeo: "documentary",
  dailymotion: "music",
  peertube: "linux",
  arxiv: "neural%20networks",
  wikidata: "python",
  semantic_scholar: "deep%20learning",
  crossref: "quantum%20computing",
  pubmed: "cancer",
  nyaa: "one%20piece",
  yts: "inception",
  eztv: "breaking%20bad",
  medium: "javascript",
  soundcloud: "lofi",
  photon: "Paris",
  apple_maps: "Tokyo",
  wikipedia: "javascript",
  imdb: "inception",
  genius: "bohemian%20rhapsody",
  archive: "books",
  openlibrary: "tolkien",
  wttr: "London",
  annas_archive: "python",
  goodreads: "dune",
};

// All engines with their query and category for organized testing
const engines = ALL_ENGINES.map((eng) => ({
  name: eng.name,
  fn: eng.fn,
  category: eng.categories[0] || "general",
  query:
    SPECIFIC_QUERIES[eng.name] ||
    DEFAULT_QUERIES[eng.categories[0] || "general"] ||
    "test",
}));

// Group engines by category for organized describe blocks
const byCategory = engines.reduce(
  (acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  },
  {} as Record<string, typeof engines>,
);

// Track results across all tests for summary
const testResults: Array<{
  name: string;
  category: string;
  status: "pass" | "fail";
  resultCount: number;
  timeMs: number;
  error?: string;
}> = [];

describe("Source Engine Unit Tests", () => {
  for (const [category, categoryEngines] of Object.entries(byCategory)) {
    describe(`${category}`, () => {
      for (const eng of categoryEngines) {
        it(`${eng.name} returns valid JSON results`, async () => {
          const start = Date.now();
          let results: EngineResult[];

          try {
            let rawResults = await eng.fn(eng.query, 1);
            results = extractResponseData(rawResults) as EngineResult[];
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            testResults.push({
              name: eng.name,
              category: eng.category,
              status: "fail",
              resultCount: 0,
              timeMs: Date.now() - start,
              error: errMsg,
            });
            throw error;
          }

          const timeMs = Date.now() - start;

          // Allow null/undefined to be treated as empty array
          if (!results) results = [];

          testResults.push({
            name: eng.name,
            category: eng.category,
            status: results.length > 0 ? "pass" : "fail",
            resultCount: results.length,
            timeMs,
          });

          assertValidResults(results, eng.name);
        }, 20000);
      }
    });
  }
});

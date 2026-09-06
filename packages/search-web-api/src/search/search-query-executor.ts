/**
 * Search Query Executor — The main `Search` class that orchestrates a query
 * across any subset of the registered engine adapters. It initialises engine
 * health tracking and category registration on construction, runs engines in
 * parallel with configurable per-engine and per-category weights, feeds results
 * into a `ResultContainer` for deduplication and scoring, and returns a
 * deduplicated, ranked list of `MergedResult` objects.
 */

import { engineStatusTracker } from "../registry/search-engine-status-tracker";
import { categoryRegistry, CATEGORIES } from "../registry/search-engine-category-registry";
import { ResultContainer } from "./search-result-container";
import { ALL_ENGINES } from "./search-engines-registry-list";
import { MergedResult, CategoryWeight, EngineMetadata } from "../types/search-result-types";

export class Search {
  private engines: EngineMetadata[] = ALL_ENGINES;

  constructor() {
    for (const engine of this.engines) {
      engineStatusTracker.initEngine(engine.name, engine.categories);
      categoryRegistry.registerEngine({
        name: engine.name,
        categories: engine.categories,
        request: async () => {},
        response: async () => [],
      });
    }
  }

  /**
   * Run a search query against the specified engines or categories.
   *
   * @param query - Search terms to query.
   * @param pageno - Result page number (default 1).
   * @param engineNames - If provided, restrict to these engine names.
   * @param categories - If provided (and engineNames is empty), restrict to these categories.
   * @returns Deduplicated, scored, and grouped results.
   */
  async search(
    query: string,
    pageno: number = 1,
    engineNames?: string[],
    categories?: string[],
  ): Promise<MergedResult[]> {
    const resultContainer = new ResultContainer();
    const encodedQuery = query.trim();

    const engineWeights: { [key: string]: number } = {
      google: 1.5,
      bing: 1.3,
      duckduckgo: 1.2,
      brave: 1.1,
      startpage: 1.1,
      google_scholar: 1.4,
      semantic_scholar: 1.3,
      arxiv: 1.3,
    };
    resultContainer.setEngineWeights(engineWeights);

    const categoryWeights: CategoryWeight = {};
    for (const [key, config] of Object.entries(CATEGORIES)) {
      categoryWeights[key] = config.defaultWeight;
    }
    resultContainer.setCategoryWeights(categoryWeights);

    let enginesToUse: EngineMetadata[];

    if (engineNames && engineNames.length > 0) {
      enginesToUse = this.engines.filter((e) => engineNames.includes(e.name));
    } else if (categories && categories.length > 0) {
      enginesToUse = this.engines.filter((e) =>
        e.categories.some((cat) => categories.includes(cat)),
      );
    } else {
      enginesToUse = this.engines;
    }

    const promises = enginesToUse
      .filter((engine) => {
        if (!engineStatusTracker.isEngineHealthy(engine.name)) {
          console.log(`Skipping unhealthy engine: ${engine.name}`);
          return false;
        }
        return true;
      })
      .map(async (engine) => {
        const startTime = Date.now();
        try {
          const engineResults = await engine.fn(encodedQuery, pageno);
          const responseTime = Date.now() - startTime;
          engineStatusTracker.recordSuccess(engine.name, responseTime, query);

          if (engineResults && Array.isArray(engineResults)) {
            for (const result of engineResults) {
              if (!result.category && engine.categories.length > 0) {
                result.category = engine.categories[0];
              }
            }
            resultContainer.extend(engine.name, engineResults);
          }
        } catch (error) {
          const responseTime = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          engineStatusTracker.recordFailure(engine.name, errorMessage, responseTime, query);
          console.error(`Error in engine ${engine.name}:`, errorMessage);
        }
      });

    await Promise.all(promises);

    resultContainer.close();

    const orderedResults = resultContainer.getOrderedResults();

    const stats = resultContainer.getStats();
    console.log(
      `Search "${query}": ${stats.totalResults} results, ${stats.duplicatesMerged} merged, avg ${stats.engineCoverage.toFixed(1)} engines/result`,
    );

    return orderedResults;
  }

  /**
   * Search across multiple categories and combine the results.
   *
   * @param query - Search terms.
   * @param categories - Categories to include (e.g. `['general', 'news', 'academic']`).
   * @param pageno - Page number (default 1).
   */
  async searchByCategories(
    query: string,
    categories: string[],
    pageno: number = 1,
  ): Promise<MergedResult[]> {
    return this.search(query, pageno, undefined, categories);
  }

  /** Return all registered engine names. */
  getEngines(): string[] {
    return this.engines.map((e) => e.name);
  }

  /** Return engine names that belong to the given category. */
  getEnginesByCategory(category: string): string[] {
    return this.engines.filter((e) => e.categories.includes(category)).map((e) => e.name);
  }

  /** Return all registered category names. */
  getCategories(): string[] {
    return categoryRegistry.getCategories();
  }

  /** Return per-category engine counts and totals. */
  getCategoryStats() {
    return categoryRegistry.getStats();
  }

  /** Return the current health status for a named engine. */
  getEngineStatus(engineName: string) {
    return engineStatusTracker.getStatus(engineName);
  }

  /** Return health status records for all registered engines. */
  getAllEngineStatuses() {
    return engineStatusTracker.getAllStatuses();
  }
}

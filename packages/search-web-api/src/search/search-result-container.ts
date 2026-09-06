/**
 * Search Result Container — Central aggregator for results returned by multiple
 * search engine adapters. Handles URL-based deduplication, merging of duplicate
 * results (choosing longer content, preferring HTTPS URLs, unioning engine lists),
 * position-weighted scoring with per-engine and per-category multipliers, and a
 * two-pass category-grouping algorithm that clusters similar results together in
 * the final output. Also tracks infoboxes, suggestions, answers, corrections,
 * unresponsive engines, and per-engine timing metrics.
 */

import { EngineResult } from "../types/search-engine-interface";
import {
  PriorityType,
  MergedResult,
  EngineWeight,
  CategoryWeight,
  Infobox,
  UnresponsiveEngine,
  Timing,
  EngineData,
} from "../types/search-result-types";

export class ResultContainer {
  private mainResultsMap: Map<string, MergedResult> = new Map();
  private mainResultsSorted: MergedResult[] | null = null;
  private closed: boolean = false;
  private engineWeights: EngineWeight = {};
  private categoryWeights: CategoryWeight = {};

  public infoboxes: Infobox[] = [];
  public suggestions: Set<string> = new Set();
  public answers: Map<string, any> = new Map();
  public corrections: Set<string> = new Set();

  public unresponsiveEngines: Set<UnresponsiveEngine> = new Set();
  public timings: Timing[] = [];
  public engineData: EngineData = {};

  private numberofResults: number[] = [];
  public paging: boolean = false;
  public redirectUrl: string | null = null;

  public onResult: (result: any) => boolean = () => true;

  /**
   * Configure engine weights for scoring. Higher weight = more influence from this engine.
   */
  setEngineWeights(weights: EngineWeight) {
    this.engineWeights = weights;
  }

  /**
   * Configure category weights for scoring. Applied as a multiplier on top of engine weights.
   */
  setCategoryWeights(weights: CategoryWeight) {
    this.categoryWeights = weights;
  }

  private getEngineWeight(engineName: string): number {
    return this.engineWeights[engineName] || 1.0;
  }

  private getCategoryWeight(category: string): number {
    return this.categoryWeights[category] || 1.0;
  }

  /**
   * Compute a deduplication hash for a result based on its normalised URL and title prefix.
   */
  private calculateResultHash(result: EngineResult): string {
    const url = result.url || result.link || "";

    try {
      const urlObj = new URL(url);
      let normalized = urlObj.hostname.replace(/^www\./, "") + urlObj.pathname;
      normalized = normalized.replace(/\/$/, "").toLowerCase();

      const titlePart = (result.title || "").toLowerCase().replace(/\s+/g, "");
      return `${normalized}:${titlePart.substring(0, 50)}`;
    } catch {
      const fallback = (result.title || result.content || url).toLowerCase();
      return fallback.replace(/\s+/g, "").substring(0, 100);
    }
  }

  /**
   * Merge a new engine result into an existing MergedResult, preferring longer
   * content, non-empty optional fields, and HTTPS URLs.
   */
  private mergeTwoResults(origin: MergedResult, other: EngineResult): void {
    if ((other.content || "").length > (origin.content || "").length) {
      origin.content = other.content;
    }

    if ((other.title || "").length > (origin.title || "").length) {
      origin.title = other.title;
    }

    if (!origin.img_src && other.img_src) origin.img_src = other.img_src;
    if (!origin.thumbnail && other.thumbnail) origin.thumbnail = other.thumbnail;
    if (!origin.publishedDate && other.publishedDate) origin.publishedDate = other.publishedDate;
    if (!origin.author && other.author) origin.author = other.author;

    const originUrl = origin.url || origin.link || "";
    const otherUrl = other.url || other.link || "";
    if (originUrl && !originUrl.startsWith("https://") && otherUrl.startsWith("https://")) {
      origin.url = other.url;
      origin.link = other.link;
    }

    if (other.engine && !origin.engines.includes(other.engine)) {
      origin.engines.push(other.engine);
    }
  }

  /**
   * Add results from an engine. Ignored after the container is closed.
   */
  extend(engineName: string, results: EngineResult[]): void {
    if (this.closed) {
      console.warn("ResultContainer is closed, ignoring results from", engineName);
      return;
    }

    let mainCount = 0;

    for (const result of results) {
      if (!this.onResult(result)) continue;

      if ((result as any).suggestion) {
        this.suggestions.add((result as any).suggestion);
        continue;
      }

      if ((result as any).answer) {
        const answer = (result as any).answer;
        this.answers.set(answer, { engine: engineName, answer });
        continue;
      }

      if ((result as any).correction) {
        this.corrections.add((result as any).correction);
        continue;
      }

      if ((result as any).infobox) {
        this.mergeInfobox(result as any, engineName);
        continue;
      }

      if ((result as any).number_of_results) {
        this.numberofResults.push((result as any).number_of_results);
        continue;
      }

      if ((result as any).engine_data) {
        const key = (result as any).key || "data";
        if (!this.engineData[engineName]) this.engineData[engineName] = {};
        this.engineData[engineName][key] = (result as any).engine_data;
        continue;
      }

      mainCount++;
      this.mergeMainResult(result, mainCount, engineName);
    }
  }

  private mergeInfobox(infoboxResult: any, engineName: string): void {
    const newInfobox: Infobox = {
      ...infoboxResult,
      engine: engineName,
      engines: new Set([engineName]),
    };

    if (newInfobox.id) {
      const existing = this.infoboxes.find((ib) => ib.id === newInfobox.id);
      if (existing) {
        this.mergeTwoInfoboxes(existing, newInfobox);
        return;
      }
    }

    this.infoboxes.push(newInfobox);
  }

  private mergeTwoInfoboxes(origin: Infobox, other: Infobox): void {
    other.engines.forEach((e) => origin.engines.add(e));

    if (other.urls) {
      if (!origin.urls) origin.urls = [];

      for (const url2 of other.urls) {
        const exists = origin.urls.some(
          (url1) =>
            (url2.entity && url1.entity === url2.entity) || url1.url === url2.url,
        );
        if (!exists) origin.urls.push(url2);
      }
    }

    if (other.img_src && !origin.img_src) origin.img_src = other.img_src;

    if (other.attributes) {
      if (!origin.attributes) origin.attributes = [];

      const existingLabels = new Set(
        origin.attributes.map((a) => a.label || a.entity).filter(Boolean),
      );

      for (const attr of other.attributes) {
        const key = attr.label || attr.entity;
        if (key && !existingLabels.has(key)) origin.attributes.push(attr);
      }
    }

    if (other.content && (!origin.content || other.content.length > origin.content.length)) {
      origin.content = other.content;
    }
  }

  private mergeMainResult(result: EngineResult, position: number, engineName: string): void {
    const resultHash = this.calculateResultHash(result);
    const existing = this.mainResultsMap.get(resultHash);

    if (!existing) {
      const mergedResult: MergedResult = {
        ...result,
        engine: engineName,
        engines: [engineName],
        positions: [position],
        score: 0,
        priority: (result as any).priority || "normal",
        resultHash,
      };
      this.mainResultsMap.set(resultHash, mergedResult);
    } else {
      this.mergeTwoResults(existing, result);
      existing.positions.push(position);
    }
  }

  /**
   * Score a result using position-weighted scoring with engine and category multipliers.
   *
   * Algorithm:
   * - weight = product of all engine weights × category weight × number of positions
   * - low priority: contributes nothing
   * - high priority: adds full weight per position
   * - normal priority: adds weight / position (inverse-position decay)
   */
  private calculateScore(result: MergedResult): number {
    let weight = 1.0;

    for (const engineName of result.engines) {
      weight *= this.getEngineWeight(engineName);
    }

    if (result.category) {
      weight *= this.getCategoryWeight(result.category);
    }

    weight *= result.positions.length;

    let score = 0;

    for (const position of result.positions) {
      if (result.priority === "low") continue;
      else if (result.priority === "high") score += weight;
      else score += weight / position;
    }

    return score;
  }

  /**
   * Freeze the container and compute final scores. Must be called before
   * `getOrderedResults()`.
   */
  close(): void {
    if (this.closed) return;

    this.closed = true;

    for (const result of this.mainResultsMap.values()) {
      result.score = this.calculateScore(result);
    }
  }

  /**
   * Return results sorted by score with a category-grouping pass that clusters
   * similar results within a sliding window of 20 positions (max 8 per group).
   */
  getOrderedResults(): MergedResult[] {
    if (!this.closed) this.close();

    if (this.mainResultsSorted) return this.mainResultsSorted;

    const results = Array.from(this.mainResultsMap.values()).sort(
      (a, b) => b.score - a.score,
    );

    const groupedResults: MergedResult[] = [];
    const categoryPositions: Map<string, { index: number; count: number }> = new Map();

    const maxCount = 8;
    const maxDistance = 20;

    for (const res of results) {
      const hasImage = !!(res.thumbnail || res.img_src);
      const categoryKey = `${res.category || "general"}:${res.template || "default"}:${hasImage ? "img" : "noimg"}`;

      const group = categoryPositions.get(categoryKey);

      if (
        group &&
        group.count > 0 &&
        groupedResults.length - group.index < maxDistance
      ) {
        const insertIndex = group.index;
        groupedResults.splice(insertIndex, 0, res);

        for (const value of categoryPositions.values()) {
          if (value.index >= insertIndex) value.index += 1;
        }

        group.count -= 1;
      } else {
        groupedResults.push(res);
        categoryPositions.set(categoryKey, { index: groupedResults.length, count: maxCount });
      }
    }

    this.mainResultsSorted = groupedResults;
    return this.mainResultsSorted;
  }

  /**
   * Return all results without ordering (useful for debugging).
   */
  getRawResults(): MergedResult[] {
    return Array.from(this.mainResultsMap.values());
  }

  /**
   * Track an engine that failed to respond during this search.
   */
  addUnresponsiveEngine(
    engineName: string,
    errorType: string,
    suspended: boolean = false,
  ): void {
    if (this.closed) {
      console.error("Cannot add unresponsive engine after container is closed");
      return;
    }
    this.unresponsiveEngines.add({ engine: engineName, errorType, suspended });
  }

  /**
   * Record timing information for an engine request.
   */
  addTiming(engineName: string, engineTime: number, pageLoadTime: number): void {
    if (this.closed) {
      console.error("Cannot add timing after container is closed");
      return;
    }
    this.timings.push({ engine: engineName, total: engineTime, load: pageLoadTime });
  }

  /**
   * Return the average number of results reported by engines, or 0 if fewer than
   * the actual deduplicated count (indicating the average is not meaningful).
   */
  getNumberOfResults(): number {
    if (!this.closed) {
      console.error("Call to getNumberOfResults before close()");
      return 0;
    }

    if (this.numberofResults.length === 0) return 0;

    const sum = this.numberofResults.reduce((a, b) => a + b, 0);
    const average = Math.floor(sum / this.numberofResults.length);
    const actualResults = this.getOrderedResults().length;
    return average < actualResults ? 0 : average;
  }

  /**
   * Return all collected timing entries (only valid after `close()`).
   */
  getTimings(): Timing[] {
    if (!this.closed) {
      console.error("Call to getTimings before close()");
      return [];
    }
    return this.timings;
  }

  /**
   * Return a summary of result counts, scores, deduplication, and metadata.
   */
  getStats() {
    const results = Array.from(this.mainResultsMap.values());

    return {
      totalResults: results.length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length || 0,
      engineCoverage:
        results.reduce((sum, r) => sum + r.engines.length, 0) / results.length || 0,
      duplicatesMerged: results.filter((r) => r.engines.length > 1).length,
      categories: [...new Set(results.map((r) => r.category).filter(Boolean))],
      suggestions: this.suggestions.size,
      answers: this.answers.size,
      corrections: this.corrections.size,
      infoboxes: this.infoboxes.length,
      unresponsiveEngines: this.unresponsiveEngines.size,
      numberOfResults: this.getNumberOfResults(),
      paging: this.paging,
    };
  }
}

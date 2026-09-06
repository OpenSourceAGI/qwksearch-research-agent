/**
 * Search Engine Category Registry — Manages the mapping of search engines to
 * categories (general, images, videos, news, maps, academic, etc.) and stores
 * per-category default scoring weights. Based on SearXNG's engine categorisation
 * system, it supports multi-category searches and weighted result combination.
 */

import { Engine } from "../types/search-engine-interface";
import { CategoryConfig } from "../types/search-result-types";

export const CATEGORIES: { [key: string]: CategoryConfig } = {
  general: {
    name: "general",
    displayName: "General",
    description: "General web search",
    defaultWeight: 1.0,
  },
  images: {
    name: "images",
    displayName: "Images",
    description: "Image search",
    defaultWeight: 1.0,
  },
  videos: {
    name: "videos",
    displayName: "Videos",
    description: "Video search",
    defaultWeight: 1.0,
  },
  news: {
    name: "news",
    displayName: "News",
    description: "News search",
    defaultWeight: 1.1,
  },
  maps: {
    name: "maps",
    displayName: "Maps",
    description: "Maps and locations",
    defaultWeight: 1.0,
  },
  music: {
    name: "music",
    displayName: "Music",
    description: "Music search",
    defaultWeight: 1.0,
  },
  it: {
    name: "it",
    displayName: "IT",
    description: "Programming and IT resources",
    defaultWeight: 1.2,
  },
  academic: {
    name: "academic",
    displayName: "Academic",
    description: "Scientific papers and academic resources",
    defaultWeight: 1.3,
  },
  social: {
    name: "social",
    displayName: "Social Media",
    description: "Social media content",
    defaultWeight: 0.9,
  },
  files: {
    name: "files",
    displayName: "Files",
    description: "File search",
    defaultWeight: 1.0,
  },
  torrents: {
    name: "torrents",
    displayName: "Torrents",
    description: "Torrent search",
    defaultWeight: 0.8,
  },
  shopping: {
    name: "shopping",
    displayName: "Shopping",
    description: "Shopping and products",
    defaultWeight: 1.0,
  },
  specialized: {
    name: "specialized",
    displayName: "Specialized",
    description: "Specialized search engines",
    defaultWeight: 1.1,
  },
};

/**
 * CategoryRegistry manages engines organised by category.
 * Supports multi-category search with proper result combination.
 */
export class CategoryRegistry {
  private enginesByCategory: Map<string, Engine[]> = new Map();
  private allEngines: Engine[] = [];

  /**
   * Register a single engine in the registry.
   */
  registerEngine(engine: Engine): void {
    if (!this.allEngines.find((e) => e.name === engine.name)) {
      this.allEngines.push(engine);
    }

    const categories = engine.categories || ["general"];
    for (const category of categories) {
      if (!this.enginesByCategory.has(category)) {
        this.enginesByCategory.set(category, []);
      }

      const engines = this.enginesByCategory.get(category)!;
      if (!engines.find((e) => e.name === engine.name)) {
        engines.push(engine);
      }
    }
  }

  /**
   * Register multiple engines at once.
   */
  registerEngines(engines: Engine[]): void {
    for (const engine of engines) {
      this.registerEngine(engine);
    }
  }

  /**
   * Get all engines that belong to any of the given categories.
   */
  getEnginesByCategories(categories: string[]): Engine[] {
    const engines = new Set<Engine>();

    for (const category of categories) {
      const categoryEngines = this.enginesByCategory.get(category) || [];
      for (const engine of categoryEngines) {
        engines.add(engine);
      }
    }

    return Array.from(engines);
  }

  /**
   * Get engines by their names.
   */
  getEnginesByNames(names: string[]): Engine[] {
    return this.allEngines.filter((e) => names.includes(e.name));
  }

  /**
   * Get all available category names.
   */
  getCategories(): string[] {
    return Array.from(this.enginesByCategory.keys());
  }

  /**
   * Get all registered engines.
   */
  getAllEngines(): Engine[] {
    return this.allEngines;
  }

  /**
   * Get engines for a single category.
   */
  getCategoryEngines(category: string): Engine[] {
    return this.enginesByCategory.get(category) || [];
  }

  /**
   * Get the configuration object for a category.
   */
  getCategoryConfig(category: string): CategoryConfig | undefined {
    return CATEGORIES[category];
  }

  /**
   * Get a count of registered engines per category plus totals.
   */
  getStats() {
    const stats: { [category: string]: number } = {};

    for (const [category, engines] of this.enginesByCategory.entries()) {
      stats[category] = engines.length;
    }

    return {
      totalEngines: this.allEngines.length,
      categories: this.getCategories().length,
      enginesByCategory: stats,
    };
  }
}

/** Global singleton instance used throughout the application. */
export const categoryRegistry = new CategoryRegistry();

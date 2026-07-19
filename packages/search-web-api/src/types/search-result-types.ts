/**
 * Search Result Types — TypeScript interfaces and types for search results,
 * engine configurations, scoring structures, and metadata used throughout
 * the search API. All shared data contracts live here so every module
 * can import from one canonical location.
 */

/**
 * Search Engine Result Item
 */
export interface EngineResult {
  /**
   * The destination URL of the search result.
   */
  url?: string;
  /**
   * Alternative link field (same as url, depends on engine).
   */
  link?: string;
  /**
   * The title of the search result.
   */
  title: string;
  /**
   * The snippet/content description of the search result.
   */
  content: string;
  /**
   * Source URL for a thumbnail image if available.
   */
  thumbnail?: string;
  /**
   * The name of the engine that produced this result.
   */
  engine?: string;
  /**
   * If the result contains an iframe (e.g., embedded video), its source URL.
   */
  iframe_src?: string;
  /**
   * Author or creator of the content.
   */
  author?: string;
  /**
   * Latitude coordinate for location-based results.
   */
  latitude?: number;
  /**
   * Longitude coordinate for location-based results.
   */
  longitude?: number;
  /**
   * Main image source URL for the result.
   */
  img_src?: string;
  /**
   * Date the content was published, usually as a string representation.
   */
  publishedDate?: string;
  /**
   * The category of the result (e.g., general, images, videos).
   */
  category?: string;
  /**
   * Template to be used for rendering this result in the UI.
   */
  template?: string;
}

/**
 * Definition of a Search Engine
 */
export interface Engine {
  /**
   * The unique identifier/name of the engine.
   */
  name: string;
  /**
   * Array of categories this engine supports.
   */
  categories?: string[];
  /**
   * Function to handle preparing and making the search request.
   */
  request: (query: string, params?: any) => Promise<any>;
  /**
   * Function to handle formatting the raw response into EngineResult[].
   */
  response: (response: any) => Promise<EngineResult[]>;
}

/**
 * Modern Search Engine Function signature
 */
export interface EngineFunction {
  (
    /**
     * The search query words and phrases
     */
    query: string,
    /**
     * The page number (optional)
     */
    page?: number,
    /**
     * Base domain to use for the request (optional)
     */
    baseDomain?: number,
  ): Promise<EngineResult[]>;
}

/**
 * Result Priority Level
 */
export type PriorityType = "low" | "normal" | "high";

/**
 * A combined result that merges duplicate results across different engines
 */
export interface MergedResult extends EngineResult {
  /**
   * Array of engine names that returned this result.
   */
  engines: string[];
  /**
   * The original rank positions of this result from its respective engines.
   */
  positions: number[];
  /**
   * A calculated score used for final ranking.
   */
  score: number;
  /**
   * Priority constraint for ranking calculations.
   */
  priority: PriorityType;
  /**
   * The primary category assigned to this merged result.
   */
  category?: string;
  /**
   * Desired UI template string.
   */
  template?: string;
  /**
   * A hashed unique identifier based on URL and title for deduplication.
   */
  resultHash?: string;
}

/**
 * Weights assigned to individual engines for scoring algorithms
 */
export interface EngineWeight {
  /**
   * A numeric weight assigned to a specific engine.
   */
  [engineName: string]: number;
}

/**
 * Weights assigned to specific categories
 */
export interface CategoryWeight {
  /**
   * A numeric weight assigned to a specific category.
   */
  [category: string]: number;
}

/**
 * A rich entity or infobox result, often rendered separately from regular links
 */
export interface Infobox {
  /**
   * Title or main label of the infobox entity.
   */
  infobox: string;
  /**
   * Unique identifier for the infobox entity.
   */
  id?: string;
  /**
   * Text snippet or description of the entity.
   */
  content?: string;
  /**
   * Source URL for the primary image associated with the entity.
   */
  img_src?: string;
  /**
   * Important URLs related to the entity (e.g., Wikipedia page, official site).
   */
  urls?: Array<{
    /**
     * Link label or title.
     */
    title: string;
    /**
     * Target URL.
     */
    url: string;
    /**
     * Optional entity context.
     */
    entity?: string;
  }>;
  /**
   * Key-value attributes describing the entity.
   */
  attributes?: Array<{
    /**
     * Label or name of the attribute.
     */
    label: string;
    /**
     * Value of the attribute.
     */
    value: string;
    /**
     * Optional entity context.
     */
    entity?: string;
  }>;
  /**
   * The primary engine that provided this infobox.
   */
  engine: string;
  /**
   * Set of engines that provided matching infoboxes (for merging).
   */
  engines: Set<string>;
}

/**
 * Tracks an engine that failed to respond or errored out
 */
export interface UnresponsiveEngine {
  /**
   * Name of the unresponsive engine.
   */
  engine: string;
  /**
   * Type or description of the error encountered.
   */
  errorType: string;
  /**
   * Whether the engine is currently suspended from further queries.
   */
  suspended: boolean;
}

/**
 * Performance metric for an individual engine's request
 */
export interface Timing {
  /**
   * Name of the engine being timed.
   */
  engine: string;
  /**
   * Total elapsed time in milliseconds.
   */
  total: number;
  /**
   * The time taken specifically for network parsing or loading.
   */
  load: number;
}

/**
 * Miscellaneous data returned by engines
 */
export interface EngineData {
  /**
   * Holds arbitrary key-value context or metadata specific to an engine.
   */
  [engineName: string]: {
    [key: string]: any;
  };
}

/**
 * Configuration for a Search Category
 */
export interface CategoryConfig {
  /**
   * Internal ID or key name of the category.
   */
  name: string;
  /**
   * User-facing display name.
   */
  displayName: string;
  /**
   * Short description of what this category entails.
   */
  description: string;
  /**
   * Standard scoring multiplier for this category.
   */
  defaultWeight: number;
}

/**
 * Metadata for a search engine mapping
 */
export interface EngineMetadata {
  /**
   * The name/identifier of the engine.
   */
  name: string;
  /**
   * The asynchronous function that runs the actual engine query.
   */
  fn: EngineFunction;
  /**
   * Categories the engine operates under.
   */
  categories: string[];
  /**
   * A short description or summary of the engine.
   */
  description?: string;
}

/**
 * Engine Status Tracking
 */
export interface EngineStatus {
  /**
   * Name of the engine.
   */
  name: string;
  /**
   * Current health status of the engine.
   */
  status: "active" | "failed" | "disabled";
  /**
   * Timestamp of the last health check.
   */
  lastCheck: Date;
  /**
   * Timestamp of the last successful request.
   */
  lastSuccess: Date | null;
  /**
   * Timestamp of the last failed request.
   */
  lastFailure: Date | null;
  /**
   * Total number of consecutive failures.
   */
  failureCount: number;
  /**
   * Total number of successful requests.
   */
  successCount: number;
  /**
   * Total number of requests made to this engine.
   */
  totalRequests: number;
  /**
   * Average response time in milliseconds.
   */
  averageResponseTime: number;
  /**
   * The last error message encountered.
   */
  lastError?: string;
  /**
   * Categories this engine belongs to.
   */
  categories: string[];
}

/**
 * Log entry for an engine request
 */
export interface EngineLog {
  /**
   * Timestamp of the log entry.
   */
  timestamp: Date;
  /**
   * Name of the engine.
   */
  engineName: string;
  /**
   * Status of the request.
   */
  status: "success" | "failure";
  /**
   * Response time in milliseconds.
   */
  responseTime: number;
  /**
   * Error message if the request failed.
   */
  error?: string;
  /**
   * The query that was made.
   */
  query?: string;
}

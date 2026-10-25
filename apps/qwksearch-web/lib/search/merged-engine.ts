/**
 * Merged Search Engine
 *
 * The context-engine pipeline of the LobeChat chat engine with the
 * search-web-api search-sources API as its source. It now lives with the rest
 * of the engine in `lib/lobe-engine`; this module keeps the import path the
 * search routes use.
 */

export {
  ContextEngine,
  type ContextEngineConfig,
  type ContextProcessor,
  type PipelineContext,
  type PipelineResult,
} from "@/lib/lobe-engine/context-engine";
export {
  MergedSearchEngine,
  SearchSourcesProcessor,
  type MergedSearchEngineOptions,
  type SearchSourceOptions,
} from "@/lib/lobe-engine/search-sources";

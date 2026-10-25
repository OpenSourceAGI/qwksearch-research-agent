/**
 * @module lobe-engine
 *
 * The LobeChat chat engine (from `apps/qwk-in-lobe`) running inside
 * qwksearch-web, with the search-sources API of `search-web-api` as its
 * search source. It is the default engine behind `/api/agent/chat`.
 *
 * - **context-engine** — the message-preparation pipeline run before each model call.
 * - **agent-runtime** — the call-model / run-tools step loop.
 * - **web-browsing** — the search and crawl tools, their system role and result prompts.
 * - **search-sources** — the search service over search-web-api, the source registry, and plain search.
 * - **chat-engine** — `LobeChatEngine`, the `MetaSearchAgentType` the chat route streams from.
 * - **handlers** — the focus modes, each a configured `LobeChatEngine`.
 */

export * from "./context-engine";
export * from "./agent-runtime";
export * from "./web-browsing";
export * from "./search-sources";
export * from "./chat-engine";
export * from "./handlers";

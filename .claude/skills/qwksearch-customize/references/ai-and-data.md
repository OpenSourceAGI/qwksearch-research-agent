# AI Agent, LLM Providers, and API Clients

## packages/chat-agent-toolkit — the agent orchestration layer

Integrates the Vercel AI SDK, the Mastra framework, and MCP to run research
agent workflows across 10+ LLM providers. This is the highest-leverage
package to understand before adding new agent *behavior* (as opposed to UI).

- `src/config/` — `model-registry.ts` + `language-models-database.ts` (which models exist per provider), `provider-ui-config.ts` (how providers show up in UI pickers — pairs with `research-agent-ui`'s settings), `mcp-server-registry.ts`, `config-manager.ts`/`config-types.ts` (runtime config shape), `environment-variables.ts` (which env vars each provider needs).
- `src/models/` — `providers.ts`, `registry.ts`, `types.ts`: the provider abstraction itself.
- `src/mastra/` — `agents.ts`, `workflows.ts`, `rag.ts`, `model-routing.ts`, `evals.ts`, `telemetry.ts`: Mastra-specific agent/workflow definitions. If the task is "change how the agent decides what to search next" or "add a workflow step," it's likely here.
- `src/tools/` — `qwksearch-api-tools.ts`, `qwksearch-mcp-tools.ts`, `open-connector-mastra.ts`, `open-connector-mcp.ts`, plus a `search/` subfolder. Tools the agent can call are defined here.
- `src/memory/` — persistent agent memory manager (`agent-memory-manager.ts`, `storage/`, own `ARCHITECTURE.md`/`MASTRA_INTEGRATION.md`/`README.md` worth reading directly if working on memory).
- `src/connectors/` — third-party service connectors (OAuth-style "open connectors"); has its own `README.md`, `catalog.json`, and a small local server (`server.ts`) for testing — see the package-level `CONNECTORS_INTEGRATION.md` and `QUICK_START_CONNECTORS.md` at the package root for the full guide.
- `src/prompts/` — `search-prompts.ts`, `meta-search-types.ts`: prompt templates for search-related agent steps.
- `src/provider-logos/` — logo assets for each provider, used by UI provider pickers; add one when adding a new provider if it should show a logo.

**Recipe: add a new LLM provider.** Register it in `src/models/providers.ts`
+ `src/config/model-registry.ts` (or `language-models-database.ts` for its
model list), add required env vars to `src/config/environment-variables.ts`,
and add a `provider-ui-config.ts` entry so it surfaces in settings. Compare
against an existing similar provider (e.g. one already on the Vercel AI SDK)
rather than starting blank — `write-language` (below) has the actual
generation-side provider factory this toolkit builds on.

## packages/write-language — text generation across providers

Lower-level than `chat-agent-toolkit`: a focused multi-provider generation
toolkit on the Vercel AI SDK. `src/provider-factory.ts` (constructs a model
client per provider), `src/generate-response.ts` (streaming/non-streaming
generation entry points), `src/language-model-registry.ts` +
`src/language-model-families.ts` (provider/model metadata),
`src/rewrite-modes.ts` + `src/prompt-templates.ts` (the "AI Rewriting"
feature mentioned in the root README, also used by `reason-editor`'s
`features/ai-rewrite/`). If `chat-agent-toolkit`'s provider abstraction
feels like too much for a simple "just generate text" need, this package is
the simpler layer underneath it.

## packages/qwksearch-mcp-server — MCP server

Exposes QwkSearch capabilities as MCP tools for external MCP clients
(Claude Desktop, other agents). `bin/` — CLI entry; `src/index.ts` — server
setup; `src/tools/web-search.ts`, `src/tools/extract-page.ts`,
`src/tools/render-page.ts` — one file per exposed tool, each presumably
wrapping `search-web-api`/`extract-webpage`/`render-url-to-html`
respectively. **Recipe: add a new MCP tool** — add a file in `src/tools/`
following the shape of an existing one, then register it in `src/index.ts`.

## packages/qwksearch-api-client — generated backend client

Auto-generated from an OpenAPI spec — **do not hand-edit the generated
files** (`src/client.gen.ts`, `src/types.gen.ts`, `src/sdk.gen.ts`).
`qwksearch-openapi.json` is the spec; `openapi-ts.config.js` configures the
generator (`@hey-api/openapi-ts` style codegen, run via the `build:api`
script). If the backend API shape changes, update the OpenAPI spec (or
regenerate it from `qwksearch-web`'s route definitions if that's the source
of truth — check `app/api/openapi` in `qwksearch-web` first) and rerun
`build:api`, rather than editing generated output directly. `src/index.ts`
re-exports the generated surface; `baseurl.ts` at the package root
configures the default API base URL.

## packages/notebooklm-api-client

Currently a placeholder (`src/index.ts` only) for a future Google NotebookLM
integration — has a `container/` + `Dockerfile` suggesting the eventual
implementation will run as a small service, not a pure client library. Low
priority unless the task specifically asks for NotebookLM integration.

## packages/language-model-training

Mostly independent of the web product: a from-scratch GPT-style transformer
(Tinygrad) with a Wikipedia data pipeline, FastAPI control API
(`webui/` for a Next.js training dashboard), and Docker Compose
orchestration (`docker/`). Python-based (`pyproject.toml`,
`requirements.txt`, `pytest.ini`), not part of the bun/turbo JS build. Only
relevant if the task is specifically about training or fine-tuning a model
from scratch, not about using an LLM provider in the product (that's
`chat-agent-toolkit`/`write-language`).

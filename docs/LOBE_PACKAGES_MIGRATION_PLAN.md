# LobeHub Packages Migration Plan — Chat Engine + Settings Cutover

Step-by-step plan for making [`packages-lobe/`](../packages-lobe/README.md) (the
adapted LobeHub v2.2.13 monorepo) **the engine that powers chat mode and the
settings system** for qwksearch.com, then replacing the rest of the in-house
chat stack — while **reusing** four QwkSearch assets:

1. the **qwksearch-web homepage** and marketing pages,
2. the **QwkSearch UI identity** (brand, article reader UX, category iconography),
3. the **article extractor** pipeline (`extract-webpage`, `extract-pdf`, `extract-youtube`, `render-url-to-html`),
4. the **REASON docs** editor (`react-reason-editor`) on the shared D1 `documents` data.

Relationship to prior docs:

- [`LOBEHUB_INTEGRATION_PLAN.md`](./LOBEHUB_INTEGRATION_PLAN.md) (#286) cherry-picked
  Lobe pieces *into* QwkSearch. Superseded in strategy; its license analysis stands.
- [`LOBEHUB_CORE_ENGINE_PLAN.md`](./LOBEHUB_CORE_ENGINE_PLAN.md) proposed this
  inversion against the old `packages-third-party/` snapshot (since removed).
  **This plan replaces it**, grounded in `packages-lobe/` — which is no longer a raw
  vendored copy but a working Cloudflare-Workers port of LobeHub with QwkSearch
  features already added (article side panel, D1 Docs, extraction chain, branding).

Status: **plan — `packages-lobe/` builds and deploys; no traffic cutover yet.**

---

## 0. Where we actually are (baseline)

`packages-lobe/` already implements a large share of the old core-engine plan:

| Concern | State in `packages-lobe/` today |
|---|---|
| Runtime | One Hono Worker (`worker/app.ts`) on the same Cloudflare stack as `apps/qwksearch-web`: Workers + **D1 (`qwksearch-new`, same database)** + KV + R2 + Email Routing |
| Chat engine | Full LobeHub: Vite 8 + react-router 8 SPA, zustand stores, `@lobechat/model-runtime` (80+ providers), `@lobechat/agent-runtime`, `@lobechat/context-engine`, tRPC to Postgres (Hyperdrive/Neon) |
| Settings | Full LobeHub settings (`src/features/Settings/`, ~30 tabs incl. provider/key-vault management) |
| Auth | Better Auth with KV secondary storage (`src/libs/better-auth/utils/config.ts`) |
| Article panel | `src/features/QwkSearch/ArticlePanel` — extract side panel, favorites, Q&A, follow-ups through LobeHub's `AiGenerationService` |
| Docs | `/docs` route (`src/features/QwkSearch/Docs`) on D1 `documents` — **plain Markdown editor, REASON not yet embedded** |
| Extraction | `worker/qwksearch/extract.ts`: Cloudflare Puppeteer scraper → Tavily → `@lobechat/web-crawler` — **does not yet use `extract-webpage`** |
| Known gaps | OIDC 501 (CLI/desktop sign-in), Redis in-memory fallbacks, mobile SPA optional, no sharp |

What still runs the product today (`apps/qwksearch-web` + packages), i.e. what this
plan replaces or reuses — exact seams:

| Surface | Files (current system of record) | Fate |
|---|---|---|
| Chat UI | `packages/research-agent-ui/src/components/{ChatConversation,MessageComposer,SearchResults}/`, state in `src/hooks/useChat/` (`ChatProvider.tsx`, `sendMessage.ts`) | **Replace** with Lobe SPA chat |
| Chat server | `apps/qwksearch-web/app/api/agent/chat/route.ts` → `lib/chat/{handler,stream-handler}.ts` (custom NDJSON protocol) → `packages/chat-agent-toolkit` `MetaSearchAgent` on Vercel AI SDK | **Replace** with Lobe `/webapi/chat/[provider]` + agent runtime |
| Provider config | `packages/chat-agent-toolkit/src/config/*` (`ConfigManager`, in-memory + env), `app/api/agent/providers/**`, `app/api/config` | **Replace** with Lobe `aiInfra` store + key vaults (`KEY_VAULTS_SECRET`) |
| Settings UI | `apps/qwksearch-web/components/Settings/**` (+ `packages/shadcn-settings`, `research-agent-ui/src/settings/sections.json`; persistence split in `SettingsField.tsx`: `localStorage` vs `POST /api/config`) | **Replace** with Lobe `src/features/Settings/` |
| Homepage/marketing | `apps/qwksearch-web/app/page.tsx` + `components/layout/MainWorkspaceView.tsx`, `/features`, `/enterprise`, `/news`, `/legal`, `/library` | **Reuse** (keep on qwksearch-web Worker) |
| Article extractor | `packages/extract-webpage` (`extractContent`, cite extraction), `extract-pdf`, `extract-youtube`; server route `app/api/doc/article/route.ts` with D1 `articleCache`/`articleQA` | **Reuse** — becomes the first tier of Lobe's extraction chain |
| Article reader UI | `packages/research-agent-ui/src/components/ArticleReader/**` | **Reuse the UX**, already largely ported as `src/features/QwkSearch/ArticlePanel`; close remaining gaps |
| REASON docs | `packages/reason-editor` (`react-reason-editor`, Tiptap 3 + Plate, `ReasonDocs` shell) syncing to `app/api/doc/documents` (D1 `documents`) | **Reuse** — mount inside Lobe's `/docs` on the same D1 data |
| Search fan-out | `packages/search-web-api` (70+ engines, 13 categories), `domain-rank` | **Reuse** as the engine's search tool backend |

License gate (unchanged from prior plans): the LobeHub Community License requires a
commercial license for distributing derivative works. Running it is fine;
shipping qwksearch.com on it needs the written answer recorded in
`packages-lobe/README.md` before the Phase 4 public cutover.

---

## 1. Target architecture

```
qwksearch.com (one domain, two Workers, shared D1/KV/R2)
│
├── Worker A: apps/qwksearch-web  (kept, slimmed)
│   • /            homepage + marketing (/features /enterprise /news /legal /library)
│   • /api/doc/article   extraction API (extract-webpage → cite → cache in D1)
│   • /api/search        search-web-api fan-out (100+ engines, 13 categories)
│
├── Worker B: packages-lobe       (the engine)
│   • /chat /settings /docs /signin + /_spa/* assets   LobeHub SPA
│   • /webapi/chat/[provider], /trpc/*, /api/auth/*    chat + config + auth
│   • src/features/QwkSearch/ArticlePanel              article reader (reused UX)
│   • src/features/QwkSearch/Docs + react-reason-editor  REASON on D1 documents
│   • Postgres (Hyperdrive/Neon): users, sessions, topics, messages, provider keys
│   • D1 (qwksearch-new, shared): articleCache, articleQA, favorites, documents, …
│
└── Routing: Cloudflare routes (or a thin dispatcher) send app paths → B,
    everything else → A. Same auth cookie domain, one login.
```

The seam rule from the prior plan still holds: **antd 6 + @lobehub/ui + antd-style
inside the engine; Tailwind 4 + shadcn outside** (homepage, REASON editor). The
REASON editor is the one deliberate exception living inside the engine's page —
it ships its own scoped styles (`react-reason-editor/style.css`).

The two workspaces stay separate on purpose: the root bun/turbo workspace
(`packages/*`, `apps/*`) and the pnpm workspace in `packages-lobe/`. Do **not**
merge them — Lobe's `pnpm-workspace.yaml` uses recursive `packages/**` globs
(bun can't express them), a root-as-member workspace, pnpm `overrides`/
`patchedDependencies`, and 85/94 packages exporting raw TS via root tsconfig
path aliases (`packages/database` alone has 37 files importing `@/…`, and
`src/core/cloudflare.ts` reaches out to `worker/cf/env`). The bridge between
the worlds is **published npm packages** (`extract-webpage` et al. are already
standalone) and **shared Cloudflare bindings**, not workspace links.

---

## 2. Phases

### Phase 1 — Chat mode powered by the Lobe engine (internal cutover)

Goal: a signed-in user at `/chat` gets LobeHub chat, with QwkSearch search +
extraction as its tools. No public routing change yet — verify behind a
staging route.

- **1.1 Stand up staging.** `cd packages-lobe && pnpm install && bun run build:worker
  && bun run cf:deploy` (staging env), Postgres via Hyperdrive or Neon, run
  `bun run db:migrate` + `bun run cf:d1:migrate`. Smoke-check the verified
  endpoints (`/api/health`, `/trpc/lambda/config.getGlobalConfig`, `/signin`).
- **1.2 Search tool = search-web-api.** Add a search provider to the engine's
  web-browsing tool that calls Worker A's search fan-out (service binding or
  HTTPS): implement it alongside `worker/qwksearch/extract.ts` conventions, and
  extend the tool manifest's `searchCategories` from Lobe's defaults to
  QwkSearch's 13 (source: `packages/search-web-api/src/category-registry.ts`).
  Consult `domain-rank` for result ranking/favicons.
- **1.3 Extraction chain, first tier = article extractor.** Today
  `worker/qwksearch/extract.ts` tries Puppeteer scraper → Tavily →
  `@lobechat/web-crawler`. Insert tier 0: call Worker A's
  `GET /api/doc/article` (which runs `extract-webpage`'s `extractContent` +
  citation extraction and caches in the shared D1 `articleCache`). This gives
  the engine cited extraction for free and keeps one cache. Route
  YouTube URLs to `extract-youtube` transcripts and PDFs/arXiv to `extract-pdf`
  through the same API rather than rejecting video hosts up front.
- **1.4 Agent parity checklist.** Reproduce the current chat-mode behaviors in
  the engine and record gaps: search-cited answers with follow-up suggestions
  (Lobe has both), file upload Q&A, voice input (Lobe TTS/STT settings tab vs
  `use-voice-control` — decide per gap: adopt Lobe's, or port), guest/anonymous
  chat with rate limiting (today `lib/rate-limit/guestRateLimiter.ts`; the
  engine requires sign-in — decide whether to add an anonymous session mode or
  make chat login-gated at cutover).
- ✅ Check: on staging, a chat turn fans out across QwkSearch engines, renders
  results in the web-browsing portal, crawls a YouTube URL / PDF / paywalled
  article via the tier-0 extractor, and answers with citations.

### Phase 2 — Settings: Lobe as the single system of record

- **2.1 Map every existing section** of
  `research-agent-ui/src/settings/sections.json` (account, models, mcpservers,
  skills-memory, searchEngines, search, fileSources, aiRewriteModes, voice) to
  its engine equivalent: models → `Settings/provider` + `service-model`
  (key-vault backed); mcpservers → `features/MCP/MCPSettings`; voice → `tts`;
  skills-memory → `skill` + `memory`; account/storage → `profile`/`storage`.
- **2.2 Add the two panes the engine lacks**, following the existing tab
  conventions (`src/features/Settings/<tab>/` + route segment + i18n keys in
  `packages/locales/src/default/qwksearch.ts`, which already exists):
  **Search & Sources** (engine/category selection, per-category defaults,
  time range, SearXNG URL) and **Extraction** (citation style, transcript
  language, render backend, scraper/Tavily keys). Persist through the user
  settings store (`src/store/user/slices/settings/`) like every other pane.
- **2.3 Key migration.** Provider keys currently live in env vars +
  `chat-agent-toolkit`'s in-memory `ConfigManager` (server) and `localStorage`
  (client). Write a one-time import: server env keys stay as Worker secrets
  (the engine reads them the same way); per-user keys entered in the old UI
  don't exist server-side, so users re-enter them once into the engine's key
  vault — announce it, don't build a migrator for localStorage.
- **2.4 Retire the old surface** once `/settings` on the engine covers the map:
  delete `apps/qwksearch-web/components/Settings/**`, the
  `app/settings/[[...section]]` route, `app/api/config`, and drop
  `shadcn-settings` from the prebuild chain. Never run two settings stores.
- ✅ Check: change the engine list in Settings → next search turn respects it;
  one key entry works for chat, article Q&A, and REASON AI rewrite.

### Phase 3 — REASON docs inside the engine

`packages-lobe/README.md` already names this the intended follow-up: Docs uses a
plain Markdown editor but shares the D1 `documents` table and API.

- **3.1** Consume `react-reason-editor` + `react-reason-editor-sidebar` from npm
  in the Lobe workspace (they build standalone; keep source of truth in
  `packages/reason-editor`). Mount the `ReasonDocs` shell (or just the editor +
  sidebar, if the engine's nav replaces the shell's own chrome) in
  `src/features/QwkSearch/Docs`, replacing the plain editor.
- **3.2** Point its sync hook (`useDocumentSync.ts` semantics) at the existing
  D1 docs API (`/api/doc/documents`) already served by the Lobe worker — same
  table `apps/qwksearch-web` writes today, so documents carry over with zero
  migration.
- **3.3** Style seam: load `react-reason-editor/style.css` scoped to the Docs
  route; verify Tailwind preflight doesn't leak into antd components (scope
  with a wrapper class if needed).
- **3.4** "Send to REASON": message action in chat that appends the cited
  answer into the active document — the engine-side equivalent of today's
  research → docs flow in `MainWorkspaceView`.
- **3.5** AI rewrite in REASON calls the engine's generation service
  (`AiGenerationService`, as ArticlePanel Q&A already does) so the user's
  provider/keys apply everywhere.
- ✅ Check: open a document created in the old UI, edit with full REASON
  toolbar, AI-rewrite a paragraph, export .docx — one login, one key vault.

### Phase 4 — Public cutover: homepage kept, app replaced 🔒 license answer required

- **4.1 Routing split.** Cloudflare routes on qwksearch.com: `/chat*`,
  `/settings*`, `/docs*`, `/signin*`, `/_spa*`, `/webapi/*`, `/trpc/*`,
  `/api/auth/*` (engine auth), `/f/*` → Worker B; everything else (homepage,
  marketing, `/api/doc/*`, `/api/search*`) → Worker A. Both `wrangler.jsonc`
  files already share KV/D1 IDs.
- **4.2 One login.** Both sides run Better Auth 1.6. Consolidate on the
  engine's instance: Worker A's pages read the session via the engine's
  `/api/auth/get-session` (same cookie domain) and drop their own auth routes.
  Migrate `user`/`account` rows from D1 into the engine's Postgres (one-shot
  script; magic-link and social IDs carry over — verify provider IDs match).
- **4.3 Chat history migration.** One-shot script mapping D1 `chats`/`messages`
  → engine Postgres topics/messages/sessions. Dry-run on a snapshot; keep D1
  tables read-only 30 days post-cutover.
- **4.4 Homepage handoff.** `app/page.tsx` stops mounting
  `ChatWindow`/`ChatInputBox`; the hero search box submits into
  `/chat?q=…` on the engine (Lobe supports launch-with-query). Marketing CTAs
  link to `/chat` and `/docs`.
- **4.5 Decommission in Worker A**: `app/api/agent/**`, `lib/chat/**`,
  `app/c/[chatId]`, the `ChatProvider` mount in `Providers.tsx`, and the
  NDJSON protocol. Keep `/api/doc/*` (extractor API — now serving the engine)
  and `/api/search*`.
- ✅ Check: cold visitor lands on `/`, clicks "Start researching", signs in
  once, chats with citations, opens an article in the side panel, sends it to
  REASON — no dead ends; old chat links `/c/:id` 301 to migrated topics.

### Phase 5 — Replace the rest / repo cleanup

- **5.1 Package fates.** Keep + publish: `search-web-api`, `extract-*`,
  `render-url-to-html`, `domain-rank`, `reason-editor(-sidebar)`,
  `qwksearch-mcp-server`, `qwksearch-api-client` (regenerate against the
  engine's OpenAPI at `/api/v1`). Freeze (still used by extension/desktop
  until repointed): `research-agent-ui`, `use-voice-control`. Deprecate:
  `chat-agent-toolkit`'s live chat path, `write-language` (engine's
  model-runtime supersedes), `shadcn-settings` usage in the web app.
- **5.2 Satellite apps.** Browser extension and VS Code extension re-point
  their API base to the engine (`/webapi`, `/api/v1`); desktop either adopts
  Lobe's Electron app or keeps Tauri as a webview onto qwksearch.com — decide
  on binary size and update-channel needs.
- **5.3 Trim the prebuild chain** in `apps/qwksearch-web/package.json` to what
  the slimmed marketing/API worker still imports.
- **5.4 Ops gaps to close** before calling it done: Upstash Redis provider in
  `src/libs/redis` (multi-isolate agent streaming), mobile SPA build
  (`build:spa:mobile`), and monitor the Worker bundle (~7.4 MB gzipped vs the
  10 MB limit) in CI.
- ✅ Check: root `bun run build` + `bun run test` green with the trimmed graph;
  `packages-lobe` CI job builds SPA + worker and runs its vitest suites.

---

## 3. Sequencing

```
Phase 1  chat engine on staging (search + extraction tools)   ← start now
   ├── Phase 2  settings panes + retirement      (needs 1.2/1.3 config surface)
   └── Phase 3  REASON in /docs                  (parallel with 2)
        🔒 license answer recorded
Phase 4  public cutover (routing, auth, history migration)
Phase 5  decommission + satellites + ops gaps
```

## 4. Risks

| Risk | Mitigation |
|---|---|
| License answer is "no" | Cutover phases halt; fall back to the cherry-pick plan (Tier-A MIT packages only); staging work is evaluation, not distribution |
| Two UI systems bleed (antd 6 vs Tailwind 4) | Seam rule + the REASON editor's scoped CSS; no cross-imports between `packages-lobe/src` and `packages/research-agent-ui` |
| Worker size limit (10 MB gzipped, currently ~7.4) | CI size budget; lazy-load heavy SPA chunks; keep extractor code in Worker A |
| Postgres ops burden (169 tables, pgvector) | Managed (Neon/Hyperdrive) — already the tested path in `packages-lobe`; D1 stays for QwkSearch tables |
| Auth/history migration data loss | One-shot scripts with dry-runs on snapshots; D1 read-only retention window; `/c/:id` redirects |
| Anonymous/guest chat regression | Decide in 1.4: engine anonymous sessions vs login-gating; don't discover it at cutover |
| Fork drift vs upstream LobeHub | Keep QwkSearch changes additive (`worker/`, `src/features/QwkSearch/`, new settings tabs); the "What changed vs. upstream" list in `packages-lobe/README.md` is the merge contract |
| Redis-less agent runtime on Workers | Upstash HTTP Redis provider (5.4) before heavy multi-tab agent use |

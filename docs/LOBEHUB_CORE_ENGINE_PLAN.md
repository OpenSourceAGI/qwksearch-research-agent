# LobeHub as the Core Engine — Integration Plan

> **Superseded** by [`LOBE_PACKAGES_MIGRATION_PLAN.md`](./LOBE_PACKAGES_MIGRATION_PLAN.md),
> which re-grounds this strategy in the now-working `packages-lobe/` Cloudflare port
> (the `packages-third-party/` snapshot referenced below has been removed).

Step-by-step plan for inverting the architecture: **LobeHub becomes the core
engine and settings system**, and QwkSearch's differentiators are layered on
top of it — the home/landing pages, the QwkSearch visual identity, the article
extraction pipeline, and the REASON editor.

- Vendored source baseline: [`packages-third-party/`](../packages-third-party/README.md)
  — all 96 LobeHub workspace packages at `vtempest/lobehub@25a7c3fd` (v2.2.13), unmodified.
- Relationship to [`LOBEHUB_INTEGRATION_PLAN.md`](./LOBEHUB_INTEGRATION_PLAN.md) (#286):
  that plan cherry-picked LobeHub pieces *into* QwkSearch. This plan is the
  opposite direction and **supersedes it in strategy**; its package triage
  tables and license analysis remain accurate and are referenced below.

Status: **plan + vendored reference copy — no engine wiring merged yet.**

---

## 0. Why invert the direction (rationale)

The cherry-pick plan concluded that ~74 of LobeHub's packages would be skipped
because they entangle with LobeHub's own store/tRPC/database/agent model. That
entanglement is the tell: those packages aren't a parts bin, they're a working
product. Meanwhile QwkSearch's genuinely differentiated assets are few and
well-bounded:

| QwkSearch asset | Package(s) | Why it survives the inversion |
|---|---|---|
| Search fan-out across 100+ engines, 13 categories | `search-web-api`, `searxng-search-cloudflare`, `domain-rank` | LobeHub's `builtin-tool-web-browsing` ships 1 search provider; ours is the moat |
| Article extraction + citation | `extract-webpage`, `extract-pdf`, `extract-youtube`, `render-url-to-html` | LobeHub's `web-crawler` has 7 generic backends but no cite-graph, no APA citations, no transcript extraction |
| REASON writing editor | `reason-editor` (see [`REASON_EDITOR.md`](./REASON_EDITOR.md)) | LobeHub's editor is `@lobehub/editor` (chat input); REASON is a full document organizer |
| Landing/marketing surface | `apps/qwksearch-web` app-router pages (`/`, `/features`, `/enterprise`, `/docs`) | LobeHub has no marketing shell — it *is* the app |

Everything else — chat runtime, agent orchestration, model providers, settings,
auth, database, i18n, plugin/tool system, desktop shell — LobeHub does at far
greater depth than `chat-agent-toolkit` + hand-rolled routes can be evolved to.
Adopt it wholesale instead of rebuilding it.

## 0b. License gate (unchanged, still blocking)

Same gate as the prior plan, now *more* binding because the whole engine is
LobeHub-derived: the **LobeHub Community License** requires a commercial
license for distributing derivative works (`packages-third-party/LICENSE`,
hello@lobehub.com). The vendored copy and everything in Phases 2+ is
evaluation-only until a written license lands. The MIT-published `@lobehub/*`
npm packages (`ui`, `icons`, `editor`, `tts`, `charts`, `analytics`) are exempt
and usable today.

---

## 1. Architecture target

```
┌──────────────────────────────────────────────────────────────┐
│  QwkSearch layer (ours, on top)                              │
│  • Landing/marketing: /, /features, /enterprise, /docs       │
│  • Brand/theme: QwkSearch tokens over antd-style theming     │
│  • REASON editor route (/write) + document tree              │
│  • Article reader portal (extract → cite → summarize)        │
├──────────────────────────────────────────────────────────────┤
│  Tool/provider seam (ours plugged into their contracts)      │
│  • search-web-api  → web-browsing tool "search" backend      │
│  • extract-* stack → web-crawler crawlImpl + urlRules        │
│  • domain-rank     → result ranking + favicons               │
├──────────────────────────────────────────────────────────────┤
│  LobeHub core engine (theirs, mostly untouched)              │
│  • Next.js app shell + SPA (react-router) + zustand stores   │
│  • agent-runtime, model-runtime (80+ providers), model-bank  │
│  • Settings system (src/routes/(main)/settings + user store) │
│  • apps/server (Hono) + TRPC + packages/database (Postgres)  │
│  • locales (i18n), builtin-tools, plugin system, auth        │
└──────────────────────────────────────────────────────────────┘
```

Key structural facts about the engine (from the vendored tree and the fork's
`AGENTS.md`) that the plan builds on:

- **Roots vs features split**: `src/routes/` holds thin page segments only;
  real UI/business logic lives in `src/features/<Domain>/`. New QwkSearch
  surfaces must follow this — add route segments that delegate to new
  `src/features/` domains.
- **Settings**: `src/routes/(main)/settings/` + `src/features/Setting*` +
  the `global`/`serverConfig` zustand stores, persisted through TRPC to
  `packages/database`. This is the system of record for all user config.
- **Tools**: every agent-callable capability is a `builtin-tool-*` package
  with a manifest, an execution runtime, and Inspector/Render/Portal UI.
  `builtin-tool-web-browsing` + `web-crawler` is the seam where QwkSearch's
  search/extraction plugs in.
- **Runtime**: Node + Postgres (Drizzle, 150+ migrations). Not Cloudflare
  Workers. This forces the deployment split in Phase 7.

---

## 2. Phases

### Phase 0 — Baseline (✅ this PR)

- **0.1** ✅ Vendor all LobeHub packages → `packages-third-party/` (unmodified,
  out of workspaces/turbo/vitest — see its README).
- **0.2** ✅ This plan + [`REASON_EDITOR.md`](./REASON_EDITOR.md).
- **0.3** Send the commercial-license inquiry; record the answer in
  `packages-third-party/README.md`. **Phases 2–7 are gated on this.**

### Phase 1 — Stand the engine up, learn the seams (unblocked: run, don't redistribute)

Running LobeHub unmodified is permitted; only derivative distribution is gated.

- **1.1** Run the fork: `bun run dev` (Next.js + Vite SPA) and
  `pnpm --filter @lobechat/server dev` against a local Postgres. Document the
  required env in a `docs/lobehub-dev.md` scratch note.
- **1.2** Map the four seams hands-on and write down exact file paths as found:
  (a) how a `builtin-tool-*` registers and executes; (b) how a settings pane is
  added under `src/routes/(main)/settings/`; (c) how the SPA router mounts a new
  route (`src/spa/router/desktopRouter.shared.tsx`); (d) how theming tokens flow
  (`antd-style` ThemeProvider).
- **1.3** Spike (throwaway branch on the fork): call `search-web-api` from
  inside `web-crawler` as an extra impl. Goal is to validate the seam, not to keep code.
- ✅ Check: engine runs locally end-to-end (chat + settings + one tool call);
  seam notes committed.

### Phase 2 — QwkSearch search + extraction as the engine's tools 🔒

The highest-value integration, and it's additive rather than invasive.

- **2.1** New workspace package in the fork: `packages/qwksearch-search-provider`.
  Wraps `search-web-api`'s query fan-out behind the search-service interface
  `builtin-tool-web-browsing` consumes. Extend its manifest's `searchCategories`
  from LobeHub's 5 to QwkSearch's 13 (source:
  `packages/search-web-api/src/category-registry.ts`).
- **2.2** New `crawlImpl`s in `web-crawler`: `qwksearch-extract` (→
  `extract-webpage` pipeline, returns cleaned article + APA citation),
  `qwksearch-pdf` (→ `extract-pdf`), `qwksearch-youtube`
  (→ `extract-youtube` transcripts). Register them **first** in the impl chain;
  LobeHub's `naive`/`jina`/`firecrawl`/… become the fallback tier.
- **2.3** Merge domain knowledge into `urlRules.ts`: `youtube.com/watch` →
  `qwksearch-youtube`, `*.pdf`/arXiv → `qwksearch-pdf`; consult `domain-rank`
  for ranking and favicons on result lists.
- **2.4** Keep the extraction packages as **published npm deps** consumed by the
  fork (they already build standalone) rather than copying source across —
  one source of truth, and the QwkSearch repo keeps shipping its own apps.
- ✅ Check: in the engine's chat, a search turn fans out across QwkSearch
  engines, results render in the web-browsing Portal, and crawling a YouTube
  URL, a PDF, and a paywalled article all return cited content.

### Phase 3 — Settings: LobeHub as the system of record 🔒

- **3.1** Add a **Search & Sources** settings pane: engine/category selection,
  per-category defaults, time-range, SearXNG instance URL. Route segment under
  `src/routes/(main)/settings/`, UI in `src/features/Setting*` conventions,
  state in the user settings store (follow an existing pane, e.g. the provider
  settings, as the template).
- **3.2** Add an **Extraction** pane: citation style, transcript language,
  render backend (JSDOM/Puppeteer/Browser Rendering), proxy keys.
- **3.3** Retire the equivalent QwkSearch surfaces: `shadcn-settings`-based
  panels and `research-agent-ui`'s `SearchConfig` become thin readers of the
  engine's settings via its TRPC client — or are deleted where the engine's UI
  fully replaces them. Do **not** run two settings stores.
- **3.4** BYO-key model config: drop `chat-agent-toolkit`'s provider key
  handling in favor of the engine's provider settings + `model-runtime`
  (80+ providers, keyed per user).
- ✅ Check: changing an engine list in Settings changes the next search turn;
  keys entered once work for chat, search summarization, and REASON AI rewrite.

### Phase 4 — QwkSearch UI identity on the engine 🔒

Two coexisting styling systems, each kept on its own side of the seam:

- **4.1** **Theme, don't reskin.** Express QwkSearch brand (sky/violet accent,
  typography, radii) as an `antd-style` theme token override at the engine's
  ThemeProvider. No Tailwind inside engine components; no antd inside
  marketing pages.
- **4.2** Port the two `research-agent-ui` surfaces the engine lacks, as
  `src/features/` domains rebuilt with `@lobehub/ui` + antd-style:
  the **Article Reader portal** (full extracted article + citation + summary in
  the right panel, extending the web-browsing Portal) and the
  **category iconography** (13 category avatars).
- **4.3** Everything else in `research-agent-ui` (composer, message thread,
  voice) is superseded by the engine's chat — freeze it for the extension/
  desktop apps until Phase 7 decides their fate.
- ✅ Check: side-by-side screenshot review — engine app reads as QwkSearch
  (brand test) while settings/chat behave stock-LobeHub (no fork drift).

### Phase 5 — Landing and marketing on top 🔒

- **5.1** Keep `apps/qwksearch-web`'s app-router marketing pages (`/`,
  `/features` incl. the demo video, `/enterprise`, `/docs`) as the public
  site on the apex domain — they're static-ish, Cloudflare-friendly, and
  already SEO-tuned.
- **5.2** Engine lives on `app.qwksearch.com`. Marketing CTAs ("Start
  researching") link into it; auth handoff via the engine's own auth
  (`src/app/spa-auth`) — the marketing site never holds sessions.
- **5.3** Strip `apps/qwksearch-web` of the in-app chat surface once the engine
  hosts it (the `/api/agent`, chat routes, and `research-agent-ui` mount go
  away); it becomes a pure marketing + docs shell.
- ✅ Check: cold visitor path — land on `/`, watch the demo video, click
  through to `app.`, sign in, run a search — with no dead ends.

### Phase 6 — REASON editor as the writing surface 🔒

Details in [`REASON_EDITOR.md`](./REASON_EDITOR.md); summary:

- **6.1** Mount REASON at a `/write` route in the engine SPA: route segment in
  `src/spa/router/desktopRouter.shared.tsx` + a thin `src/features/Reason/`
  wrapper around `react-reason-editor`'s `ReasonDocs` shell (consumed from npm).
- **6.2** Bridge storage: REASON documents persist through the engine's
  document/page model (`packages-third-party/database` has `documents`; the
  fork's `src/store/document` + `src/store/page` are the reference) instead of
  QwkSearch's D1 tables.
- **6.3** "Send to REASON" from chat: a message action that appends a cited
  answer (with sources from Phase 2) into the active REASON document.
- **6.4** AI rewrite inside REASON goes through the engine's `model-runtime`
  (user's configured provider), applying edits via `markdown-patch`-style
  diffs rather than full-document replacement.
- **6.5** Keep Tiptap. Do not port REASON onto `@lobehub/editor` — the
  extension ecosystems don't overlap; the integration is at the route/storage/
  model seams, not the editor core.
- ✅ Check: research → "Send to REASON" → AI-rewrite a paragraph → export
  .docx, all under one login and one provider key.

### Phase 7 — Deployment + data migration 🔒

- **7.1** Deployment split: marketing site stays on Cloudflare Workers
  (`vinext`/wrangler); the engine deploys as LobeHub does (Docker: Next.js +
  Hono server + Postgres). Accept this — do not attempt to port the engine to
  Workers/D1 (the prior plan's analysis of `database`/`context-engine`
  coupling stands).
- **7.2** Data migration: one-shot script mapping QwkSearch D1 (users,
  chat history, documents, keys) → engine Postgres schema. Dry-run against a
  snapshot; keep D1 read-only for 30 days post-cutover.
- **7.3** Satellite apps: browser extension and VS Code extension re-point to
  the engine's API. Desktop: adopt LobeHub's Electron app (it *is* the engine)
  and retire the Tauri shell, or keep Tauri as a thin webview onto `app.` —
  decide by binary-size and update-channel needs, not sentiment.
- **7.4** Fork hygiene: all engine changes live on an integration branch of
  `vtempest/lobehub` as **additive** packages/features where possible, so
  upstream `lobehub/lobe-chat` releases keep merging cleanly.
- ✅ Check: staging cutover with a migrated snapshot; upstream-merge drill
  (merge one newer upstream tag into the fork without conflicts in QwkSearch-
  added code).

---

## 3. Sequencing

```
Phase 0  baseline (✅) ── license inquiry ──► 🔒 gate
Phase 1  run engine + seam notes            ← unblocked, do now
   🔒 gate clears:
   ├── Phase 2  search/extraction tools     ← highest value, first
   │      ├── Phase 3  settings panes       (needs 2's config surface)
   │      └── Phase 4  UI identity          (parallel with 3)
   ├── Phase 6  REASON mount                ← parallel with 2–4
   └── Phase 5  landing split               ← after 2 (needs a linkable app)
Phase 7  deploy + migrate                   ← last, after 2–6 stabilize
```

## 4. Risks and mitigations

| Risk | Mitigation |
|---|---|
| License answer is "no" | Fall back to the cherry-pick plan (`LOBEHUB_INTEGRATION_PLAN.md`) — Tier A MIT packages + reimplementation; the vendored tree stays as reference only |
| Fork drift vs upstream | Phase 7.4 additive-changes rule; quarterly upstream-merge drill |
| Two UI systems bleed together | Phase 4 seam rule: antd-style inside engine, Tailwind outside; CI lint forbidding cross-imports |
| Postgres ops burden vs current D1 | Managed Postgres (Neon/Supabase); the engine's Drizzle migrations are already the upstream-tested path |
| Losing QwkSearch's standalone-package story | Extraction/search packages stay in this repo, published to npm, consumed by the fork (Phase 2.4) |

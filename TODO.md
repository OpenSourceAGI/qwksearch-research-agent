## In Progress

(none)

## Completed

## Unblock `bun run build:web` from the missing reason-editor demo app

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 0 ("Fix `react-reason-editor#build` failing on a fresh checkout...")
**Branch:** `claude/adoring-mayer-3njvjx`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/218
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Let `bun run build:web` (turbo's full build pipeline) complete on a fresh
checkout instead of failing partway through, so CI/production-build
verification is possible for every future change again.

### Scope
- Root-cause: `packages/reason-editor/demo/` is listed in the root
  `.gitignore` (line 56) and has **never been committed** in this repo's
  history (confirmed via `git log --all -- 'packages/reason-editor/demo/**'`
  returning zero commits), even though `README.md`, `EXTENSIONS.md`, and
  `wrangler.jsonc` extensively document a real demo app living there
  (`demo/vite.config.ts`, `demo/src/tabs/*`, `demo/alternatives.html`,
  etc). In a fresh checkout the directory simply doesn't exist.
- `react-reason-editor`'s `package.json` `"build"` script
  (`vite build && vite build --config demo/vite.config.ts`) is what turbo's
  `build` task runs for this package, and `qwksearch-web` depends on
  `react-reason-editor` as a workspace package, so turbo's `^build` graph
  always tries (and fails) to build the nonexistent demo before it can even
  reach `qwksearch-web`'s own build step.
- Fix: decouple the turbo-pipeline `"build"` script (needed by *consumers*
  of the published library, i.e. `dist/index.js` etc.) from the demo-site
  build, so `"build"` only runs `vite build` (== today's `"build:lib"`).
  `"build:demo"` and `"deploy"` (which already composes `build:lib` +
  `build:demo` directly, not `"build"`) are untouched — they already fail
  today for an unrelated, larger reason (the demo source doesn't exist) and
  are out of scope here.
- Remove the stale `packages/reason-editor/demo` line from `.gitignore`
  since it incorrectly ignores real, documented source code (not a build
  output dir) — a no-op today since the directory is absent, but prevents
  the same trap if/when the demo app is reconstructed.
- Document the deeper gap (demo app source was never committed; `pnpm dev`,
  `pnpm build:demo`, and `wrangler deploy` for the reason-editor demo site
  remain broken) as a new, separate Ideas Backlog follow-up — reconstructing
  a 6-view demo app from README description alone is a much larger task
  than this build-pipeline fix.

### Non-goals
- Reconstructing/authoring the actual `packages/reason-editor/demo/` app
  source (6 tab views + alternatives page) — tracked as a new backlog
  follow-up instead, since it's a substantial, separately-scoped effort.
- Any other pre-existing build/typecheck gaps unrelated to this specific
  failure (e.g. `TS2307` errors noted in the prior voice-auto-start task).

### Acceptance criteria
- [x] `bun run build:web` (turbo's full filtered build for `qwksearch-web`)
      no longer fails on `react-reason-editor#build`
- [x] `react-reason-editor`'s own library build (`vite build`) still runs
      and still produces `dist/` output as before
- [x] `deploy`/demo-focused scripts still exist for when the demo app is
      reconstructed later (not silently deleted)
- [x] Vitest coverage is added or updated (n/a — build-script/config change,
      no runtime logic to unit test; verified by running the actual build)
- [ ] Lint passes — no `lint` script exists for this package or at the repo
      root (no ESLint config found); nothing to run
- [ ] Typecheck passes — pre-existing unrelated `TS2307` failures (see prior
      voice-auto-start task notes); out of scope for this change
- [x] Tests pass — `bun run test` from repo root: 163/173 files, 2365/2425
      tests pass; the 56 failures across 10 files (`search-web-api` engine
      tests hitting real external APIs, a `qwksearch-web` config route test,
      `chat-agent-toolkit`, `jsdom-scraper`, `shadcn-settings`) are
      **pre-existing and unrelated** — confirmed by running
      `apps/qwksearch-web/app/api/config/__tests__/route.test.ts` in
      isolation (10/10 pass) and by re-running the full suite with this
      change `git stash`ed (same failures reproduce on unmodified code).
      None of the failing files touch `reason-editor` or its build scripts.
- [x] Production/web build passes (the specific failure this task targets):
      `bun run build:web` — 14/14 turbo tasks succeed, including
      `react-reason-editor#build` and `qwksearch-web#build`'s full `vinext`
      pipeline (previously stopped at 12/13 with `react-reason-editor#build`
      failing on `UNRESOLVED_ENTRY`)
- [x] Documentation is updated if behavior or configuration changes (this
      tracker entry + inline comments where non-obvious)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm root cause (`git log` showing demo was never committed;
      turbo dependency graph showing `qwksearch-web` pulls in
      `react-reason-editor#build`)
- [x] Implement the smallest useful vertical slice (split `build` script,
      update `.gitignore`, update `deploy`/related scripts to keep working)
- [x] Add focused Vitest coverage — n/a, see acceptance criteria note
- [x] Run focused verification (`bun run build:web`)
- [x] Run linting and typechecking (see notes — neither actionable here)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. Follow-up backlog item filed as item "0b" in the
  Ideas Backlog below for reconstructing the actual
  `packages/reason-editor/demo` app source.

## Voice auto-start on first visit

**Status:** Completed
**Source:** TODO.md — "Option to start talking automatically on first visit, or via a button from anywhere on the site."
**Branch:** `claude/adoring-mayer-drmy2g`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/216 (merged 2026-08-14)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Let a user opt in to having voice dictation start automatically the first
time they load the chat composer, instead of only via the existing mic
button / Ctrl+` shortcut in `ChatInputBox`.

### Scope
- A `voiceAutoStart` localStorage-backed setting, toggled from
  `VoiceSettingsPanel` (mirrors the existing `useTTSKokoro` pattern there).
- A small pure-function module (`src/lib/voiceAutoStart.ts`) that decides
  whether to auto-start, given the setting, speech-support, current
  listening state, and a "already triggered this browser" flag — so it only
  fires once per browser, not on every mount/navigation.
- A thin hook (`useVoiceAutoStart`) wiring that decision into
  `ChatInputBox`'s existing `toggleSpeech`/`isListening`/`isSpeechSupported`
  from `useSpeechInput`.

### Non-goals
- A floating mic button rendered outside the chat composer / on non-chat
  routes (settings, docs, admin) — the existing Ctrl+` shortcut and the
  composer's mic button already work "from anywhere" the composer is
  mounted; a separate global FAB is a larger, separate change.
- Server-side or cross-device persistence of the setting (localStorage only,
  matching the rest of `VoiceSettingsPanel`).

### Acceptance criteria
- [x] Enabling the setting and visiting the chat composer for the first time
      in a browser starts dictation automatically (when speech is
      supported).
- [x] It does not re-trigger on subsequent mounts/navigations in the same
      browser (tracked via a "triggered" localStorage flag).
- [x] It never fires when speech input isn't supported, or the mic is
      already listening.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for this package or at the repo
      root (no ESLint config found); nothing to run
- [ ] Typecheck passes — `bun run type-check` in `research-agent-ui` fails
      on **pre-existing** `TS2307` errors (`chat-agent-toolkit`,
      `use-voice-control/*`, `use-weather-forecast`, `trending-news-api`)
      because those workspace packages have no built `dist/` output in a
      fresh checkout; confirmed identical on `git stash` (pre-change code).
      Out of scope for this task.
- [x] Tests pass — `bun run test` in `research-agent-ui`: 67/67 passed
      (including the 14 new voice-auto-start tests)
- [ ] Production/web build passes — `bun run build:web` ran the full prebuild
      chain plus `vinext build`: 12/13 turbo tasks succeeded, including
      `research-agent-ui#build` (the package this change lives in). The one
      failure is `react-reason-editor#build`, which errors trying to bundle
      `packages/reason-editor/demo/vite.config.ts` as an entry
      (`UNRESOLVED_ENTRY`) — a pre-existing issue in a demo config unrelated
      to `reason-editor`'s own library build (which itself succeeded: "built
      in 2m 48s") and untouched by this change. `vinext build` for
      `qwksearch-web` itself never ran because turbo stopped after that
      failure. Filed as a known gap below rather than fixed here (out of
      this task's scope — touches `reason-editor`'s demo tooling, not voice
      input).
- [x] Documentation is updated if behavior or configuration changes (n/a — no user-facing docs describe voice settings beyond in-app copy)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm API, schema, data-flow, or interface requirements
- [x] Implement the smallest useful vertical slice
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure, validation, or edge-case coverage
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see notes above — neither is actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build (ran; surfaced a pre-existing, unrelated `reason-editor` demo build failure — see above)
- [x] Review the final diff for scope and quality
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. Follow-up (separate, unrelated): `react-reason-editor#build`
  fails on a fresh checkout bundling `packages/reason-editor/demo/vite.config.ts`
  (`UNRESOLVED_ENTRY`), which blocks `bun run build:web` from reaching
  `qwksearch-web`'s own `vinext build` step. Worth a dedicated TODO item since
  it currently blocks CI/production-build verification for every change,
  not just this one.

---

## Ideas Backlog

0. ~~Fix `react-reason-editor#build` failing on a fresh checkout~~ —
   **resolved, see "Unblock `bun run build:web`..." above.** Root cause
   turned out to be that `packages/reason-editor/demo/` was gitignored and
   had never been committed at all (not a config-resolution bug); the
   `"build"` script now only builds the library, matching what
   `qwksearch-web` actually needs from it.
0b. Reconstruct the `packages/reason-editor/demo/` app source. It has never
    been committed to this repo (confirmed via `git log --all`), yet
    `README.md`/`EXTENSIONS.md`/`wrangler.jsonc` document a real 6-view demo
    app living there (`demo/vite.config.ts`, `demo/src/tabs/*` — Full,
    Toolbar, Small toolbar, Input box, Table of contents, Harper proofing —
    plus a second `/alternatives.html` entry point). Until it's rebuilt,
    `pnpm dev`/`dev:editor`, `pnpm build:demo`, and `wrangler deploy` for the
    reason-editor demo site all remain broken (the main library build/tests
    are unaffected — see item 0).
ext - dl to reason dl folswe
1. in sidebar, have it sugegst related by keywords
2. Chat with open tabs as context.
3. Show Vals scores for all models; example Kimi K2.5 page lists Vals Index 51.70%, latency 807.18s, and cost/test $0.29.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
4. Outline tree should reuse Fumadocs page tree/sidebar patterns.
5. Option to start talking automatically on first visit, or via a button from anywhere on the site. — **in progress, see above**
6. OpenRouter apps inspiration/reference: [openrouter.ai/apps](https://openrouter.ai/apps), and OpenRouter also documents app attribution plus public app rankings.
7. common typoes
8. https://github.com/cloudflare/moltworker


## Longterm

12. Use CRX/extension to open tabs and scrape them.
13. Custom AI agent monitors topics and generates a news feed.
14. Main nav: Tabs | AI chat | Web search | Favorites | History.
15. Queries should run on cached pages that belong to topic outlines.
16. Research agents should queue the next video.
17. Follow-up suggestions.
18. Browser sidebar results.
19. Use open tabs as context.
20. Preload page results for common questions with SSR.
21. If autocomplete matches something like red.com, go there directly.
22. Share button; email to friends; social actions.
23. Suggest the next page from the sidebar on each page.
24. For each topic, next-word prediction in model.
25. Auto-search for topics in sidebar.
26. Prioritize sidebar with AI tips about the current page.
27. Cache questions and use them to build connections.
28. Add downloads tab; also back, refresh, undo close, new tab.
29. Default search support; Chrome extensions can override homepage, startup pages, and search provider via `chrome_settings_overrides`.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
31. Agents that scrape the web and work with datasets like LinkedIn.
32. Auto-generate keyphrase completions for on-page Ctrl+F search.
33. Markdown/file tree view inspiration: [ld246.com/guide/markdown](https://ld246.com/guide/markdown).
34. Reuse Fumadocs multi-tree/root-toggle ideas for docs organization.
35. Release on HN, YouTube, and Product Hunt.
36. https://21st.dev/community/agents
37. from the drodpown menu have tit  insret to as about tabstion ...` to show where the warning was created)

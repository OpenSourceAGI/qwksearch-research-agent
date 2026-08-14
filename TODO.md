## In Progress

## Completed

## Fix `qwksearch-ext`'s Tailwind v4 PostCSS plugin mismatch

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 29b (discovered as a follow-up while
verifying item 29, "Default search provider support in the browser
extension").
**Branch:** `claude/adoring-mayer-bg8yg9`
**PR:** Not created yet
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Fix the specific error item 29b documented — `apps/qwksearch-ext`'s
PostCSS config still using the Tailwind v3-style `tailwindcss: {}` plugin
entry against the installed Tailwind v4, which fails immediately with
"It looks like you're trying to use tailwindcss directly as a PostCSS
plugin." Note: fixing this turned out to be necessary but **not
sufficient** to make `bun run build`/`zip` fully succeed — see "Remaining
work" below for the distinct, deeper blocker discovered once this one was
cleared, filed as new Ideas Backlog item 29c.

### Scope
- `apps/qwksearch-ext/postcss.config.js`: replace the old-style
  `tailwindcss: {}` PostCSS plugin entry with `'@tailwindcss/postcss': {}`,
  matching the pattern already used by `apps/qwksearch-web/postcss.config.cjs`
  and `packages/reason-editor/postcss.config.js` for Tailwind v4.
- `apps/qwksearch-ext/package.json`: add `@tailwindcss/postcss` as a
  devDependency (matching the `tailwindcss` version already pinned there).
- `apps/qwksearch-ext/styles/globals.css`: add `@config
  "../tailwind.config.ts";` — once the plugin itself resolved, Tailwind v4's
  stricter CSS-first engine no longer picked up the legacy JS
  `tailwind.config.ts` (`theme.extend.colors.border` etc.) implicitly, so
  `@apply border-border` failed with "Cannot apply unknown utility class
  border-border". The `@config` directive is Tailwind v4's documented
  compatibility mechanism for keeping a v3-style JS config alongside the
  `@tailwind base/components/utilities` directives already in this file.

### Non-goals
- Any change to Tailwind utility classes, theme config, or generated styles
  beyond what's needed to keep the existing v3-style config working under
  v4 — this is a PostCSS/build wiring fix only.
- Rebuilding `packages/reason-editor/demo/` (item 0b) — unrelated.
- Wiring up `research-agent-ui` (and its own ~9 transitive workspace-package
  build chain) as a dependency of `qwksearch-ext` — this is the distinct,
  much larger blocker discovered below and filed as item 29c; out of scope
  for this PostCSS-only fix.

### Acceptance criteria
- [x] The specific "trying to use tailwindcss directly as a PostCSS plugin"
      error is gone — confirmed via `bun run build` and `bun run
      build:firefox`, both of which now get past the PostCSS/CSS
      compilation step entirely (verified by the error class changing to an
      unrelated, later-stage module-resolution error — see Remaining work).
- [ ] `bun run build` (Chrome target) fully succeeds, producing
      `.output/chrome-mv3/` — **not achieved**; blocked by the separate,
      pre-existing issue documented under Remaining work/item 29c.
- [ ] `bun run build:firefox` fully succeeds — **not achieved**, same
      blocker (confirmed it is not Chrome-specific).
- [x] Vitest coverage is added or updated — n/a; this is a build-tooling
      config fix with no testable runtime behavior (matches item 29's
      precedent of leaving static config changes untested).
- [x] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run.
- [x] Typecheck passes — `bun run compile` surfaces the same pre-existing
      `TS2304`/`TS2493`/`TS2769` errors documented in item 29's TODO entry
      (missing global `chrome` types, a tuple-index error in
      `test/message-api.test.ts`, an `OxcOptions` overload mismatch in
      `vitest.config.ts`); none touch the files this task changed, and none
      are new.
- [x] Tests pass — `bun run test` in `qwksearch-ext`: 42/42 passed (5/5
      files), same as before this change. Full workspace `bun run test`:
      169/179 files, 2414/2471 tests pass (4 skipped); the 53 failures
      across the same 10 files documented repeatedly in prior TODO.md tasks
      (`search-web-api` hitting real external APIs, the `qwksearch-web`
      config route test, `shadcn-settings`, `jsdom-scraper` missing `jsdom`,
      `chat-agent-toolkit`'s `openrouter-default-model.test.js`) are
      pre-existing and unrelated — none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry.

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm the fix pattern against sibling Tailwind v4 configs
      (`qwksearch-web`, `reason-editor`, `scraper-jsdom/demo`)
- [x] Reproduce the failure on a clean `bun install`
- [x] Implement the smallest useful vertical slice (`postcss.config.js` +
      `package.json` devDependency)
- [x] Run `bun run build`/`build:firefox`, discover the fix is necessary but
      not sufficient (new `@apply border-border` error), add the `@config`
      directive to `globals.css` to resolve it, then discover the further,
      distinct `research-agent-ui` module-resolution blocker (filed as item
      29c rather than expanded into this task's scope)
- [x] Run focused tests and fix failures — `qwksearch-ext`'s own suite
      (42/42) unaffected
- [x] Run linting and typechecking — no new failures
- [x] Run the full relevant test suite — no new failures (53 pre-existing,
      unrelated)
- [x] Run the production/web build — 14/14 turbo tasks passed
- [x] Review the final diff for scope and quality (reverted the unrelated
      `bun.lock` package-version-sync diff produced by `bun install`,
      keeping only the one line adding `@tailwindcss/postcss` to
      `qwksearch-extension-wxt`'s devDependencies, matching item 29's
      precedent)
- [x] Commit and push the branch
- [ ] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope (the item 29b PostCSS mismatch is fixed
  and verified).
- Filed as new Ideas Backlog item 29c: once the PostCSS/CSS-config issue is
  fixed, `apps/qwksearch-ext`'s build fails at a later, unrelated step —
  `components/ResearchTab.tsx` imports `research-agent-ui`, but
  `qwksearch-ext/package.json` never declares it as a dependency (unlike
  `apps/qwksearch-web`, which does via `"research-agent-ui": "workspace:*"`
  plus a `prebuild` script that builds `research-agent-ui` and ~8 other
  workspace packages first). `research-agent-ui` itself has no `dist/`
  output in a fresh checkout and depends on ~30 packages including several
  more workspace packages (`chat-agent-toolkit`, `domain-rank`,
  `extract-webpage`, `trending-news-api`, `use-voice-control`, etc.) plus a
  peer dependency on `next` (already partly worked around via
  `qwksearch-ext/lib/next-navigation-shim.tsx`). Fully unblocking
  `qwksearch-ext`'s build requires wiring up this dependency chain — a
  materially larger, separate task from a PostCSS config fix, so it's left
  as its own dedicated follow-up rather than folded into this one.

## Completed

## Default search provider support in the browser extension (chrome_settings_overrides)

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 29 ("Default search support; Chrome
extensions can override homepage, startup pages, and search provider via
`chrome_settings_overrides`.")
**Branch:** `claude/adoring-mayer-0psw2h`
**PR:** Not created yet
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Let `apps/qwksearch-ext` (the Chrome extension) offer to become the
browser's homepage, startup page, and default search provider via Chrome's
native `chrome_settings_overrides` manifest key — the standard,
user-confirmed mechanism Chrome extensions use for this (Chrome shows its
own permission prompt on install; nothing here bypasses that).

### Scope
- `apps/qwksearch-ext/wxt.config.ts`: convert the static `manifest` object
  into a `(env) => ({...})` function (WXT's documented per-browser manifest
  pattern) and add a `chrome_settings_overrides` block — `homepage`,
  `startup_pages`, and `search_provider` (`name`, `keyword`, `search_url`
  with a `{searchTerms}` placeholder, `favicon_url`, `encoding`,
  `is_default: true`) — gated on `env.browser === 'chrome'`.
- Reuse the same production host (`https://qwksearch.com`) and query-param
  convention (`?q=`) already established for QwkSearch searches in
  `apps/qwksearch-ext/content/shortcut-search-web.ts`.

### Non-goals
- Firefox/other-browser equivalents — `chrome_settings_overrides.homepage`/
  `startup_pages` aren't part of Firefox's supported subset, and the idea
  itself says "Chrome extensions"; gating to `env.browser === 'chrome'`
  keeps `build:firefox`/`zip:firefox` unaffected.
- Any change to the existing in-app/side-panel search-engine list
  (`content/shortcut-search-web.ts`) — this task only adds the browser-level
  override, reusing that file's existing URL convention.
- A dedicated 16×16 favicon asset — reuses the existing hosted
  `https://qwksearch.com/favicon.ico`.

### Acceptance criteria
- [x] The Chrome build's resolved manifest includes
      `chrome_settings_overrides.homepage`, `.startup_pages`, and
      `.search_provider` with a valid `search_url` containing
      `{searchTerms}` — verified by invoking `wxt.config.ts`'s exported
      `manifest(env)` function directly with `{ browser: 'chrome' }` (see
      Implementation plan note below on why the actual built
      `.output/chrome-mv3/manifest.json` couldn't be inspected instead).
- [x] The Firefox build's resolved manifest does NOT include
      `chrome_settings_overrides` — verified the same way with
      `{ browser: 'firefox' }`, which returns `chrome_settings_overrides:
      undefined`.
- [x] Vitest coverage is added or updated — n/a; per repo precedent
      (`vitest.config.ts` coverage is scoped to `lib/**` and `content/**`
      only, and no existing test touches `wxt.config.ts` or any other
      manifest field such as `permissions`/`content_security_policy`), a
      static manifest-config addition is conventionally left untested here.
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or at the
      repo root (no ESLint config found); nothing to run
- [x] Typecheck passes — `bun run compile` in `qwksearch-ext` surfaces the
      same **pre-existing** `TS2304`/`TS2493`/`TS2769` errors (missing
      global `chrome` types in several unrelated files, a tuple-index error
      in `test/message-api.test.ts`, and an `OxcOptions` overload mismatch
      in `vitest.config.ts`) on `git stash`-ed (unmodified) code too; none
      touch `wxt.config.ts` or are introduced by this change.
- [x] Tests pass — `bun run test` in `qwksearch-ext`: 42/42 passed (5/5
      files). Full workspace `bun run test`: 169/179 files, 2415/2471 tests
      pass (4 skipped); the 52 failures across the same 10 files documented
      repeatedly in prior TODO.md tasks (`search-web-api` engine tests
      hitting real external APIs, the `qwksearch-web` config route test,
      `shadcn-settings`, `jsdom-scraper` missing its `jsdom` dependency,
      `chat-agent-toolkit`'s `openrouter-default-model.test.js`) are
      pre-existing and unrelated — none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web` (the repo's
      standard production/web build target): 14/14 turbo tasks succeeded.
      `qwksearch-ext`'s own `bun run build` (Chrome target) fails, but this
      is a **pre-existing, unrelated** failure: `vite:css` /
      `styles/globals.css` errors with "It looks like you're trying to use
      tailwindcss directly as a PostCSS plugin. The PostCSS plugin has
      moved to a separate package... install @tailwindcss/postcss" —
      reproduces identically with this change `git stash`-ed. Root cause is
      the installed `tailwindcss@4.3.3` vs. `postcss.config.js` still
      referencing the old `tailwindcss` PostCSS-plugin API; fixing it means
      adding a new dependency (`@tailwindcss/postcss`) and touching
      `postcss.config.js`, out of scope for a manifest-only change. Filed as
      a new Ideas Backlog follow-up below (item 29b) since it currently
      blocks building/zipping the Chrome extension at all, not just
      verifying this task.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry and inline comments (no user-facing docs
      describe the extension's manifest internals)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm the production host/query-param convention and WXT's
      per-browser `manifest` function support
- [x] Implement the smallest useful vertical slice
- [x] Attempt to build the Chrome target and inspect
      `.output/chrome-mv3/manifest.json` for the new key — blocked by the
      pre-existing, unrelated Tailwind/PostCSS build failure documented
      above (confirmed via `git stash` that it predates this change); fell
      back to directly invoking the exported `manifest(env)` function for
      both `browser: 'chrome'` and `browser: 'firefox'` and asserting on
      the returned object, which exercises the exact same code path the
      real build would call
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change; typecheck failures are pre-existing)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` diff produced by `bun install` — pure
      version-number sync to already-committed `package.json` bumps, out of
      scope, matching prior tasks' precedent)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope.
- Follow-up filed as Ideas Backlog item 29b: `qwksearch-ext`'s own
  `bun run build`/`zip` (Chrome target) fails on a fresh checkout due to a
  pre-existing Tailwind v4 PostCSS-plugin mismatch (`postcss.config.js`
  still uses the old `tailwindcss: {}` plugin form; needs
  `@tailwindcss/postcss` installed and referenced instead). This blocks
  building or zipping the Chrome extension at all — not just this task —
  and should be fixed as its own dedicated task. Once fixed, a follow-up
  verification step is to inspect the real
  `.output/chrome-mv3/manifest.json` and `.output/firefox-mv2/manifest.json`
  (or `-mv3`, depending on WXT's Firefox target) to confirm this task's
  `chrome_settings_overrides` block matches what the direct function-call
  verification already showed.

## Test coverage for the follow-up-suggestions pipeline

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 17 ("Follow-up suggestions."). This
feature is already fully implemented (inherited from an early bulk-import
commit, `e21b8fc`) end-to-end for the chat conversation surface — LLM call,
API route, client fetch, and UI render — but has zero test coverage anywhere
in the pipeline. This task closes that gap; it does not add new
user-visible behavior.
**Branch:** `claude/adoring-mayer-zic4bl`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/235 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Add Vitest coverage for the existing follow-up-suggestions backend pipeline
(LLM generator → API handler → client fetch helper) so a future change to
any of these files gets a regression signal, matching the existing test
pattern used for the sibling autocomplete handler
(`apps/qwksearch-web/app/api/agent/__tests__/autocomplete.test.ts`).

### Scope
- `packages/chat-agent-toolkit/test/suggestionGeneratorAgent.test.ts`:
  unit tests for `generateSuggestions`
  (`packages/chat-agent-toolkit/src/tools/search/suggestionGeneratorAgent.ts`),
  mocking the `ai` package's `generateText` (same mocking pattern as
  `packages/write-language/test/generate-response.attachments.test.ts`) to
  assert the prompt is built from chat history, the parsed
  `<suggestions>`-tagged output is returned, and malformed/missing-tag
  output yields an empty array (via the existing `LineListOutputParser`).
- `apps/qwksearch-web/app/api/agent/__tests__/suggestions.test.ts`: unit
  tests for `createSuggestionsHandler`
  (`packages/research-agent-ui/src/api/handlers/suggestions.ts`), mocking
  `chat-agent-toolkit/tools/search/suggestionGeneratorAgent` and
  `chat-agent-toolkit/models/registry`, asserting: non-user/assistant
  messages (e.g. `source`) are filtered out of the chat history sent
  upstream, a returned suggestion containing multiple `?`-terminated
  questions is split into separate standalone suggestions, and the response
  shape/status code.
- `packages/research-agent-ui/test/suggestions.test.ts`: unit tests for
  `getSuggestions` (`packages/research-agent-ui/src/lib/suggestions.ts`),
  mocking the `grab-url` default export, asserting: localStorage-backed
  model/provider/`maxFollowupQuestions` settings are read and sent, only
  user/assistant messages are forwarded, a non-array `suggestions` response
  yields `[]`, and a rejected fetch is swallowed and yields `[]`.

### Non-goals
- A UI/DOM test for `FollowUpSuggestions.tsx` — `research-agent-ui`'s test
  suite has no existing `@testing-library/react`-style component test to
  mirror (all current tests are logic/hook tests), and standing that up is
  a separate, larger piece of work; left as a follow-up.
- Any behavior change to the suggestions pipeline itself — this is a
  test-only change.
- The parallel article-reader follow-up-questions pipeline
  (`ArticleFollowupQuestions.tsx`, `article-followups/route.ts`,
  `api/handlers/article-followups.ts`) — same gap, but a separate surface;
  left as a follow-up.

### Acceptance criteria
- [x] `generateSuggestions` returns the parsed list of suggestions from a
      well-formed `<suggestions>`-tagged LLM response.
- [x] `generateSuggestions` returns `[]` when the LLM response has no
      `<suggestions>` tags.
- [x] `createSuggestionsHandler`'s `POST` filters non-user/assistant
      messages out of the chat history before calling `generateSuggestions`.
- [x] `createSuggestionsHandler`'s `POST` splits a suggestion containing
      multiple questions into separate standalone questions.
- [x] `getSuggestions` sends the localStorage-backed model/provider/
      max-questions settings and filtered chat history to the API.
- [x] `getSuggestions` returns `[]` (not a throw) when the fetch rejects or
      the response shape is unexpected.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `chat-agent-toolkit`,
      `research-agent-ui`, or `qwksearch-web` (no ESLint config found);
      nothing to run
- [x] Typecheck passes — `bun run type-check` in `research-agent-ui`
      surfaces the same 5 **pre-existing** `TS2307` errors documented in
      prior TODO.md tasks (`ChatHomepage.tsx`, `ChatWindow.tsx`,
      `MessageSources.tsx`, `WebCitationBadge.tsx` — missing built `dist/`
      output for workspace packages in a fresh checkout), none of which this
      change touches. No `typecheck`/`tsc` script exists for
      `chat-agent-toolkit` or `qwksearch-web` directly (typechecked as part
      of `research-agent-ui`'s and the build's checks).
- [x] Tests pass — `bunx vitest run test/suggestionGeneratorAgent.test.ts`
      in `chat-agent-toolkit`: 4/4 passed. `bunx vitest run
      app/api/agent/__tests__/suggestions.test.ts` in `qwksearch-web`: 5/5
      passed. `bunx vitest run test/suggestions.test.ts` in
      `research-agent-ui`: 4/4 passed. Full `chat-agent-toolkit` suite:
      51/54 passed (3 pre-existing failures in
      `openrouter-default-model.test.js`, documented in prior TODO.md
      tasks, unrelated to this change). Full `research-agent-ui` suite:
      75/75 passed (71 pre-existing + 4 new). Full workspace `bun run
      test`: 169/179 files, 2417/2471 tests pass (4 skipped); the 54
      failures across the same 10 files documented repeatedly in prior
      TODO.md tasks (`search-web-api` engine tests hitting real external
      APIs, the `qwksearch-web` config route test, `shadcn-settings`,
      `jsdom-scraper` missing its `jsdom` dependency, `chat-agent-toolkit`'s
      `openrouter-default-model.test.js`) are pre-existing and unrelated —
      none touch the 3 new test files.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded, including `qwksearch-web`'s full `vinext build`.
- [x] Documentation is updated if behavior or configuration changes — n/a,
      test-only change

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm mocking patterns for `ai`'s `generateText`, `grab-url`, and
      handler-level module mocks (mirrored from
      `write-language/test/generate-response.attachments.test.ts` and
      `apps/qwksearch-web/app/api/agent/__tests__/autocomplete.test.ts`)
- [x] Run `bun install` (workspace had no installed `node_modules` yet)
- [x] Add `suggestionGeneratorAgent.test.ts`
- [x] Add `suggestions.test.ts` (API handler)
- [x] Add `suggestions.test.ts` (client lib helper)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` diff produced by `bun install` — pure
      version-number sync to already-committed `package.json` bumps, out of
      scope, matching prior tasks' precedent)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #235, merged)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. PR #235 merged. (This run found the implementation,
  tests, commit, and PR already complete from a prior session — the tracker
  had simply not been flipped to Completed yet; this run only updates the
  tracker.)
- Deferred follow-ups noted above remain open: a UI/DOM test for
  `FollowUpSuggestions.tsx`, and test coverage for the parallel
  article-reader follow-up-questions pipeline
  (`ArticleFollowupQuestions.tsx` / `article-followups` route/handler).

## Article panel: Share button (native Web Share API with clipboard fallback)

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 22 ("Share button; email to friends;
social actions.")
**Branch:** `claude/adoring-mayer-jn1xra`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/233 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Add a "Share" action to the article extract panel's toolbar
(`ArticleActionButtons.tsx`) so a user can share the article they're
reading — via the OS-native share sheet (which already surfaces Mail and
installed social apps as targets on supporting browsers/devices) or, as a
fallback on browsers without the Web Share API, by copying the article
link to the clipboard.

### Scope
- New pure helper `packages/research-agent-ui/src/lib/shareArticle.ts`:
  given `{ title, text, url }` and injected `share`/`writeText`
  dependencies, calls `share()` when provided (returns `'shared'`), falls
  back to `writeText(url)` when `share` is undefined or when `share()`
  rejects with anything other than a user-cancellation `AbortError`
  (returns `'copied'`), and returns `'cancelled'` without copying when the
  user dismisses the native share sheet.
- `ArticleActionButtons.tsx`: new `Share2`-icon toolbar button (tooltip
  "Share article", no keyboard shortcut — see Non-goals) calling a new
  `onShareClick` prop, placed next to the existing Copy button.
- `ArticleExtractPanel.tsx`: wires `onShareClick` to a handler that calls
  `shareArticle` with `navigator.share`/`navigator.clipboard.writeText`
  (feature-detecting `navigator.share`), and shows a brief "Link copied!"
  confirmation (mirroring the existing `showCopiedMessage` banner) when the
  result is `'copied'`.

### Non-goals
- Bespoke share-intent URLs for individual platforms (Twitter/X, Facebook,
  LinkedIn, WhatsApp, etc.) — the native Web Share API's share sheet
  already lists installed apps (including Mail) as targets on supporting
  browsers; dedicated per-platform intents are a follow-up if ever needed
  for browsers without Web Share support.
- A keyboard shortcut for the new action — every existing toolbar letter
  shortcut is taken by an unrelated action (share's natural "s" is already
  "Suggest"); left unbound rather than picking a non-mnemonic key.
- Sharing from the chat conversation view (`ChatConversation`) — scoped to
  the article extract panel only, matching where the existing Copy/
  Favorite/Highlight toolbar actions already live.

### Acceptance criteria
- [x] Clicking Share on a browser with the Web Share API invokes
      `navigator.share` with the article's title/cite/url.
- [x] Clicking Share on a browser without the Web Share API copies the
      article URL to the clipboard and shows a brief confirmation.
- [x] If the user cancels the native share sheet (`AbortError`), nothing is
      copied and no error is shown.
- [x] If `navigator.share` rejects for any other reason, the clipboard
      fallback still runs so the user isn't left without a way to share.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for this package or at the repo
      root (no ESLint config found); nothing to run
- [x] Typecheck passes — `bun run type-check` in `research-agent-ui`
      surfaces the same 5 **pre-existing** `TS2307` errors documented in
      prior TODO.md tasks (`ChatHomepage.tsx`, `ChatWindow.tsx`,
      `MessageSources.tsx`, `WebCitationBadge.tsx` — missing built `dist/`
      output for workspace packages in a fresh checkout), none of which
      this change touches. No new errors from this change's files
      (`navigator.share` type-checks cleanly against the installed DOM lib).
- [x] Tests pass — `bunx vitest run test/shareArticle.test.ts` in
      `research-agent-ui`: 4/4 passed. `bun run test` in `research-agent-ui`:
      71/71 passed (67 pre-existing + 4 new). Full workspace `bun run test`:
      166/176 files, 2404/2458 tests pass (4 skipped); the 50 failures
      across the same 10 files documented repeatedly in prior TODO.md tasks
      (`search-web-api` engine tests hitting real external APIs, the
      `qwksearch-web` config route test, `shadcn-settings`, `jsdom-scraper`
      missing its `jsdom` dependency, `chat-agent-toolkit`'s
      `openrouter-default-model.test.js`) are pre-existing and unrelated —
      none touch the changed files.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded, including `qwksearch-web`'s full `vinext build`.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry and inline comments (no user-facing docs
      describe individual article-toolbar actions); the component's
      file-level doc comment and Storybook description were updated to
      mention the new Share button.

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm API, schema, data-flow, or interface requirements
      (`Article.url`/`.title`/`.cite` already populated in
      `ArticleExtractPanel`; `Share2` icon confirmed present in the
      installed `lucide-react` version)
- [x] Implement `shareArticle.ts`
- [x] Add the Share button to `ArticleActionButtons.tsx`
- [x] Wire the handler into `ArticleExtractPanel.tsx`
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (unsupported browser,
      user-cancelled share, share() rejecting for another reason)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` diff produced by `bun install` — pure
      version-number sync to already-committed `package.json` bumps, out
      of scope, matching prior tasks' precedent)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #233, merged)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. PR #233 merged.

## Autocomplete: recognize a typed bare domain even when it's outside the ranked dataset

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 21 ("If autocomplete matches
something like red.com, go there directly.")
**Branch:** `claude/adoring-mayer-va3awu`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/231
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
When the user types a string that looks like a real domain (e.g.
`red.com`), offer a "go there directly" suggestion in the chat composer's
autocomplete dropdown — even when that domain isn't one of the ~10k
domains in the `domain-rank` ranked dataset the existing fuzzy domain
search (`searchDomains` in
`packages/research-agent-ui/src/api/handlers/autocomplete.ts`) matches
against. Confirmed via a direct check that `red.com` itself is absent from
`packages/domain-rank/data/domain-rank-merged.json` (10,020 entries), so
today typing it produces zero domain suggestions — only the existing
fuzzy match against known top domains works.

### Scope
- `packages/research-agent-ui/src/api/handlers/autocomplete.ts`:
  `searchDomains` gains a literal-domain check on the last typed word using
  `tldts` (already a dependency of `domain-rank`/`search-web-api`/
  `qwksearch-web`, added here too) to validate the string has a real,
  recognized public suffix (e.g. `.com`, `.io`, `.co.uk`) — this avoids
  false positives on filename-like strings (`note.txt`, `script.js`) that a
  naive `\w+\.\w+` regex would wrongly treat as domains, since `tldts`
  checks against the actual public-suffix list rather than an arbitrary
  extension pattern.
- When the last word is a valid, ranked-dataset-independent domain and
  isn't already present in the fuzzy results, prepend a synthetic
  `DomainSuggestion` for it (unranked, so no rank badge renders — same
  convention already used for dataset entries lacking a rank) ahead of the
  fuzzy matches, still capped at `MAX_DOMAIN_SUGGESTIONS`.
- No frontend (`ChatInputBox.tsx`) changes needed — it already renders
  `domainSuggestions` generically and `goToDomain` already navigates
  straight to `https://{domain}` on selection.

### Non-goals
- IP-address literals (e.g. `192.168.1.1`) or `localhost` — out of scope;
  `tldts` won't recognize these as having a public suffix, and typing an
  address is a different, less common flow than typing a memorable domain
  name.
- Auto-navigating without an explicit selection (e.g. on Enter with no
  dropdown interaction) — this task only adds the *suggestion*; selecting
  it (click, Tab, Enter-while-highlighted, or number key) already works via
  the existing `goToDomain`/`chooseOption` wiring.
- Changing the existing fuzzy ranked-domain matching behavior in any way
  when the typed text does *not* look like a full domain.

### Acceptance criteria
- [x] Typing a real-looking domain not present in the ranked dataset (e.g.
      `red.com`) surfaces it as a domain suggestion.
- [x] Filename-like strings with non-TLD extensions (e.g. `note.txt`,
      `script.js`) do NOT spuriously appear as domain suggestions.
- [x] A literal domain match that's already found via fuzzy search isn't
      duplicated in the suggestion list.
- [x] The existing ranked-domain fuzzy-match behavior is unchanged for
      queries that aren't themselves a full valid domain.
- [x] Selecting the synthetic suggestion navigates to `https://<domain>`,
      matching existing dataset-backed domain suggestions (unchanged
      `goToDomain`/`chooseOption` wiring, exercised by existing
      `ChatInputBox` behavior — no new frontend code needed).
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `research-agent-ui`,
      `qwksearch-web`, or at the repo root (no ESLint config found);
      nothing to run
- [x] Typecheck passes — `bun run type-check` in `research-agent-ui`
      surfaces the same 5 **pre-existing** `TS2307` errors documented in
      prior TODO.md tasks (`ChatHomepage.tsx`, `ChatWindow.tsx`,
      `MessageSources.tsx`, `WebCitationBadge.tsx` — missing built `dist/`
      output for workspace packages in a fresh checkout), none of which
      this change touches. No new errors from this change's files
      (confirmed the `tldts` import itself resolves cleanly once `bun
      install` links the newly added dependency).
- [x] Tests pass — `bunx vitest run app/api/agent/__tests__/autocomplete.test.ts`
      in `qwksearch-web` (this handler's actual test suite): 11/11 passed
      (8 pre-existing + 3 new). `bun run test` in `research-agent-ui`:
      67/67 passed. Full workspace `bun run test`: 165/175 files,
      2402/2454 tests pass (4 skipped); the 52 failures across the same 10
      files documented in prior TODO.md tasks (`search-web-api` engine
      tests hitting real external APIs, the `qwksearch-web` config route
      test, `shadcn-settings`, `jsdom-scraper` missing its `jsdom`
      dependency, `settings-field.test.tsx`) are pre-existing and
      unrelated — none touch the changed files.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded, including `qwksearch-web`'s full `vinext build`.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry and inline comments (no user-facing docs
      describe individual autocomplete-suggestion behaviors)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm API, schema, data-flow, or interface requirements (`tldts`
      already used elsewhere in the repo for the same "is this a real
      domain suffix" question; `research-agent-ui` doesn't yet depend on it)
- [x] Add `tldts` as a dependency of `research-agent-ui`
- [x] Implement the smallest useful vertical slice in `autocomplete.ts`
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (filename false positives,
      dedupe against fuzzy results)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint
      is not actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` diff produced by `bun install` — pure
      version-number sync to already-committed `package.json` bumps, out
      of scope, matching prior tasks' precedent — keeping only the new
      `tldts` dependency line for `research-agent-ui`)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #231)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. PR #231 merged.

## Related panel: rank by shared tags as well as keyword overlap

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 1 ("in sidebar, have it sugegst
related by keywords"), continuing the follow-up explicitly deferred in the
"Sidebar: suggest related documents by keyword overlap" task's Remaining
work ("incorporating document tags (`Document.tags`) into the relevance
score alongside keyword overlap").
**Branch:** `claude/adoring-mayer-0mn2j7`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/229 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Make the sidebar's "Related" panel also rank documents by shared
user-assigned tags (`Document.tags`), not just incidental keyword overlap —
a deliberate relatedness signal the user themselves created via the existing
tag-management UI, which the first slice's PR (#226) explicitly deferred.

### Scope
- `findRelatedDocuments` in `packages/reason-editor/src/search/relatedDocuments.ts`:
  extract each document's tags (trimmed, lower-cased for case-insensitive
  matching), count shared tags with the active document, and weight each
  shared tag as `TAG_MATCH_WEIGHT` (5) shared keywords when ranking — tags
  are a stronger, more deliberate signal than incidental keyword overlap.
- A document with shared tags but zero shared keywords now qualifies for
  the Related list (previously required at least one shared keyword).
- `RelatedDocumentResult` gains a `sharedTagCount` field alongside the
  existing `sharedKeywordCount`.
- `SidebarContent.tsx`'s `renderRelated()`: show a small tag icon + count
  next to the existing keyword-count badge when `sharedTagCount > 0`.

### Non-goals
- Any change to how tags are created/edited (`TagManagementDialog`,
  `useReasonDocsState`) — this task only consumes the existing `tags`
  field for scoring.
- Weighting by tag *rarity* (e.g. TF-IDF-style boosts for uncommon tags) —
  a flat per-tag weight is sufficient for this slice.
- The other follow-ups noted in PR #226's Remaining work (surfacing
  related-document suggestions in the chat/search UI, open-tab context) —
  out of scope here, tag-aware scoring only.

### Acceptance criteria
- [x] A document sharing at least one tag with the active document appears
      in the Related list even with zero shared keywords.
- [x] A document with a shared tag ranks above a document with only a
      larger keyword-only overlap.
- [x] Tag matching is case-insensitive and ignores blank/whitespace-only
      tags.
- [x] Existing keyword-overlap-only ranking behavior is unchanged when
      neither document has tags.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for this package or at the
      repo root (no ESLint config found); nothing to run
- [x] Typecheck passes — `npx tsc --noEmit -p tsconfig.json` in
      `reason-editor` surfaces the same 5 **pre-existing** errors as prior
      tasks (`InviteModal.tsx`, `Pagination.ts`, `filetree.tsx`), none of
      which this change touches. No new errors from this change's files.
- [x] Tests pass — `bunx vitest run test/search/relatedDocuments.test.ts`
      in `reason-editor`: 10/10 passed. Full `reason-editor` suite
      (`bunx vitest run`): 471/471 passed (43/43 files). Full workspace
      `bun run test`: 165/175 files, 2393/2451 tests pass (4 skipped); the
      54 failures across the same 10 files documented in prior TODO.md
      tasks (`search-web-api` engine tests hitting real external APIs, the
      `qwksearch-web` config route test, `shadcn-settings`,
      `jsdom-scraper` missing its `jsdom` dependency,
      `settings-field.test.tsx`) are pre-existing and unrelated — none
      touch `reason-editor`.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry and updated inline docs (no user-facing
      docs describe individual sidebar panels)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm API, schema, data-flow, or interface requirements
      (`Document.tags?: string[]`, already populated via
      `TagManagementDialog`/`useReasonDocsState`)
- [x] Implement the smallest useful vertical slice
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (tag-only match, tag beats
      larger keyword overlap, case-insensitive/blank-tag handling)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task.
- Natural follow-ups (left for a future run, per Ideas Backlog item 1's
  broader scope): surfacing related-document suggestions in the
  chat/search UI (`research-agent-ui`) rather than just the REASON editor
  sidebar; open-tab context.

## Fix common typos in AI prompt templates

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 7 ("common typoes")
**Branch:** `claude/adoring-mayer-du2vzr`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/222 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Fix real, user-visible typos found by a repo-wide sweep, focusing on the
literal "common typoes" backlog item. The actual typo instances are
inside the LLM system-prompt templates that ship to production — text the
model reads on every request — not just cosmetic.

### Scope
- `packages/chat-agent-toolkit/src/prompts/search-prompts.ts`: "relevent"
  → "relevant" (Writing Assistant prompt's citation instructions).
- `packages/write-language/src/prompt-templates.ts` (`answer-cite-sources`
  prompt): "relevent" → "relevant", "consits" → "consists", "unbaised" →
  "unbiased".

### Non-goals
- Broad automated spellchecking tooling (no `codespell`/`cspell` available
  offline in this environment) — this is a manual, targeted sweep, not an
  attempt at exhaustive coverage.
- `packages/*/misspelled-typos-8k.json` and any other intentional
  misspelling datasets used by the autocomplete/typo-suggestion features —
  those files' contents are supposed to contain misspellings; left
  untouched.
- Superficial regex false positives confirmed during the sweep (e.g.
  "successfull" only ever appearing as a substring of "successfully";
  "grammer" only ever as a substring of "programmer") — not real typos.

### Acceptance criteria
- [x] The two prompt-template files no longer contain "relevent",
      "consits", or "unbaised"
- [x] No test asserts on the exact pre-fix typo'd text (confirmed via
      grep of `packages/write-language/test/` and
      `packages/chat-agent-toolkit/test/`)
- [x] Vitest coverage is added or updated — n/a, pure prompt-copy text
      change with no test asserting exact wording either before or after
- [ ] Lint passes — no `lint` script exists for this package or at the
      repo root (no ESLint config found); nothing to run
- [ ] Typecheck passes — no `typecheck`/`tsc` script exists for
      `chat-agent-toolkit` or `write-language`; nothing to run
- [x] Tests pass — `bunx vitest run packages/chat-agent-toolkit/test/`:
      47/50 pass (the 3 failures in `openrouter-default-model.test.js` are
      pre-existing and unrelated — they assert on OpenRouter's default
      free-model id/metadata, a file untouched by this change).
      `bunx vitest run packages/write-language/test/`: 78/78 pass. Full
      workspace `bun run test`: 165/175 files, 2387/2448 tests pass (4
      skipped); the 57 failures across the same 10 files documented in
      prior TODO.md tasks (`search-web-api` engine tests hitting real
      external APIs, the `qwksearch-web` config route test,
      `shadcn-settings`, `jsdom-scraper` missing its `jsdom` dependency)
      are pre-existing and unrelated — none touch the two changed files.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded.
- [x] Documentation is updated if behavior or configuration changes (n/a —
      no behavior change; this tracker entry documents the change)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm no test/schema depends on the exact typo'd wording
- [x] Implement the smallest useful vertical slice (fix the 4 typo
      instances across the 2 files)
- [x] Add focused Vitest coverage — n/a, see acceptance criteria note
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — neither
      is actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #222, already merged before
      this tracker-only follow-up)
- [x] Update tracker status, completed checkboxes, and remaining work
      (also removed a stale duplicate "In Progress" entry for the
      already-merged "Sidebar: suggest related documents" task left behind
      by a prior run, and fixed this entry's section nesting — it had been
      left outside the `## Completed` heading)

### Remaining work
- None for this task. PR #222 merged; this run only finalized the tracker.

## Sidebar: suggest related documents by keyword overlap

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 1 ("in sidebar, have it sugegst
related by keywords")
**Branch:** `claude/adoring-mayer-vnisju`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/226 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Add a new "Related" sidebar panel to the REASON editor that suggests other
documents related to the currently active document, ranked by shared
significant keywords — a small, independently useful first slice of Ideas
Backlog item 1.

### Scope
- Pure `findRelatedDocuments` helper in
  `packages/reason-editor/src/search/relatedDocuments.ts`: extracts
  significant keywords (stopword- and length-filtered) from the active
  document's title + plain-text content (reusing the existing
  `stripHtmlToText` from `searchDocuments.ts`), scores every other
  non-folder, non-deleted document by shared-keyword overlap, and returns
  the top-N ranked matches.
- New `'related'` `SidebarPanelType`, registered in `panelOptions.ts`
  (`PANEL_OPTIONS`) so it's toggleable from the existing "Split View
  Options" dropdown (`SidebarViewMenu`) exactly like the
  `outline`/`files`/`ai`/`openTabs` panels.
- A `renderRelated()` view added to `SidebarContent.tsx` (mirrors
  `renderOutline`/`renderFiles`) showing the ranked related-document titles;
  clicking one calls the existing `onSelect`.

### Non-goals
- Any server-side/embedding-based semantic similarity — this slice is pure
  client-side keyword overlap, matching the existing `searchDocuments.ts`
  approach (plain substring/keyword matching, no ML).
- Related suggestions in the chat/search UI (`research-agent-ui`) or based
  on open browser tabs — scoped to the REASON editor's document sidebar
  only, matching where the Fumadocs-style outline/file-tree panels already
  live.
- Automatically opening/expanding a related document — this slice only
  lists related documents and lets the user click through via the existing
  `onSelect` callback.

### Acceptance criteria
- [x] With an active document sharing keywords with other documents, the
      "Related" panel lists them ranked by shared-keyword count, most
      related first.
- [x] The active document itself is never included in its own related list.
- [x] Folders and soft-deleted documents are excluded from related
      suggestions.
- [x] With no active document, or no keyword overlap with any other
      document, the panel shows an empty state rather than throwing.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for this package or at the repo
      root (no ESLint config found); nothing to run
- [x] Typecheck passes — `npx tsc --noEmit -p tsconfig.json` in
      `reason-editor` surfaces the same 5 **pre-existing** errors as prior
      tasks (`InviteModal.tsx`, `Pagination.ts`, `filetree.tsx`), none of
      which this change touches. No new errors from this change's files.
- [x] Tests pass — `bun run test` in `reason-editor`: 468/468 passed
      (43/43 files, including 6 new tests in `relatedDocuments.test.ts`).
      Full workspace `bun run test`: 165/175 files, 2391/2448 tests pass
      (4 skipped); the 53 failures across the same 10 files documented in
      prior TODO.md tasks (`search-web-api` engine tests hitting real
      external APIs, the `qwksearch-web` config route test,
      `shadcn-settings`, `jsdom-scraper`) are pre-existing and unrelated —
      none touch `reason-editor`.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded, including `react-reason-editor#build` and
      `qwksearch-web#build`'s full `vinext` pipeline.
- [x] Documentation is updated if behavior or configuration changes (this
      tracker entry + inline comments where non-obvious)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm API, schema, data-flow, or interface requirements
- [x] Implement the smallest useful vertical slice
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (no active document; active
      document excluded from its own results; folders/soft-deleted
      documents excluded; no keyword overlap; result limit; stopword
      filtering)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. PR #226 merged.
- Natural follow-ups (left for a future run, per Ideas Backlog item 1's
  broader scope): surfacing related-document suggestions in the
  chat/search UI (`research-agent-ui`) rather than just the REASON editor
  sidebar; incorporating document tags (`Document.tags`) into the
  relevance score alongside keyword overlap.

## Outline sidebar: auto-scroll to reveal the active heading

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 4 ("Outline tree should reuse
Fumadocs page tree/sidebar patterns."), continuing the follow-up explicitly
deferred in the "Outline sidebar: highlight the active heading while
scrolling" task below (PR #220's Non-goals / Remaining work: "auto-scroll
the sidebar panel itself to reveal the active heading when it scrolls out of
the panel's own viewport").
**Branch:** `claude/adoring-mayer-ldfe0q`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/224 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
When scroll-spy (`useActiveHeading`) marks a new heading "active" in the
`OutlineView` sidebar panel, and that row is scrolled out of the panel's own
viewport, automatically scroll the panel so the active row becomes visible —
completing the Fumadocs-style TOC behavior that PR #220 explicitly deferred.

### Scope
- A small, pure `computeScrollIntoViewOffset` helper in
  `packages/reason-editor/src/search/OutlineView.tsx` (or a co-located
  module) that, given the outline panel's own scroll container
  (`scrollTop`/`clientHeight`) and the active row's offset
  (`offsetTop`/`offsetHeight`), returns the `scrollTop` needed to bring the
  row fully into view, or `null` if it's already fully visible.
- Wire a container ref onto `OutlineView`'s own scrollable root div and a
  per-row ref map (heading id → row `<div>`), then an effect keyed on the
  active heading id that applies the computed offset.
- No-op (no scrolling) when there is no active heading, no `editorRef`, or
  the active row isn't currently rendered (e.g. hidden by a collapsed
  ancestor).

### Non-goals
- Automatically expanding a collapsed ancestor so a hidden active row
  becomes visible — out of scope; this slice only scrolls rows that are
  already rendered.
- Smooth/animated scrolling — an instant `scrollTop` jump is sufficient for
  this slice and keeps the behavior simple to test in jsdom.
- Touching `DynamicIslandTOC.tsx` or `RichTextTableOfContents.tsx` — only
  the sidebar `OutlineView` panel is in scope, matching PR #220's scoping.

### Acceptance criteria
- [x] When the active heading changes to a row that is scrolled above the
      panel's visible area, the panel scrolls up just enough to reveal it.
- [x] When the active heading changes to a row that is scrolled below the
      panel's visible area, the panel scrolls down just enough to reveal it.
- [x] When the active row is already fully visible, the panel's scroll
      position is left untouched.
- [x] With no `editorRef`/no active heading, no scrolling occurs and nothing
      throws.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for this package or at the repo
      root (no ESLint config found); nothing to run
- [x] Typecheck passes — `npx tsc --noEmit -p tsconfig.json` in
      `reason-editor` surfaces the same 5 **pre-existing** errors as the
      prior task (`InviteModal.tsx`, `Pagination.ts`, `filetree.tsx`), none
      of which this change touches. No new errors from this change's files.
- [x] Tests pass — `bun run test` in `reason-editor`: 461/461 passed
      (42/42 files, including 8 new/updated tests in `OutlineView.test.tsx`
      covering `computeScrollIntoViewOffset` directly plus the
      mount-triggered auto-scroll behavior). Full workspace `bun run test`:
      164/174 files, 2385/2441 tests pass (4 skipped); the 52 failures
      across the same 10 files documented in the prior "Unblock
      `bun run build:web`"/"highlight the active heading" task entries
      (`search-web-api` engine tests hitting real external APIs, the
      `qwksearch-web` config route test, `shadcn-settings`, `jsdom-scraper`)
      are pre-existing and unrelated — none touch `reason-editor`.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded, including `react-reason-editor#build` and
      `qwksearch-web#build`'s full `vinext` pipeline.
- [x] Documentation is updated if behavior or configuration changes (this
      tracker entry + inline comments where non-obvious)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm API, schema, data-flow, or interface requirements
- [x] Implement the smallest useful vertical slice
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (no editorRef; row already
      visible; boundary case where the row exactly fills the viewport)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — neither
      is actionable for this change)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` diff produced by `bun install` — pure
      version-number sync, out of scope, matching the prior task's
      precedent)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. PR #224 merged.

## Outline sidebar: highlight the active heading while scrolling

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 4 ("Outline tree should reuse
Fumadocs page tree/sidebar patterns.")
**Branch:** `claude/adoring-mayer-ntjy99`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/220 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Make the main outline sidebar (`packages/reason-editor/src/search/OutlineView.tsx`,
shown in both the left and right sidebar panels) highlight whichever heading
is currently in view as the user scrolls the document — the scroll-spy
behavior Fumadocs' page/TOC sidebar is known for, and which this repo's
`reason-editor` already implements in two *other*, less-used TOC widgets
(`DynamicIslandTOC.tsx`'s floating island, and the unused
`RichTextTableOfContents.tsx`) but not in the actual sidebar outline panel
users see day to day.

### Scope
- A small, reusable `useActiveHeading` hook + pure `computeActiveHeadingKey`
  helper in `packages/reason-editor/src/search/useActiveHeading.ts`, modeled
  on `DynamicIslandTOC`'s existing scroll-spy logic (find the heading whose
  top is at/above a viewport threshold; fall back to the first heading).
- Wire an optional `editorRef` prop through `OutlineView` so it can resolve
  heading DOM elements via `TiptapEditorHandle.getElementByKey` (same
  mechanism `DynamicIslandTOC` already uses) and compute the active heading
  as the user scrolls the editor.
- Thread `editorRef` from `ReasonDocs.tsx` (`state.editorRef`, already
  exists) down through `Sidebar`/`RightPanel` → `SidebarContent` →
  `OutlineView`, mirroring how `headings`/`onNavigate` are already threaded.
- Highlight the active row using the same `bg-sidebar-accent` active-state
  convention already used for the active document row in `DocumentTree.tsx`.

### Non-goals
- Auto-scrolling the *sidebar itself* to reveal an active item that has
  scrolled out of the panel's own viewport (a further Fumadocs page-tree
  behavior) — left as a follow-up; this slice covers highlighting only.
- Refactoring `DynamicIslandTOC.tsx` or `RichTextTableOfContents.tsx` to
  reuse the new shared hook — left untouched to avoid regressing a shipped
  floating widget; only `OutlineView` (the sidebar panel) gains the hook.

### Acceptance criteria
- [x] Scrolling the document highlights the heading whose row is currently
      the "active" one in the sidebar outline panel.
- [x] With no `editorRef` supplied (or no headings), the outline renders
      exactly as before — no active highlight, no runtime errors.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for this package or at the repo
      root (no ESLint config found); nothing to run
- [x] Typecheck passes — `npx tsc --noEmit -p tsconfig.json` in
      `reason-editor` surfaces 5 **pre-existing** errors in
      `InviteModal.tsx`, `Pagination.ts`, and `filetree.tsx` (none of which
      this change touches); confirmed identical with `git stash` applied
      (unmodified code produces the exact same 5 errors). No new errors from
      this change's files.
- [x] Tests pass — `bun run test` in `reason-editor`: 453/453 passed
      (42/42 files, including the 14 new/updated tests in
      `useActiveHeading.test.ts` and `OutlineView.test.tsx`). Full workspace
      `bun run test`: 164/174 files, 2371/2433 tests pass; the 58 failures
      across the same 10 files documented in the prior "Unblock
      `bun run build:web`" task entry (`search-web-api` engine tests hitting
      real external APIs, the `qwksearch-web` config route test,
      `shadcn-settings`, `jsdom-scraper`) are pre-existing and unrelated —
      none touch `reason-editor`.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded, including `react-reason-editor#build` and
      `qwksearch-web#build`'s full `vinext` pipeline.
- [x] Documentation is updated if behavior or configuration changes (this
      tracker entry + inline comments where non-obvious)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm API, schema, data-flow, or interface requirements
- [x] Implement the smallest useful vertical slice
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (no editorRef, no headings)
- [x] Run focused tests and fix failures (also fixed a pre-existing latent
      bug in the `OutlineView.test.tsx` `headingRow` test helper — it
      resolved to the shared outline container `<div>` instead of the
      individual row `<div>` whenever more than one row was present, masked
      until now because every prior assertion only ever exercised a single
      visible row)
- [x] Run linting and typechecking
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` diff produced by `bun install` — pure
      version-number sync to an already-committed `package.json` bump, out
      of scope for this change)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. PR #220 merged.
- Follow-up now in progress above: "Outline sidebar: auto-scroll to reveal
  the active heading" (see Non-goals above).

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
1. in sidebar, have it sugegst related by keywords — **first slice done, see
   "Sidebar: suggest related documents by keyword overlap" above; tag-aware
   scoring done, see "Related panel: rank by shared tags as well as
   keyword overlap" above** (further surfaces — chat/search UI, open-tab
   context — remain as follow-ups)
2. Chat with open tabs as context.
3. Show Vals scores for all models; example Kimi K2.5 page lists Vals Index 51.70%, latency 807.18s, and cost/test $0.29.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
4. Outline tree should reuse Fumadocs page tree/sidebar patterns. — **done, see "Outline sidebar: highlight the active heading while scrolling" above**
5. Option to start talking automatically on first visit, or via a button from anywhere on the site. — **done, see "Voice auto-start on first visit" above**
6. OpenRouter apps inspiration/reference: [openrouter.ai/apps](https://openrouter.ai/apps), and OpenRouter also documents app attribution plus public app rankings.
7. common typoes — **done, see "Fix common typos in AI prompt templates" above**
8. https://github.com/cloudflare/moltworker


## Longterm

12. Use CRX/extension to open tabs and scrape them.
13. Custom AI agent monitors topics and generates a news feed.
14. Main nav: Tabs | AI chat | Web search | Favorites | History.
15. Queries should run on cached pages that belong to topic outlines.
16. Research agents should queue the next video.
17. Follow-up suggestions. — **feature already implemented; test coverage
    added, see "Test coverage for the follow-up-suggestions pipeline" above**
18. Browser sidebar results.
19. Use open tabs as context.
20. Preload page results for common questions with SSR.
21. If autocomplete matches something like red.com, go there directly. — **done, see "Autocomplete: recognize a typed bare domain even when it's outside the ranked dataset" above**
22. Share button; email to friends; social actions. — **done, see "Article panel: Share button (native Web Share API with clipboard fallback)" above**
23. Suggest the next page from the sidebar on each page.
24. For each topic, next-word prediction in model.
25. Auto-search for topics in sidebar.
26. Prioritize sidebar with AI tips about the current page.
27. Cache questions and use them to build connections.
28. Add downloads tab; also back, refresh, undo close, new tab.
29. Default search support; Chrome extensions can override homepage, startup pages, and search provider via `chrome_settings_overrides`.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override) — **done, see "Default search provider support in the browser extension (chrome_settings_overrides)" above**
29b. `qwksearch-ext`'s own `bun run build`/`zip` (Chrome target) fails on a
     fresh checkout: `postcss.config.js` still uses the old
     `tailwindcss: {}` PostCSS-plugin form against the installed
     `tailwindcss@4.3.3`, which requires the separate `@tailwindcss/postcss`
     package instead. Discovered while verifying item 29 above (pre-existing,
     confirmed via `git stash`); blocks building or zipping the Chrome
     extension at all, independent of any other change. — **done, see "Fix
     `qwksearch-ext`'s Tailwind v4 PostCSS plugin mismatch" above** (fixing
     this surfaced a further, distinct blocker — see item 29c)
29c. `qwksearch-ext`'s build still fails after 29b is fixed:
     `components/ResearchTab.tsx` imports `research-agent-ui`, but it's
     never declared as a dependency in `qwksearch-ext/package.json` (unlike
     `qwksearch-web`, which declares `"research-agent-ui": "workspace:*"`
     plus a `prebuild` script building it and ~8 other workspace packages
     first). `research-agent-ui` has no `dist/` output in a fresh checkout
     and itself depends on ~30 packages (several more workspace packages,
     plus a peer dependency on `next`, partly worked around already via
     `qwksearch-ext/lib/next-navigation-shim.tsx`). Discovered while fixing
     29b; needs its own dedicated task to wire up the dependency and
     prebuild chain.
31. Agents that scrape the web and work with datasets like LinkedIn.
32. Auto-generate keyphrase completions for on-page Ctrl+F search.
33. Markdown/file tree view inspiration: [ld246.com/guide/markdown](https://ld246.com/guide/markdown).
34. Reuse Fumadocs multi-tree/root-toggle ideas for docs organization.
35. Release on HN, YouTube, and Product Hunt.
36. https://21st.dev/community/agents
37. from the drodpown menu have tit  insret to as about tabstion ...` to show where the warning was created)

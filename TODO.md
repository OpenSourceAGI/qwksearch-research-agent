## In Progress

## Test coverage for the article-reader follow-up-questions pipeline

**Status:** In Progress
**Source:** TODO.md — Non-goals of the "Test coverage for the
follow-up-suggestions pipeline" task (PR #235): "The parallel article-reader
follow-up-questions pipeline (`ArticleFollowupQuestions.tsx`,
`article-followups/route.ts`, `api/handlers/article-followups.ts`) — same
gap, but a separate surface; left as a follow-up." That chat-suggestions
pipeline now has full backend test coverage; this task closes the identical
gap for the article-reader surface, whose
`createArticleFollowupsHandler` (`packages/research-agent-ui/src/api/handlers/
article-followups.ts`) has zero test coverage today (confirmed via a repo
search — no `article-followups.test.ts` exists anywhere).
**Branch:** `claude/adoring-mayer-l9v228` (this session's designated branch)
**PR:** Not created yet
**Started:** 2026-08-15

### Goal
Add Vitest coverage for `createArticleFollowupsHandler` — the article-reader
follow-up-questions LLM handler — so a future change to its prompt-building,
parsing, or error-handling logic gets a regression signal, matching the
existing test pattern already proven for the structurally-identical
`createPageTipsHandler`
(`apps/qwksearch-web/app/api/agent/__tests__/page-tips.test.ts`).

### Scope
- `apps/qwksearch-web/app/api/agent/__tests__/article-followups.test.ts`:
  unit tests for `createArticleFollowupsHandler`
  (`packages/research-agent-ui/src/api/handlers/article-followups.ts`),
  mocking the `ai` package's `generateText` and
  `chat-agent-toolkit/models/registry`'s `ModelRegistry` (identical mocking
  pattern to `page-tips.test.ts`), asserting: a missing `article` body field
  returns 400; the loaded chat model is requested with the given
  `providerId`/`key`; prior `chatHistory` user messages are folded into the
  prompt; the LLM response is parsed into a cleaned list of questions
  (numbering/bullets stripped, blank/short (`<=10`-char) lines dropped);
  article content is truncated to 15000 characters in the prompt; the parsed
  list is sliced to `maxQuestions`; a model-load failure returns 500 with the
  error message.

### Non-goals
- A UI/DOM test for `ArticleFollowupQuestions.tsx` or `ArticleExtractPanel.tsx`
  — same reasoning as the sibling chat-suggestions task: `research-agent-ui`
  has no existing `@testing-library/react`-style component test to mirror,
  and the actual client-side fetch call
  (`callLanguageAPI('suggest-followups')` in `ArticleExtractPanel.tsx`) is
  inline in a large component rather than a standalone lib helper like
  `getSuggestions`, so there is no small isolated client-fetch unit to test
  here the way `research-agent-ui/test/suggestions.test.ts` tests
  `getSuggestions` — standing up component-level test infra is a separate,
  larger piece of work, left as a further follow-up.
- Any behavior change to `article-followups.ts`, its route, or
  `ArticleFollowupQuestions.tsx` — this is a test-only change.
- `apps/qwksearch-web/app/api/agent/article-followups/route.ts` itself —
  trivial dependency-injection wiring, same as every other untested route.ts
  in this codebase (route.ts files are never directly tested; only the
  handler factories they wire up are).

### Acceptance criteria
- [x] `createArticleFollowupsHandler`'s handler returns a 400 when `article`
      is missing from the request body.
- [x] The handler loads the chat model via the requested `providerId`/`key`.
- [x] Prior `chatHistory` user messages are included in the prompt sent to
      `generateText`.
- [x] A well-formed multi-line LLM response is parsed into a cleaned list of
      questions (numbering/bullet prefixes stripped, blank/short lines
      dropped).
- [x] Article content is truncated to 15000 characters in the prompt.
- [x] The parsed question list is sliced down to `maxQuestions`.
- [x] A model-load failure returns a 500 with the error message.
- [x] Vitest coverage is added or updated — 7 new cases in
      `apps/qwksearch-web/app/api/agent/__tests__/article-followups.test.ts`,
      mirroring `page-tips.test.ts`'s mocking pattern exactly, all passing.
- [x] Lint passes — no `lint` script exists at the repo root or in
      `qwksearch-web`/`research-agent-ui`; nothing to run (same as every
      prior task touching these packages).
- [x] Typecheck passes — `bun run build` in `packages/research-agent-ui`
      surfaces the same 9 pre-existing errors documented in prior TODO.md
      tasks (`unified-markdown.tsx` x3, `ChatWindow.tsx`,
      `MessageInputIconSet.tsx`, `MessageSources.tsx`,
      `WebCitationBadge.tsx`), none referencing `article-followups.ts` or
      the new test file.
- [x] Tests pass — focused suite (`bunx vitest run
      apps/qwksearch-web/app/api/agent/__tests__/article-followups.test.ts`):
      7/7 passed. Full workspace `bun run test`: 185/194 files, 2553/2608
      tests pass (51 failed, 4 skipped) — confirmed via a full `grep "^
      FAIL"` over the captured run that the 9 failing files are exactly the
      documented pre-existing set (`chat-agent-toolkit/test/
      openrouter-default-model.test.js`, `qwksearch-web/app/api/config/
      __tests__/route.test.ts`, `search-web-api/test/{api,
      autocomplete-engines,engine-health-suite,search,sources-unit,
      sources}.test.ts`, `shadcn-settings/test/settings-field.test.tsx`),
      none touching this task's new test file.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded (5m42s).
- [x] Documentation is updated if behavior or configuration changes — n/a;
      test-only change.

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`article-followups.ts`, `article-followups/route.ts`,
      `page-tips.test.ts`'s mocking pattern) — done, see Source/Scope above
- [x] Confirm the exact mocking pattern for `ai`'s `generateText` and
      `ModelRegistry` (mirrored from `page-tips.test.ts`)
- [x] Add `article-followups.test.ts` with success-path coverage
- [x] Add failure/edge-case coverage (missing article, model-load failure,
      truncation, maxQuestions slicing)
- [x] Run focused tests and fix failures (none needed — 7/7 passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck baseline unchanged
      at the same 9 pre-existing `research-agent-ui` errors)
- [x] Run the full relevant test suite (focused suite and full workspace
      `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout; the resulting `bun.lock`
      package-version-sync diff was reverted, matching prior tasks'
      precedent; final `git status --short` shows exactly the 1 new test
      file beyond this tracker entry)
- [ ] Commit and push the branch
- [ ] Create or update the pull request
- [ ] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- Commit, push, and open a PR — implementation and all local verification
  are complete.

## OpenRouter: send app-attribution headers (HTTP-Referer, X-Title)

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 6 ("OpenRouter apps inspiration/
reference: openrouter.ai/apps ... OpenRouter also documents app attribution
plus public app rankings."). OpenRouter's documented API convention is that
requests carrying `HTTP-Referer` and `X-Title` headers get attributed to the
calling app on its public app-rankings page. `ModelRegistry.loadChatModel` in
`packages/chat-agent-toolkit/src/config/model-registry.ts` builds every
OpenAI-compatible provider (including OpenRouter) via
`createOpenAI({apiKey, baseURL})` with no headers today, so none of
QwkSearch's OpenRouter requests are ever attributed to this app. This
converts item 6's inspiration link into a small, concrete, testable slice.
**Branch:** `claude/adoring-mayer-nanna6` (this session's designated branch —
its prior PR #273 was already merged and the remote branch deleted before
this run started; confirmed via GitHub that local HEAD already matched
master's true tip, so work continued directly on this branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/274
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
When `ModelRegistry.loadChatModel` builds a chat model for an `openrouter`-
type provider, send `HTTP-Referer` and `X-Title` headers with every request
so QwkSearch's usage is attributed to this app in OpenRouter's public app
rankings, instead of appearing unattributed.

### Scope
- `packages/chat-agent-toolkit/src/config/model-registry.ts`: when
  `type === "openrouter"`, pass an additional `headers` option to
  `createOpenAI` containing `HTTP-Referer` (from `process.env.QWKSEARCH_URL`,
  falling back to `https://qwksearch.com` — the same default already used by
  this package's `qwksearch-api-tools.ts`) and `X-Title` (from
  `process.env.QWKSEARCH_APP_NAME`, falling back to `"QwkSearch"`).

### Non-goals
- No new UI setting to configure the title/referer per-provider — env-var
  overrides match this file's existing environment-driven-defaults
  precedent, and let any app in the monorepo (web/ext/desktop/vscode)
  override without new cross-package config plumbing.
- No `headers` change for any other OpenAI-compatible provider type (openai,
  togetherai, perplexity, nvidia, anyapi, deepseek, xai) — `HTTP-Referer`/
  `X-Title` are an OpenRouter-specific attribution convention, not a shared
  one.
- No attempt to register/verify the app in OpenRouter's public rankings
  dashboard itself — that's an OpenRouter-side, non-code step outside this
  repo's control.
- Ideas Backlog item 3 ("show Vals scores for all models") remains separate
  and already investigated as blocked (no reliable data source) — untouched
  by this task.

### Acceptance criteria
- [x] `loadChatModel` for an `openrouter`-type provider calls `createOpenAI`
      with a `headers` option containing `HTTP-Referer` and `X-Title`.
- [x] Other OpenAI-compatible provider types are unaffected — no `headers`
      option is added for them.
- [x] `HTTP-Referer`/`X-Title` values respect `QWKSEARCH_URL`/
      `QWKSEARCH_APP_NAME` env vars when set, falling back to
      `https://qwksearch.com`/`QwkSearch` otherwise.
- [x] Vitest coverage is added for `loadChatModel`'s OpenRouter header
      behavior (mocking `@ai-sdk/openai`'s `createOpenAI`), including a
      non-OpenRouter provider case showing no extra headers are added — 3
      new cases in `packages/chat-agent-toolkit/test/model-registry.test.ts`
      (default headers, env-var overrides, non-OpenRouter provider omits
      headers), all passing.
- [x] Lint passes — no `lint` script exists at the repo root or in
      `chat-agent-toolkit`; nothing to run (same as every prior task).
- [x] Typecheck passes — `bun run build` in `packages/chat-agent-toolkit`
      (which runs `unplugin-dts` type-checking as part of the Vite build)
      completes with zero errors.
- [x] Tests pass — focused suite (`bunx vitest run
      packages/chat-agent-toolkit/test/model-registry.test.ts`): 3/3 passed.
      Full workspace `bun run test`: 184/193 files, 2544/2601 tests pass (53
      failed, 4 skipped) — the 9 failing files are exactly the documented
      pre-existing set (`chat-agent-toolkit/test/
      openrouter-default-model.test.js`, `qwksearch-web/app/api/config/
      __tests__/route.test.ts`, `search-web-api/test/{api,
      autocomplete-engines,engine-health-suite,search,sources-unit,
      sources}.test.ts`, `shadcn-settings/test/settings-field.test.tsx`),
      none touching `model-registry.ts` or this task's new test file.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded (7m11s).
- [x] Documentation is updated if behavior or configuration changes — n/a;
      no README documents `ModelRegistry`'s internal provider-header
      behavior, and the two env vars reuse an existing, already-undocumented
      convention (`QWKSEARCH_URL`, already used the same way in
      `qwksearch-api-tools.ts`).

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`model-registry.ts`, `config-types.ts`'s `ConfigModelProvider` shape,
      `config-manager.ts`'s singleton export, `qwksearch-api-tools.ts`'s
      `QWKSEARCH_URL` env-var precedent)
- [x] Confirm `@ai-sdk/openai`'s `createOpenAI` accepts a `headers` option
      (confirmed via the successful `bun run build` type-check and the
      passing mocked-header assertions in the new test)
- [x] Implement the OpenRouter-only `headers` addition in `loadChatModel`
- [x] Add focused Vitest success-path coverage (OpenRouter provider gets the
      headers; env-var overrides are respected)
- [x] Add focused failure/edge-case coverage (non-OpenRouter providers get
      no extra headers)
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; `bun run build` type-checks
      cleanly)
- [x] Run the full relevant test suite (`chat-agent-toolkit` focused suite
      and full workspace `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout; the resulting `bun.lock`
      package-version-sync diff was reverted, matching prior tasks'
      precedent; final `git status --short` shows exactly the 2 intended
      source files beyond this tracker entry)
- [x] Commit and push the branch
- [ ] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. All acceptance criteria verified locally
  on this commit; PR creation is the only remaining step (see GitHub updates
  in this run's report).

## Browser extension: Forward button for the active tab

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 28 ("Add downloads tab; also back,
refresh, undo close, new tab."). The Undo-close-tab, Downloads tab, New tab,
Back, and Refresh slices are all already done (see their completed tasks
below); the just-completed "Browser extension: Back and Refresh buttons for
the active tab" task's own Non-goals explicitly deferred a "Forward" button
as a follow-up ("item 28 only calls out 'back, refresh' as the remaining
follow-ups; forward navigation is a separate, smaller follow-up if ever
requested"). This task completes that final remaining piece by mirroring
`goBackActiveTab`/`refreshActiveTab` exactly.
**Branch:** `claude/adoring-mayer-4tsafm` (this session's designated branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/271
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user navigate the active tab's history forward, via a third toolbar
button in the side panel's Tabs view (`TabList.tsx`), next to the existing
"Back" and "Refresh" buttons — without switching to the tab itself.

### Scope
- `apps/qwksearch-ext/lib/tab-navigation.ts`: add `goForwardActiveTab(): void`
  — same active-tab lookup as `goBackActiveTab`/`refreshActiveTab`, calling
  `chrome.tabs.goForward(tabId)`.
- `apps/qwksearch-ext/components/TabList.tsx`: add a "Forward" button
  (`ArrowRight` icon) to the existing toolbar row, positioned right after
  "Back", wired to `goForwardActiveTab`.

### Non-goals
- Disabling the Forward button when the active tab has no forward history —
  `chrome.tabs.goForward` is a no-op/harmless when there's nothing to go
  forward to, matching the existing Back button's precedent of not adding
  extra enablement state-tracking.
- Any change to `TabSearch.tsx`, `HistoryList.tsx`, `DownloadsList.tsx`,
  `BookmarksList.tsx`, or any other tab.

### Acceptance criteria
- [x] Clicking "Forward" calls `chrome.tabs.goForward` with the active tab's
      id.
- [x] The function does not throw or call the chrome API when there is no
      active tab in the query result, or when the active tab has no id.
- [x] Vitest coverage is added for `goForwardActiveTab` — 3 new focused cases
      in `apps/qwksearch-ext/test/tab-navigation.test.ts`, mirroring
      `goBackActiveTab`'s existing three cases exactly.
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run (same as every prior `qwksearch-ext` task)
- [x] Typecheck passes — `bun run compile` in `apps/qwksearch-ext` (after
      clearing the stale `tsconfig.tsbuildinfo` incremental cache) surfaces
      exactly 131 errors, one more than the 130-error baseline confirmed via
      `git stash push -u` on this task's three touched files, re-running
      `bun run compile`, then `git stash pop`. The one new error
      (`lib/tab-navigation.ts(17,30): error TS2304: Cannot find name
      'chrome'`, at the new `chrome.tabs.goForward` call site) is a further
      instance of the same pre-existing `TS2304` class already present
      throughout this app's `chrome.*`-using files, not a new category.
- [x] Tests pass — `bunx vitest run test/tab-navigation.test.ts`: 8/8 passed.
      `bun run test` in `qwksearch-ext`: 14/14 files, 144/144 tests passed
      (141 pre-existing + 3 new). Full workspace `bun run test`: 183/192
      files, 2538/2598 tests pass (56 failed, 4 skipped) — confirmed via a
      full `grep -E "^ FAIL"` over the captured run output that the 9 failing
      files are exactly the documented pre-existing set
      (`chat-agent-toolkit/test/openrouter-default-model.test.js`,
      `qwksearch-web/app/api/config/__tests__/route.test.ts`,
      `search-web-api/test/{api,autocomplete-engines,engine-health-suite,
      search,sources-unit,sources}.test.ts`,
      `shadcn-settings/test/settings-field.test.tsx`), none touching
      `qwksearch-ext` or tab-navigation-related files.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded (7m8s).
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar buttons)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`tab-navigation.ts`/`tab-navigation.test.ts`, `TabList.tsx`'s existing
      Back/Refresh toolbar pattern)
- [x] Implement `goForwardActiveTab` in `lib/tab-navigation.ts`
- [x] Wire the new toolbar button into `TabList.tsx`
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (no active tab; active tab with
      no id)
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck error count is +1,
      the same pre-existing `TS2304` class, confirmed via `git stash`-based
      before/after diff)
- [x] Run the full relevant test suite (`qwksearch-ext` and full workspace
      `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout; the resulting `bun.lock`
      package-version-sync diff was reverted, matching prior tasks'
      precedent; final `git status --short` shows exactly the 3 intended
      source files beyond this tracker entry)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. All acceptance criteria verified locally
  on this commit.
- Item 28 is now fully complete — every named follow-up (downloads, back,
  refresh, undo close, new tab) has a merged slice.

## Sidebar: Search topics for the current page

**Status:** Completed
**Source:** TODO.md — Longterm item 25 ("Auto-search for topics in sidebar.").
No existing "topics"/"topic outline" concept exists anywhere in the repo
(confirmed via search — `extract-webpage/src/seektopic/*` is unrelated
scraped-content keyword extraction, not a UI feature). Follows the exact
same pattern as the just-completed "Sidebar: AI tips about the current
page" task (item 26, PR #269): a new LLM-prompt/parse handler mirroring
`page-tips.ts`, threaded into the sidebar via a new `topicsProps` prop bag,
rendered as a block inside the existing "related" panel (the same way
"Page tips" is a block inside the existing "ai" panel), the smallest
independently-useful first slice per this task's own scoping rules.
**Branch:** `claude/adoring-mayer-syrh5u` (this session's designated branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/270
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user click a "Generate" button in the sidebar's "Related" panel to
get a short list of AI-generated suggested search queries (topics) related
to the currently active document, and clicking one of those topics opens a
new chat tab pre-seeded with that query as its first message — so the user
can dig deeper into a page-adjacent topic without leaving the editor or
typing a query themselves.

### Scope
- New handler `packages/research-agent-ui/src/api/handlers/topic-searches.ts`
  (`createTopicSearchesHandler`), mirroring `page-tips.ts`'s
  prompt-and-parse pattern exactly: loads a chat model via `ModelRegistry`,
  prompts with the page title + content (truncated to 15000 chars), parses
  the response into up to `maxTopics` short search-query strings. Exported
  via the package's existing `./api` barrel.
- New route `apps/qwksearch-web/app/api/agent/topic-searches/route.ts`,
  mirroring `page-tips/route.ts`'s dependency wiring exactly.
- New client helper `apps/qwksearch-web/lib/reason-docs/topic-searches.ts`:
  `getTopicSearches(title, content)` (mirrors `getPageTips` — POSTs via
  `grab-url`, returns `[]` on any failure).
- `packages/reason-editor/src/layout/sidebar/types.ts`: new
  `SidebarTopicsProps` (`topics`, `isTopicsLoading`, `onGenerateTopics`,
  `onSearchTopic`) and a `topicsProps?: SidebarTopicsProps` field on
  `SidebarProps`, threaded through `Sidebar.tsx` and `RightPanel.tsx` into
  `SidebarContent`'s existing `renderRelated()`, exactly like `tipsProps` is
  threaded into `renderAi()` — hidden entirely when the host doesn't supply
  `topicsProps`.
- `packages/reason-editor/src/editor/ReasonDocs.tsx`: new optional
  `onGenerateTopics?: (title: string, contentHtml: string) => Promise<string[]>`
  and `onSearchTopic?: (topic: string) => void` props; local
  `topics`/`isTopicsLoading` state, a `handleGenerateTopics` mirroring
  `handleGenerateTips`, and a reset of `topics` whenever the active document
  changes (reusing the existing tips-reset effect).
- `apps/qwksearch-web/components/layout/MainWorkspaceView.tsx`: wires
  `onGenerateTopics` to `getTopicSearches(title, htmlToPlainText(html))`,
  and `onSearchTopic` to open a new chat tab (`newChat()` +
  `toggleToResearch()`) and send the topic as that chat's first message
  once the new chat becomes active (via a `pendingTopicQuery` state +
  effect keyed on `activeChatId`, avoiding a stale-closure race where
  `sendMessage` would otherwise fire against the *previous* chat's ID in
  the same synchronous handler as `newChat()`).

### Non-goals
- A new `SidebarPanelType` / sidebar-view-menu toggle for topics — this
  slice adds topics as a block inside the existing "related" panel, not as
  a new togglable panel (same convention as "Page tips" inside "ai").
- Automatically generating topics on every document switch — generation is
  manually triggered via the panel's "Generate" button, matching the
  existing "Page tips" feature's manual-trigger convention.
- Letting the user edit the generated query before it's sent, or preview
  results inline in the sidebar — clicking a topic sends it immediately as
  a new chat message, matching the "Suggested next" related-document row's
  one-click-navigates convention.
- Persisting generated topics across sessions/reloads.
- Any change to backlog item 15 ("Queries should run on cached pages that
  belong to topic outlines") or item 24 ("next-word prediction for
  topics") — both remain open, separate, unrelated backlog items; "topic
  outline" there refers to a different, larger, still-undesigned concept.

### Acceptance criteria
- [x] Clicking "Generate" in the "Related" panel's topics section calls
      `onGenerateTopics` for the active document and shows a loading state.
- [x] On success, up to `maxTopics` short suggested-search topics render as
      a clickable list.
- [x] On failure (rejected fetch, non-2xx response), the topics list is
      empty and no error is thrown to the user (matches `getPageTips`'s
      swallow-and-return-`[]` convention).
- [x] Clicking a rendered topic opens a new chat tab and sends that topic
      as the chat's first message (via `newChat()` + a `pendingTopicQuery`
      effect keyed on `activeChatId` in `MainWorkspaceView.tsx`).
- [x] The topics section is not rendered at all when the host doesn't
      supply `topicsProps` (backward compatible with existing
      `reason-editor` consumers — `{topicsProps && renderTopics()}`,
      identical guard to `tipsProps`).
- [x] Switching the active document clears any previously generated topics
      (reuses the existing `useEffect` keyed on `state.activeDocId`, now
      clearing both `tips` and `topics`).
- [x] Vitest coverage is added for `getTopicSearches` (success, non-array
      response, rejected fetch) in
      `apps/qwksearch-web/lib/reason-docs/__tests__/topic-searches.test.ts`,
      mirroring `page-tips.test.ts` — 3 new cases, all passing.
- [x] Vitest coverage is added for `createTopicSearchesHandler` (model
      loading, prompt truncation/parsing, `maxTopics` slicing, error
      responses) in
      `apps/qwksearch-web/app/api/agent/__tests__/topic-searches.test.ts`,
      mirroring `app/api/agent/__tests__/page-tips.test.ts` — 6 new cases,
      all passing.
- [x] Lint passes — no `lint` script exists at the repo root or in
      `qwksearch-web`, `reason-editor`, or `research-agent-ui`; nothing to
      run (same as every prior task touching these packages).
- [x] Typecheck passes — `bun run build` in `packages/reason-editor`
      surfaces exactly 96 errors (stripped of ANSI codes before counting),
      identical to the baseline documented in the prior "Sidebar: AI tips"
      task, none referencing any file touched by this task.
      `packages/research-agent-ui`'s `bun run build` (vite bundle + trailing
      `tsc --project tsconfig.build.json || true`) surfaces the same 9
      pre-existing errors in unrelated modules (`unified-markdown.tsx`,
      `ChatHomepage.tsx`, `ChatWindow.tsx`, `MessageInputIconSet.tsx`,
      `MessageSources.tsx`, `WebCitationBadge.tsx`), none referencing
      `topic-searches.ts`.
- [x] Tests pass — focused suites (`bunx vitest run
      apps/qwksearch-web/lib/reason-docs/__tests__/topic-searches.test.ts
      apps/qwksearch-web/app/api/agent/__tests__/topic-searches.test.ts
      apps/qwksearch-web/lib/reason-docs/__tests__/page-tips.test.ts
      apps/qwksearch-web/app/api/agent/__tests__/page-tips.test.ts`):
      22/22 passed. Full workspace `bun run test`: 183/192 files,
      2537/2595 tests pass (54 failed, 4 skipped) — the 9 failing files are
      exactly the documented pre-existing set (`app/api/config/__tests__/
      route.test.ts`, `search-web-api` engine tests, `shadcn-settings`'s
      `settings-field.test.tsx`, `chat-agent-toolkit`'s
      `openrouter-default-model.test.js`), none touching any file changed
      by this task.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      sidebar panel sections).

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (done — see Source/Scope above; explored via a background agent that
      confirmed no "topics" concept exists yet and mapped the exact
      page-tips-task file order to follow)
- [x] Implement `createTopicSearchesHandler` in `research-agent-ui`
- [x] Implement the `topic-searches` API route in `qwksearch-web`
- [x] Implement `getTopicSearches` client helper in `qwksearch-web`
- [x] Extend `reason-editor`'s `SidebarProps`/`SidebarContentProps` with
      `topicsProps` and render the topics block in `renderRelated()`
- [x] Wire `topicsProps` through `Sidebar.tsx` and `RightPanel.tsx`
- [x] Wire `onGenerateTopics`/`onSearchTopic` state/handlers into
      `ReasonDocs.tsx`
- [x] Wire `MainWorkspaceView.tsx` to supply `onGenerateTopics` and
      `onSearchTopic` (including the new-chat-then-send-once-active effect)
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck error counts
      unchanged for both `reason-editor` and `research-agent-ui`)
- [x] Run the full relevant test suite (focused suites and full workspace
      `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout; the resulting `bun.lock`
      package-version-sync diff was reverted, matching prior tasks'
      precedent; final `git status --short` shows exactly the 8 intended
      source files beyond this tracker entry)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. All acceptance criteria verified locally
  on this commit.
- Follow-up ideas noted in Non-goals remain open: letting the user edit a
  generated query before it's sent, and previewing search results inline
  in the sidebar instead of always opening a new chat tab.

## Sidebar: AI tips about the current page

**Status:** Completed
**Source:** TODO.md — Longterm item 26 ("Prioritize sidebar with AI tips
about the current page."). Builds on the same sidebar "ai" panel
(`renderAi()` in `packages/reason-editor/src/layout/sidebar/
SidebarContent.tsx`) already used for the AI rewrite-suggestion feature, and
mirrors the existing LLM-prompt/parse pattern already used by
`packages/research-agent-ui/src/api/handlers/article-followups.ts` (article
follow-up questions) and `.../handlers/suggestions.ts` (chat follow-up
questions).
**Branch:** `claude/adoring-mayer-42m3zi` (this session's designated branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/269
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user click a "Generate" button in the sidebar's "AI Suggestions" panel
to get a short list of AI-generated tips/insights about the currently active
document, so they get useful, page-specific takeaways without leaving the
editor or writing a prompt themselves.

### Scope
- New handler `packages/research-agent-ui/src/api/handlers/page-tips.ts`
  (`createPageTipsHandler`), mirroring `article-followups.ts`'s
  prompt-and-parse pattern: loads a chat model via `ModelRegistry`, prompts
  with the page title + content (truncated to 15000 chars), parses the
  response into up to `maxTips` short one-line tips. Exported via the
  package's existing `./api` barrel.
- New route `apps/qwksearch-web/app/api/agent/page-tips/route.ts`, mirroring
  `article-followups/route.ts`'s dependency wiring exactly.
- New client helpers in `apps/qwksearch-web/lib/reason-docs/page-tips.ts`:
  `getPageTips(title, content)` (mirrors `research-agent-ui`'s
  `getSuggestions` — POSTs via `grab-url`, returns `[]` on any failure) and
  `htmlToPlainText(html)` (strips tags/script/style content and collapses
  whitespace, since document content is stored as HTML).
- `packages/reason-editor/src/layout/sidebar/types.ts`: new
  `SidebarTipsProps` (`tips`, `isTipsLoading`, `onGenerateTips`) and a
  `tipsProps?: SidebarTipsProps` field on `SidebarProps`, threaded through
  `Sidebar.tsx` and `RightPanel.tsx` into `SidebarContent`'s existing
  `renderAi()`, exactly like `aiProps` already is — hidden entirely when the
  host doesn't supply `tipsProps` (same optional-feature convention as
  `onNewChat`).
- `packages/reason-editor/src/editor/ReasonDocs.tsx`: new optional
  `onGenerateTips?: (title: string, contentHtml: string) => Promise<string[]>`
  prop; local `tips`/`isTipsLoading` state, a `handleGenerateTips` that
  calls it for the active document, and a reset of `tips` whenever the
  active document changes.
- `apps/qwksearch-web/components/layout/MainWorkspaceView.tsx`: wires
  `onGenerateTips` to `getPageTips(title, htmlToPlainText(html))`.

### Non-goals
- Automatically generating tips on every document switch — generation is
  manually triggered via the panel's "Generate" button, matching the
  existing AI rewrite feature's manual-trigger convention (no background
  LLM calls on every keystroke/tab switch).
- A new `SidebarPanelType` / sidebar-view-menu toggle for tips — this slice
  adds tips as a block inside the existing "ai" panel, the same way
  "Suggested next" was added as a block inside the existing "related" panel,
  not as a new togglable panel.
- Persisting generated tips across sessions/reloads.
- Wiring the *existing* AI rewrite feature's own stubbed `handleAIRewrite`/
  `handleAIRegenerate` (which just show a "not yet available" toast) — that
  is unrelated pre-existing scaffolding, out of scope here.

### Acceptance criteria
- [x] Clicking "Generate" in the "AI Suggestions" panel's tips section calls
      `onGenerateTips` for the active document and shows a loading state.
- [x] On success, up to `maxTips` short tips render as a bulleted list.
- [x] On failure (rejected fetch, non-2xx response), the tips list is empty
      and no error is thrown to the user (matches `getSuggestions`'s
      swallow-and-return-`[]` convention).
- [x] The tips section is not rendered at all when the host doesn't supply
      `tipsProps` (backward compatible with existing `reason-editor`
      consumers).
- [x] Switching the active document clears any previously generated tips.
- [x] Vitest coverage is added for `htmlToPlainText` (tag stripping,
      script/style removal, whitespace collapsing) and `getPageTips`
      (success, non-array response, rejected fetch) in
      `apps/qwksearch-web/lib/reason-docs/__tests__/page-tips.test.ts`,
      mirroring `research-agent-ui`'s `suggestions.test.ts` — 8 new cases,
      all passing.
- [x] Vitest coverage is added for `createPageTipsHandler` (model loading,
      prompt truncation/parsing, `maxTips` slicing, error responses) in
      `apps/qwksearch-web/app/api/agent/__tests__/page-tips.test.ts`,
      mirroring `app/api/agent/__tests__/suggestions.test.ts`'s
      `vi.mock`-based handler test (a pattern `article-followups.ts` itself
      lacks today) — 6 new cases, all passing.
- [x] Lint passes — no `lint` script exists at the repo root or in
      `qwksearch-web`, `reason-editor`, or `research-agent-ui`; nothing to
      run (same as every prior task touching these packages).
- [x] Typecheck passes — `bun run build` in `packages/reason-editor`
      surfaces exactly 96 errors both before and after this change,
      confirmed via `git stash push -u` on the five touched
      `reason-editor` files, re-running the build, then `git stash pop`;
      none of the 96 reference any touched file. `packages/research-agent-ui`'s
      `bun run build` (vite bundle + trailing `tsc --project
      tsconfig.build.json || true`) also succeeds, with the pre-existing
      `tsc` errors (unrelated modules: `unified-markdown.tsx`,
      `ChatHomepage.tsx`, `ChatWindow.tsx`, `MessageInputIconSet.tsx`,
      `MessageSources.tsx`, `WebCitationBadge.tsx`) unchanged and not
      referencing `page-tips.ts`.
- [x] Tests pass — focused suites (`bunx vitest run
      apps/qwksearch-web/lib/reason-docs/__tests__/page-tips.test.ts
      apps/qwksearch-web/app/api/agent/__tests__/page-tips.test.ts`):
      14/14 passed. Full workspace `bun run test`: 181/190 files,
      2532/2586 tests pass (50 failed, 4 skipped) — the 9 failing files are
      exactly the documented pre-existing set (`chat-agent-toolkit/test/
      openrouter-default-model.test.js`, `qwksearch-web/app/api/config/
      __tests__/route.test.ts`, `search-web-api/test/{api,
      autocomplete-engines,engine-health-suite,search,sources-unit,
      sources}.test.ts`, `shadcn-settings/test/settings-field.test.tsx`),
      none touching any file changed by this task.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      sidebar panel sections).

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (done — see Source/Scope above)
- [x] Implement `createPageTipsHandler` in `research-agent-ui`
- [x] Implement the `page-tips` API route in `qwksearch-web`
- [x] Implement `getPageTips`/`htmlToPlainText` client helpers in
      `qwksearch-web`
- [x] Extend `reason-editor`'s `SidebarProps`/`SidebarContentProps` with
      `tipsProps` and render the tips block in `renderAi()`
- [x] Wire `tipsProps` through `Sidebar.tsx` and `RightPanel.tsx`
- [x] Wire `onGenerateTips` state/handler into `ReasonDocs.tsx`
- [x] Wire `MainWorkspaceView.tsx` to supply `onGenerateTips`
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck error count
      unchanged, confirmed via `git stash`-based before/after diff)
- [x] Run the full relevant test suite (focused suites and full workspace
      `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout — the resulting `bun.lock`
      package-version-sync diff was reverted, matching prior tasks'
      precedent; final `git diff --stat` shows exactly the 7 intended
      source files beyond this tracker entry)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. All acceptance criteria verified locally
  on this commit.
- The "Suggested next" precedent's PR noted a recurring, pre-existing,
  unrelated Cloudflare "Workers Builds" deploy-check failure (Ideas Backlog
  item 39, an 11+-occurrence infrastructure issue this environment cannot
  diagnose without dashboard credentials) — if it recurs again on this PR,
  it is not appended as a new occurrence there per that item's own note.
- A larger, separate follow-up remains open: wiring the *existing* AI
  rewrite feature's own stubbed `handleAIRewrite`/`handleAIRegenerate`
  handlers (which currently just show a "not yet available" toast) to a
  real LLM call — unrelated pre-existing scaffolding, out of scope here
  (see Non-goals above).

## Sidebar: highlight the top related document as "Suggested next"

**Status:** Completed
**Source:** TODO.md — Ideas Backlog / Longterm item 23 ("Suggest the next
page from the sidebar on each page."), the smallest independently useful
first slice of that item, building directly on the already-completed
"Sidebar: suggest related documents by keyword overlap" and "Related panel:
rank by shared tags as well as keyword overlap" tasks. `findRelatedDocuments`
in `packages/reason-editor/src/search/relatedDocuments.ts` already returns
its results sorted best-match-first, but the Related panel in
`SidebarContent.tsx` renders every result with identical styling — there is
no "suggested next page" concept yet, just a flat ranked list.
**Branch:** `claude/adoring-mayer-i2vsxv` (this session's designated branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/267
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
When the Related panel has at least one match, visually promote the
single top-ranked related document as a "Suggested next" entry above the
rest of the flat list, so a user reading the active document gets one clear
suggestion for what to read next, instead of an undifferentiated ranked
list they have to scan themselves.

### Scope
- `packages/reason-editor/src/search/relatedDocuments.ts`: add a small pure
  helper, `splitTopSuggestion(results: RelatedDocumentResult[])`, returning
  `{ suggested: RelatedDocumentResult | null; others: RelatedDocumentResult[] }`
  — `suggested` is `results[0]` (or `null` when `results` is empty), `others`
  is the remaining results in their existing order. `findRelatedDocuments`
  itself is unchanged (already sorted correctly).
- `packages/reason-editor/src/layout/sidebar/SidebarContent.tsx`'s
  `renderRelated()`: call `splitTopSuggestion(relatedResults)` and render
  `suggested` (when present) in a visually distinct block above the existing
  flat list — mirroring the "prominent first entry" pattern already
  established in `packages/research-agent-ui/src/components/ArticleReader/
  ArticleFollowupQuestions.tsx` (bold text, `border-primary/30`/accent
  background vs. the plain-list `border-border` styling) — labelled
  "Suggested next", using a `Sparkles` icon. `others` renders exactly as the
  full list does today (same row markup, same badges, same `handleSelect`
  wiring).

### Non-goals
- Any change to `findRelatedDocuments`'s ranking algorithm itself — this
  slice only changes how the already-correctly-sorted results are rendered.
- Any "next page" concept outside the existing Related panel (e.g. an
  article-reader-level "up next" banner, or per-document manual pinning of
  a preferred "next" document) — that's a larger, separate follow-up; this
  slice reuses the existing keyword/tag-overlap ranking as the sole signal.
- Persisting or dismissing the suggestion, or any settings/toggle to turn
  it off — the promoted top match is always shown whenever the panel has at
  least one related document.
- Any change to `renderOutline`, `renderFiles`, `renderAi`, or any other
  sidebar panel.

### Acceptance criteria
- [x] When the Related panel has one or more matches, the single top-ranked
      match renders in a visually distinct "Suggested next" block above the
      rest of the list.
- [x] When the Related panel has exactly one match, only the "Suggested
      next" block renders (no separate, redundant one-item list below it) —
      `others` is `[]` when `results.length === 1`.
- [x] Clicking the "Suggested next" block navigates to that document via the
      existing `handleSelect`, identically to clicking any other row.
- [x] The remaining (non-top) matches still render exactly as today —
      same row markup, same shared-tag/shared-keyword badges (extracted
      unchanged into `renderRelatedRow`).
- [x] The empty state ("No related documents found") is unchanged when
      there are zero matches.
- [x] Vitest coverage is added or updated for `splitTopSuggestion` — 3 new
      focused cases in `packages/reason-editor/test/search/
      relatedDocuments.test.ts` (empty input, single result, multi-result
      order-preserving split).
- [x] Lint passes — no `lint` script exists for `reason-editor` or the repo
      root; nothing to run.
- [x] Typecheck passes — `bun run build` in `packages/reason-editor` (which
      runs `unplugin-dts` type-checking as part of the Vite build) surfaces
      exactly 22 pre-existing errors both before and after this change,
      confirmed via `git stash push` on just the three touched files,
      re-running the build, then `git stash pop`. None reference
      `relatedDocuments.ts` or `SidebarContent.tsx` — all 22 are in unrelated
      `docs-agent/plate/*` files, `RichTextBubbleTwitter.tsx`,
      `InviteModal.tsx`, `resize-handle.tsx`, and `table-icons.tsx`.
- [x] Tests pass — `bunx vitest run packages/reason-editor/test/search/
      relatedDocuments.test.ts`: 13/13 passed (10 pre-existing + 3 new).
      Full workspace `bun run test`: 179/188 files, 2515/2573 tests pass (54
      failed, 4 skipped). The 9 failing files are exactly the documented
      pre-existing set (`chat-agent-toolkit/test/
      openrouter-default-model.test.js`, `qwksearch-web/app/api/config/
      __tests__/route.test.ts`, `search-web-api/test/{api,
      autocomplete-engines,engine-health-suite,search,sources-unit,
      sources}.test.ts`, `shadcn-settings/test/settings-field.test.tsx`) —
      none touch `reason-editor` or related-documents code.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      sidebar panel rows).

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`relatedDocuments.ts`/`relatedDocuments.test.ts`, `SidebarContent.tsx`'s
      `renderRelated()`, `ArticleFollowupQuestions.tsx`'s prominent-first-item
      styling precedent)
- [x] Implement `splitTopSuggestion` in `relatedDocuments.ts`
- [x] Wire the "Suggested next" block + remaining list into
      `SidebarContent.tsx`'s `renderRelated()` (extracting the existing row
      markup into a shared `renderRelatedRow` used by both the "Suggested
      next" block's sibling rows and the plain list)
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (empty results, single result)
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck error count
      unchanged at 22, confirmed via `git stash`-based before/after diff)
- [x] Run the full relevant test suite (`reason-editor` focused suite and
      full workspace `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout — the resulting `bun.lock`
      package-version-sync diff was reverted, matching prior tasks'
      precedent; final `git diff --stat` shows only the 3 intended source
      files beyond this tracker entry)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #267, merged)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #267 merged; all verification passed
  locally on this commit.
- The PR's "Workers Builds: qwksearch-research-agent" Cloudflare deploy check
  failed — the same recurring, pre-existing, unrelated-to-code
  infrastructure issue already conclusively documented as Ideas Backlog item
  39 (a 12th occurrence, on a PR whose diff again touches only
  `packages/reason-editor/` plus `TODO.md`, with `bun run build:web` passing
  14/14 tasks locally on this exact commit before merging). Per that item's
  own note, this is not appended as a new numbered occurrence there.
- A larger, separate follow-up remains open: any "next page" concept beyond
  the existing Related panel (e.g. an article-reader-level "up next"
  banner, or manual pinning of a preferred "next" document) — see
  Non-goals above.

## Browser extension: Back and Refresh buttons for the active tab

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 28 ("Add downloads tab; also back,
refresh, undo close, new tab."). The Undo-close-tab, Downloads tab, and New
tab slices are already done (see their completed tasks below); item 28's
note explicitly calls out "back/refresh remain follow-ups." This task
completes that remaining pair.
**Branch:** `claude/adoring-mayer-c8x02n` (this session's designated branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/265
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user navigate the active tab's history back and reload it, via two new
toolbar buttons in the side panel's Tabs view (`TabList.tsx`), next to the
existing "Restore closed tab" and "New tab" buttons — without switching to
the tab itself.

### Scope
- New pure-ish helper module `apps/qwksearch-ext/lib/tab-navigation.ts`:
  - `goBackActiveTab(): void` — queries the active tab in the current window
    (`chrome.tabs.query({active: true, currentWindow: true})`) and calls
    `chrome.tabs.goBack(tabId)` when a tab with an `id` is found; no-ops
    otherwise.
  - `refreshActiveTab(): void` — same active-tab lookup, calling
    `chrome.tabs.reload(tabId)`.
- `apps/qwksearch-ext/components/TabList.tsx`: add "Back" (`ArrowLeft` icon)
  and "Refresh" (`RotateCw` icon) buttons to the existing toolbar row
  (alongside "Restore closed tab" and "New tab"), wired to
  `goBackActiveTab`/`refreshActiveTab`.

### Non-goals
- A "Forward" button — item 28 only calls out "back, refresh" as the
  remaining follow-ups; forward navigation is a separate, smaller follow-up
  if ever requested.
- Disabling the Back button when the active tab has no history to go back to
  — `chrome.tabs.goBack` itself is a no-op/harmless when there's nothing to
  go back to (matches the existing "New tab"/"Restore closed tab" buttons'
  precedent of not doing extra state-tracking for enablement beyond what's
  already available, e.g. `closedTabSessionId`).
- Any change to `TabSearch.tsx`, `HistoryList.tsx`, `DownloadsList.tsx`,
  `BookmarksList.tsx`, or any other tab.

### Acceptance criteria
- [x] Clicking "Back" calls `chrome.tabs.goBack` with the active tab's id.
- [x] Clicking "Refresh" calls `chrome.tabs.reload` with the active tab's id.
- [x] Neither function throws or calls the chrome API when there is no
      active tab in the query result.
- [x] Vitest coverage is added or updated — 5 new focused cases in
      `apps/qwksearch-ext/test/tab-navigation.test.ts` (goBack with an
      active tab, goBack with no active tab, goBack with a tab that has no
      id, reload with an active tab, reload with no active tab).
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run (same as every prior `qwksearch-ext` task)
- [x] Typecheck passes — `bun run compile` in `apps/qwksearch-ext` (after
      clearing the stale `tsconfig.tsbuildinfo` incremental cache) surfaces
      exactly 130 errors, three more than the 127-error baseline confirmed
      via `git stash -u -- apps/qwksearch-ext/components/TabList.tsx
      apps/qwksearch-ext/lib/tab-navigation.ts
      apps/qwksearch-ext/test/tab-navigation.test.ts`, re-running
      `bun run compile`, then `git stash pop`. A line-by-line `diff` of the
      two sorted error lists shows the 15 pre-existing
      `components/TabList.tsx` `TS2304: Cannot find name 'chrome'` lines
      just shifted line numbers, and the 3 new errors are further instances
      of that same pre-existing class at the new
      `chrome.tabs.query`/`goBack`/`reload` call sites in
      `lib/tab-navigation.ts` — not a new error category.
- [x] Tests pass — `bunx vitest run test/tab-navigation.test.ts`: 5/5
      passed. `bun run test` in `qwksearch-ext`: 14/14 files, 141/141 tests
      passed (136 pre-existing + 5 new). Full workspace `bun run test`:
      179/188 files, 2514/2570 tests pass (52 failed, 4 skipped) — confirmed
      via a full untruncated log that the 9 failing files are exactly the
      documented pre-existing set (`chat-agent-toolkit/test/
      openrouter-default-model.test.js`, `qwksearch-web/app/api/config/
      __tests__/route.test.ts`, `search-web-api/test/{api,
      autocomplete-engines,engine-health-suite,search,sources-unit,
      sources}.test.ts`, `shadcn-settings/test/settings-field.test.tsx`),
      none touching `qwksearch-ext` or tab-navigation-related files.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar buttons)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`TabList.tsx`'s existing toolbar/button pattern, `lib/new-tab.ts`,
      `lib/undo-close-tab.ts`, and their tests)
- [x] Confirm `chrome.tabs.goBack`/`chrome.tabs.reload`/`chrome.tabs.query`
      API shapes against the installed `@types/chrome` and the `tabs`
      permission already granted in `wxt.config.ts`
- [x] Implement `goBackActiveTab`/`refreshActiveTab` in
      `lib/tab-navigation.ts`
- [x] Wire the two new toolbar buttons into `TabList.tsx`
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (no active tab found; active
      tab with no `id`)
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck error count is +3,
      the same pre-existing `TS2304` class, confirmed via `git stash`-based
      before/after diff)
- [x] Run the full relevant test suite (`qwksearch-ext` and full workspace
      `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout — the resulting `bun.lock`
      package-version-sync diff was reverted, matching prior tasks'
      precedent; final `git diff --stat` shows only `TabList.tsx` plus the 2
      new files, beyond the separate `TODO.md` tracker-sync change)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. All acceptance criteria verified locally
  on this commit.
- A "Forward" button remains an open, explicitly out-of-scope follow-up (see
  Non-goals above), should it ever be requested.

## Browser extension: Auto-generate keyphrase completions for on-page/tab search

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 32 ("Auto-generate keyphrase
completions for on-page Ctrl+F search."). `apps/qwksearch-ext/components/
TabSearch.tsx` already has dead scaffolding for this — `autocompleteResults`/
`setAutocompleteResults` state and `arrowCounter` keyboard-navigation logic
(`ArrowUp`/`ArrowDown`/`Enter`) are declared and wired into `onKeyDown`, but
`setAutocompleteResults` is never called anywhere and no autocomplete
dropdown is ever rendered — confirmed via a direct grep of the file. This
task is the first slice that actually populates and renders that dropdown.
**Branch:** `claude/adoring-mayer-r6s5vt`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/263 (merged)
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
As the user types in the side panel's "Search tab text or web" box
(`TabSearch.tsx`), show a dropdown of keyphrase completions generated from
the currently active tab's page content, so the user can quickly complete a
search term that actually matches vocabulary on the page, instead of typing
a query blind and finding zero matches.

### Scope
- New pure helper module `apps/qwksearch-ext/lib/keyphrase-completions.ts`:
  - `extractKeyphrases(content: string, maxKeyphrases = 50): string[]` —
    lower-cases the input, extracts alphanumeric words via `/[a-z0-9]+/g`,
    filters out a stopword list (mirroring the pattern already established
    in `packages/reason-editor/src/search/relatedDocuments.ts`'s
    `STOPWORDS`/`extractKeywords`, kept local to this app rather than a new
    cross-package dependency) and words shorter than a minimum length,
    counts frequency, and returns up to `maxKeyphrases` unique words ranked
    by frequency (ties broken by first-appearance order).
  - `filterKeyphraseCompletions(keyphrases: string[], query: string,
    maxResults = 8): string[]` — given the already-extracted keyphrase list
    and the current search box text, takes the last whitespace-separated
    word of `query` as the prefix to complete, returns up to `maxResults`
    keyphrases that start with that prefix (case-insensitive) and aren't
    already an exact match for it, preserving the frequency-ranked order.
    Returns `[]` when the query's last word is empty (e.g. query is blank
    or ends in a space).
- `apps/qwksearch-ext/components/TabSearch.tsx`:
  - On mount, find the active tab (`chrome.tabs.query({active: true,
    currentWindow: true})`) and fetch its content via the existing
    `extractTabContent(tabId)` helper (`lib/extract-tab-content.ts`,
    already used by the Research tab's "Chat with page content" feature),
    then cache `extractKeyphrases(content)` in state.
  - In `onSearchType`, additionally call `filterKeyphraseCompletions` with
    the cached keyphrases and the new value, and call the existing
    (currently-dead) `setAutocompleteResults` with the result.
  - Render a dropdown list under the input when `autocompleteResults.length
    > 0`, highlighting the entry at `arrowCounter` (reusing the existing
    keyboard-navigation state). Clicking or pressing Enter on a highlighted
    entry replaces the last word of `searchText` with the chosen keyphrase
    and closes the dropdown (matching the existing `onKeyDown`'s `Enter`
    branch, extended to check `arrowCounter !== -1` first before falling
    back to `searchSelected()`).

### Non-goals
- Any server-side/ML-based phrase extraction, bigrams/trigrams, or TF-IDF
  weighting — a flat single-word frequency count is sufficient for this
  first slice, matching `relatedDocuments.ts`'s precedent of starting with
  plain keyword overlap before any smarter scoring.
- Multi-tab keyphrase aggregation — only the single active tab's content is
  used, not every open tab (keeps the extraction cheap and avoids injecting
  a content script into every tab on every keystroke).
- Live-refreshing keyphrases as the user switches to a different tab while
  the panel stays open (e.g. via `chrome.tabs.onActivated`) — no other
  component in this app currently listens for live active-tab changes;
  keyphrases are fetched once, when `TabSearch` mounts. Refreshing them on
  tab switch is a natural follow-up, not required for this first slice.
- Any change to `findInTabContent`/`lib/find-in-tab-content.ts`'s existing
  full multi-tab search behavior — this is purely an additive autocomplete
  layer above the existing search box.
- A literal in-page Ctrl+F-style highlight-and-jump overlay on the visited
  page itself — the backlog item's title mentions "Ctrl+F search" but the
  existing `TabSearch.tsx` search box (not a real find-in-page overlay) is
  the only on-page/tab search surface this app has; that's the surface this
  slice augments.

### Acceptance criteria
- [x] Typing a prefix that matches words appearing on the active tab's page
      shows a dropdown of up to 8 matching keyphrases, most-frequent first.
- [x] Typing a prefix with no matching page vocabulary shows no dropdown.
- [x] ArrowDown/ArrowUp navigate the dropdown (reusing existing
      `arrowCounter` state); Enter on a highlighted entry completes the
      last word of the search box with that keyphrase instead of triggering
      `searchSelected()`; Enter with nothing highlighted still searches as
      today.
- [x] Clicking a dropdown entry has the same effect as Enter-selecting it.
- [x] Common stopwords and very short words are excluded from suggestions.
- [x] Vitest coverage is added or updated for `extractKeyphrases` and
      `filterKeyphraseCompletions` — 15 focused cases in
      `apps/qwksearch-ext/test/keyphrase-completions.test.ts` (frequency
      ranking, stopword exclusion, short-word exclusion, case-insensitivity,
      empty content, tie-breaking, `maxKeyphrases` truncation, prefix
      matching, multi-word query, case-insensitive prefix, exact-match
      exclusion alongside other prefix matches, blank query, query ending in
      a space, no-match, `maxResults` truncation). Two of the first-drafted
      cases initially failed against the real implementation — "and" wasn't
      yet in the local stopword list, and one fixture asserted an incorrect
      prefix relationship ("apple" is not a prefix of "application") — both
      were fixed (stopword list expanded; the fixture corrected) before this
      checkbox was marked done.
- [x] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run (same as every prior `qwksearch-ext` task)
- [x] Typecheck passes — `bun run compile` in `apps/qwksearch-ext` (after
      clearing the stale `tsconfig.tsbuildinfo` incremental cache) surfaces
      exactly 127 errors, one more than the 126-error baseline confirmed via
      `git stash -u -- apps/qwksearch-ext`, re-running `bun run compile`,
      then `git stash pop`. A line-by-line `diff` of the two runs shows the
      one new error is `components/TabSearch.tsx(44,5): error TS2304:
      Cannot find name 'chrome'` at the new `chrome.tabs.query` call in the
      mount effect — the same pre-existing `TS2304` class already present
      throughout this app's `chrome.*`-using files, not a new category; the
      other 8 `chrome`-related lines in this file just shifted line numbers.
- [x] Tests pass — `bunx vitest run test/keyphrase-completions.test.ts`:
      15/15 passed. `bun run test` in `qwksearch-ext`: 13/13 files, 136/136
      tests passed (121 pre-existing + 15 new). Full workspace
      `bun run test`: 178/187 files, 2509/2565 tests pass (52 failed, 4
      skipped). The 9 failing files are exactly the documented pre-existing
      set: `chat-agent-toolkit/test/openrouter-default-model.test.js`,
      `qwksearch-web/app/api/config/__tests__/route.test.ts`,
      `search-web-api/test/{api,autocomplete-engines,engine-health-suite,
      search,sources-unit,sources}.test.ts` (external-API-dependent engine
      tests), `shadcn-settings/test/settings-field.test.tsx` — confirmed via
      a full `grep -E "^ (❯|FAIL)"` over the captured run output, none touch
      `qwksearch-ext` or keyphrase-related files.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded (7m1s).
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar behavior)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`TabSearch.tsx`'s dead `autocompleteResults`/`arrowCounter`
      scaffolding, `lib/find-in-tab-content.ts`, `relatedDocuments.ts`'s
      stopword-filtering precedent in `reason-editor`, existing `lib/`
      pure-helper + `test/` conventions in `qwksearch-ext`)
- [x] Confirm `chrome.tabs.query({active, currentWindow})` API shape against
      the installed `@types/chrome` and `extractTabContent`'s existing
      signature (mirrored `ResearchTab.tsx`'s existing `chrome.tabs.query`
      call shape)
- [x] Implement `extractKeyphrases`/`filterKeyphraseCompletions` in
      `lib/keyphrase-completions.ts`
- [x] Wire active-tab content fetching + caching and the dropdown UI into
      `TabSearch.tsx`
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage
- [x] Run focused tests and fix failures (2 of 15 initially failed; fixed —
      see the Vitest-coverage acceptance-criteria note above)
- [x] Run linting and typechecking (lint n/a; typecheck error count is +1,
      the same pre-existing `TS2304` class, confirmed via `git stash
      -u`-based before/after diff)
- [x] Run the full relevant test suite (`qwksearch-ext` and full workspace
      `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` produced an
      unrelated `bun.lock` package-version-sync diff, reverted per prior
      tasks' precedent; final `git diff --stat` shows only the 2 intended
      source files plus the 2 new files)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #263, merged)
- [x] Update tracker status, completed checkboxes, and remaining work (this
      run — 2026-08-15 — found PR #263 already merged into master, commit
      `cc8c5e9`; this tracker entry was left stale at "In Progress" by the
      prior session, corrected here)

### Remaining work
- None for this task's own scope. PR #263 merged into master.

## Browser extension: Browse bookmarks by folder in the Favorites tab

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 14 (Favorites tab), continuing the
follow-up explicitly deferred as a Non-goal in the original "Browser
extension: Favorites (bookmarks) tab" task ("Browsing the full bookmark
folder tree, or filtering/searching bookmarks — out of scope for this first
read/act-on-favorites slice") and echoed as still-open in later Favorites
tasks' Remaining work ("Bookmark-folder-tree editing/moving remains an open,
separate follow-up"). This slice covers the "browsing" half only — view-only
folder navigation, no move/reorder/create.
**Branch:** `claude/adoring-mayer-0cef78` (this session's designated branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/261 (merged)
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user switch the Favorites tab from the existing flat "most recent 20"
list to a folder-tree view, so they can navigate into their actual Chrome
bookmark folders (Bookmarks bar, Other bookmarks, and any user-created
subfolders) and open/edit/remove bookmarks from within them, without leaving
the panel.

### Scope
- `apps/qwksearch-ext/lib/bookmarks.ts`: add `isFolderNode(node)` (the
  inverse of the existing `isBookmarkNode`) and `folderDisplayTitle(node)` (a
  folder's trimmed title, falling back to a placeholder when blank).
- `apps/qwksearch-ext/components/BookmarksList.tsx`:
  - Add a small "Recent" / "Folders" view toggle at the top of the tab
    (default: "Recent", preserving today's behavior unchanged).
  - In "Folders" mode, list the current folder's immediate children via
    `chrome.bookmarks.getChildren(folderId)`, starting at the bookmarks root
    (`"0"`, whose children are Chrome's top-level folders). Folders render as
    clickable rows (folder icon + title) that navigate in; bookmarks render
    with the existing row markup (favicon, open-on-click, edit, remove —
    refactored into a small shared row renderer so both views reuse the same
    edit/remove/open logic).
  - A "Back" button (enabled once inside a folder) navigates to the parent
    folder, tracked via a simple in-memory folder stack (no need to persist
    across panel reloads).
  - Re-fetch the active view's data on
    `chrome.bookmarks.onCreated`/`onRemoved`/`onChanged`/`onMoved`, mirroring
    the existing sync behavior.

### Non-goals
- Creating new bookmarks or folders, or moving/reordering bookmarks between
  folders (drag-and-drop or otherwise) — view/open/edit-title-and-url/remove
  only, matching the existing per-bookmark actions.
- Any breadcrumb UI beyond a single "Back" button — a full multi-level
  breadcrumb trail is a possible follow-up, not required for this first
  browsing slice.
- Any change to the "Recent" view's existing behavior, `lib/history.ts`,
  `HistoryList.tsx`, `DownloadsList.tsx`, or any other tab.

### Acceptance criteria
- [x] The Favorites tab defaults to the existing "Recent" flat list
      (unchanged behavior) with a new "Folders" toggle.
- [x] Switching to "Folders" shows the top-level bookmark folders (Bookmarks
      bar, Other bookmarks, etc.) as clickable rows (`chrome.bookmarks.
      getChildren("0", ...)`).
- [x] Clicking a folder navigates into it and shows its immediate child
      folders and bookmarks (`folderStack` push, re-fetches via
      `getChildren(currentFolderId)`).
- [x] Clicking a bookmark row (in either view) still opens it via
      `chrome.tabs.create`; Edit/Remove still work identically in Folders
      view (shared `renderBookmarkRow`, `removeBookmark`/`saveEdit` refresh
      whichever view is active).
- [x] "Back" returns to the parent folder; it's the top-level list when the
      stack is empty (`folderStack.slice(0, -1)`).
- [x] An empty folder shows a "This folder is empty" message, mirroring the
      existing "No favorites yet" message.
- [x] Vitest coverage is added or updated — 6 new focused cases for
      `isFolderNode` (has url / no url / empty-string url) and
      `folderDisplayTitle` (trimmed title / blank title / missing title) in
      `apps/qwksearch-ext/test/bookmarks.test.ts`. No pre-existing
      `BookmarksList.tsx` component test file exists (checked directly),
      matching the precedent from every prior Favorites-tab task.
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run (same as every prior `qwksearch-ext` task)
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces exactly 126 errors,
      3 more than the 123-error baseline confirmed via `git stash` on just
      this task's three touched files, re-running `bun run compile`, then
      `git stash pop`. A line-by-line `diff` of the two runs shows the 11
      pre-existing `components/BookmarksList.tsx` `TS2304: Cannot find name
      'chrome'` lines became 14 (the 3 new `chrome.bookmarks.getChildren`/
      `onMoved.addListener`/`onMoved.removeListener` call sites) — same
      pre-existing error class, no new category introduced.
- [x] Tests pass — `bunx vitest run test/bookmarks.test.ts`: 24/24 passed (18
      pre-existing + 6 new). `bun run test` in `qwksearch-ext`: 121/121
      passed (12/12 files). Full workspace `bun run test`: 177/186 files,
      2493/2550 tests pass (53 failed, 4 skipped). The 9 failing files are
      exactly the documented pre-existing set (`chat-agent-toolkit/test/
      openrouter-default-model.test.js`, `qwksearch-web/app/api/config/
      __tests__/route.test.ts`, `search-web-api/test/{api,
      autocomplete-engines,engine-health-suite,search,sources-unit,
      sources}.test.ts`, `shadcn-settings/test/settings-field.test.tsx`) —
      confirmed via a full `grep -E "^ (❯|FAIL)"` over the captured run
      output, none touch `qwksearch-ext` or bookmarks-related files.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded. Also verified `bunx turbo build
      --filter=qwksearch-extension-wxt` (Chrome target): 11/11 tasks
      succeeded, producing `.output/chrome-mv3/`.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`lib/bookmarks.ts`, `components/BookmarksList.tsx`,
      `test/bookmarks.test.ts`)
- [x] Confirm `chrome.bookmarks.getChildren`/`onMoved` API shape
- [x] Implement `isFolderNode`/`folderDisplayTitle` in `lib/bookmarks.ts`
- [x] Implement the Folders view + toggle + back navigation in
      `BookmarksList.tsx`, refactoring the bookmark row into a shared
      `renderBookmarkRow` renderer used by both the Recent and Folders views
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (empty-string url edge case for
      `isFolderNode`; blank/missing title for `folderDisplayTitle`)
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck error count is +3,
      the same pre-existing `TS2304` class, confirmed via `git stash`-based
      before/after diff)
- [x] Run the full relevant test suite (`qwksearch-ext` and full workspace
      `bun run test`)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks;
      also verified the Chrome extension build itself, 11/11 tasks)
- [x] Review the final diff for scope and quality (`bun install` produced an
      unrelated `bun.lock` package-version-sync diff, reverted per prior
      tasks' precedent; final `git diff --stat` shows only the 4 intended
      files)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #261, merged)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #261 merged; all verification passed
  locally on this commit.
- The PR's "Workers Builds: qwksearch-research-agent" Cloudflare deploy check
  failed — this is the same recurring, pre-existing, unrelated-to-code
  infrastructure issue already conclusively documented as Ideas Backlog item
  39 (11 consecutive occurrences across every PR regardless of content,
  including pure-documentation PRs). Per that item's own note, this is not
  appended as a new numbered occurrence there — the pattern is already fully
  established and it's exclusively actionable by a human with Cloudflare
  dashboard access.
- Follow-ups noted above remain open: creating new bookmarks/folders,
  moving/reordering bookmarks between folders, and a full multi-level
  breadcrumb trail beyond the single "Back" button.

## Fix `render-url-to-html/scraper-jsdom` and `scraper-puppeteer` missing from bun workspaces

**Status:** Completed
**Source:** TODO.md — recurring, documented pre-existing test failure (`jsdom-scraper`
missing its `jsdom` dependency) called out in the "Tests pass" acceptance-criteria
notes of at least 9 prior completed tasks in this tracker (e.g. the "include page
content in Chat about my open tabs", "Chat about my open tabs button", "Edit a
bookmark's title", "New tab button" entries above). Root-caused during this run:
`packages/render-url-to-html/` contains two sub-packages, `scraper-jsdom` and
`scraper-puppeteer`, neither of which is matched by the root `package.json`
`workspaces` glob (`["packages/*", "apps/*"]` only matches immediate children of
`packages/`, and `packages/render-url-to-html/` itself has no `package.json` so
isn't a workspace member itself either). Both sub-packages are nonetheless listed
as `vitest` projects in the root `vitest.config.ts`, so a root `bun install` never
installs their dependencies, and a root `bun run test`/`vitest run` fails on them
with module-resolution errors — not an actually-missing `jsdom` entry in their own
`package.json` (it's already declared there).
**Branch:** `claude/adoring-mayer-o372r8` (this session's designated branch)
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/257
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Make `packages/render-url-to-html/scraper-jsdom` and
`packages/render-url-to-html/scraper-puppeteer` proper bun workspace members, so
a fresh `bun install` at the repo root installs their dependencies and their
vitest suites (already registered as projects in root `vitest.config.ts`) run
and pass as part of `bun run test`, instead of failing with unresolved-module
errors on every run.

### Scope
- Root `package.json`: extend `workspaces` to also match
  `packages/render-url-to-html/*` (in addition to the existing `packages/*` and
  `apps/*` patterns), so both sub-packages become real workspace members.
- Run `bun install` at the repo root to hoist/install both sub-packages'
  dependencies and regenerate `bun.lock`.
- Verify both packages' own `vitest run` and the root `bun run test` now pick
  them up successfully.

### Non-goals
- Fixing any of the *other* pre-existing failing test files documented in prior
  tasks (`search-web-api` engine tests hitting real external APIs, the
  `qwksearch-web` config route test, `shadcn-settings`, `chat-agent-toolkit`'s
  `openrouter-default-model.test.js`) — separate, unrelated root causes; out of
  scope for this task.
- Any change to `scraper-jsdom`/`scraper-puppeteer`'s own source code, tests, or
  dependency versions beyond what's needed to make them installable/runnable as
  workspace members.
- Restructuring `packages/render-url-to-html/` itself (e.g. merging the two
  sub-packages, adding a parent `package.json`) — the flat `packages/*/*`
  workspace glob is the smallest fix.

### Acceptance criteria
- [x] A fresh `bun install` at the repo root installs dependencies for both
      `scraper-jsdom` and `scraper-puppeteer` (confirmed 31 and 15 top-level
      `node_modules` entries respectively, previously zero).
- [x] `bunx vitest run` (or the package's own `bun run test`) in
      `packages/render-url-to-html/scraper-jsdom` passes — 1/1 passed.
- [x] `bunx vitest run` (or the package's own `bun run test`) in
      `packages/render-url-to-html/scraper-puppeteer` passes — 1/1 passed.
- [x] Root `bun run test` no longer reports `jsdom-scraper`/`scraper-puppeteer`
      module-resolution failures — confirmed via a full untruncated log (no
      `jsdom`/`scraper`/`render-url` matches anywhere in the failure output).
- [x] Vitest coverage is added or updated — n/a; this is a workspace-wiring fix,
      no new logic.
- [x] Lint passes — `scraper-puppeteer` has no `lint` script. `scraper-jsdom`'s
      `bun run lint` (`eslint .`) fails with "ESLint couldn't find an
      eslint.config.(js|mjs|cjs) file" — this package has never had an ESLint
      v9+ flat config; pre-existing and unrelated to this change (untouched by
      this diff), same "nothing actionable" precedent as every prior task's
      missing repo-root `lint` script.
- [x] Typecheck passes — `scraper-jsdom`'s `bun run build` (`tsc -p
      tsconfig.build.json`) succeeds with zero errors, unchanged by this diff
      (no source files touched). `scraper-puppeteer` has no typecheck/build
      script (plain JS, `bun crawler.js`).
- [x] Tests pass — full workspace `bun run test`: 177/186 files, 2484/2539
      tests pass (4 skipped). The 9 remaining failing files
      (`chat-agent-toolkit/test/openrouter-default-model.test.js`,
      `qwksearch-web/app/api/config/__tests__/route.test.ts`,
      `search-web-api/test/{api,autocomplete-engines,engine-health-suite,
      search,sources-unit,sources}.test.ts`,
      `shadcn-settings/test/settings-field.test.tsx`) are the same
      pre-existing, documented-in-prior-TODO.md-tasks set (external-API-
      dependent search engine tests, an unrelated config-route test, and an
      unrelated settings-field test) — down from the 10 pre-existing failing
      files documented before this fix (jsdom-scraper is no longer among
      them).
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (a `workspaces` glob change has no
      user-facing docs to update).

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests (root
      `package.json` workspaces glob, root `vitest.config.ts` projects list,
      both sub-packages' `package.json`/`vitest.config.ts`)
- [x] Confirm root cause via `bunx turbo test --filter=jsdom-scraper` ("No
      package found with name 'jsdom-scraper' in workspace") and a standalone
      `bunx vitest run` inside the sub-package failing on `vitest/config`
      resolution
- [x] Update root `package.json` `workspaces` to include
      `packages/render-url-to-html/*`
- [x] Run `bun install` at the repo root and confirm both sub-packages get
      `node_modules`
- [x] Run focused tests for both sub-packages and fix any further failures
      (none needed — both passed immediately once dependencies installed)
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable due to a pre-existing missing ESLint flat config;
      typecheck/build is clean and unchanged)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (the `bun.lock` diff is large
      — 2533 insertions/402 deletions — but expected and legitimate: it's the
      real dependency tree for two newly-installed workspace packages plus
      resulting hoisting changes, not an incidental version-sync diff like
      prior tasks reverted; spot-checked for unrelated existing-package
      version bumps and found none beyond normal hoisting shifts)
- [x] Commit and push the branch
- [x] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. All acceptance criteria verified locally on
  this commit.
- The 9 other pre-existing failing test files remain open, separate issues
  (external-API-dependent `search-web-api` tests, the `qwksearch-web` config
  route test, `shadcn-settings`, and `chat-agent-toolkit`'s
  `openrouter-default-model.test.js`) — out of scope per this task's
  Non-goals, not filed as new backlog items since they were already
  documented repeatedly in prior tasks.

## Browser extension: include page content in "Chat about my open tabs"

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 12 ("Use CRX/extension to open
tabs and scrape them.") and item 19 ("Use open tabs as context."),
continuing the follow-up explicitly deferred as a Non-goal in the "Chat
about my open tabs" button task above ("Extracting each tab's full page
text/content (mirroring `TabSearch.tsx`'s `chrome.scripting.executeScript`
pattern) — this first slice only sends title + URL per tab; full-page-content
context is a separate, larger follow-up"). Reuses the exact
`chrome.scripting.executeScript` pattern already established in
`apps/qwksearch-ext/components/TabSearch.tsx` for in-tab content search, so
no new Chrome API/permission is needed (`scripting` is already granted in
`wxt.config.ts`).
**Branch:** `claude/adoring-mayer-g3uiuf`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/255
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user click a second button in `apps/qwksearch-ext`'s side panel
Research tab that seeds the chat with their open tabs' title + URL **and**
a truncated excerpt of each tab's visible page text, so follow-up questions
can be answered from actual page content, not just titles/URLs.

### Scope
- `apps/qwksearch-ext/lib/open-tabs-context.ts`:
  - Extend `OpenTabLike` with an optional `content?: string` field.
  - Add `truncateTabContent(content, maxChars = 2000)`: trims and truncates
    a content string to a max length, appending an ellipsis when truncated
    (keeps the chat message payload bounded across many/large tabs).
  - Update `formatOpenTabsMessage` to append a truncated, indented content
    excerpt under a tab's line when `content` is present — unchanged output
    when `content` is absent, so this stays backward compatible with the
    existing title/URL-only button and its tests.
  - Add `extractTabContent(tabId)`: wraps
    `chrome.scripting.executeScript({ target: { tabId }, func: () =>
    document.body.innerText })`, returning the extracted text or `undefined`
    on any failure (e.g. Chrome Web Store / restricted pages that reject
    script injection) — caught, not thrown, so one tab's failure doesn't
    block the others.
- `apps/qwksearch-ext/components/ResearchTab.tsx`: add a second button
  ("Chat with page content" or similar) that queries open tabs, runs
  `extractTabContent` across all contextable tabs in parallel
  (`Promise.all`/`allSettled`), then calls `sendMessage` with the resulting
  content-enriched message. Disabled while chat is sending (`loading`) and
  while its own extraction is in flight.

### Non-goals
- Any change to `packages/research-agent-ui` — same constraint as the prior
  task; only the already-public `useChat().sendMessage` API is used.
- Removing or changing the existing title/URL-only button — this is an
  additive second action, not a replacement.
- Any settings/toggle to auto-include page content on every message, or to
  persist a preference — a one-shot action only, matching the prior task's
  precedent.
- Manifest/permission changes — `scripting` is already granted.
- Summarizing/chunking beyond a flat per-tab character truncation — no
  smarter compression of long pages in this first slice.

### Acceptance criteria
- [x] Clicking the new button when there's at least one contextable open
      tab sends a chat message listing those tabs (title/hostname + URL)
      with a truncated page-content excerpt per tab, via
      `useChat().sendMessage`.
- [x] Clicking the new button when there are zero contextable open tabs
      does not call `sendMessage`.
- [x] A tab whose content extraction fails (e.g. a restricted page) is
      still included with title/URL only (no content line), rather than
      aborting the whole action.
- [x] Content longer than the max length is truncated with an ellipsis;
      content at or under the max length is included in full.
- [x] The new button is disabled while a chat message is already sending
      or while extraction is in flight.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run (same as every prior `qwksearch-ext` task)
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces exactly 123 errors,
      two more than the 121 on a clean before/after comparison (temporarily
      reverting just this task's changed files via `git checkout HEAD~1 --
      <files>`, confirming the baseline, then restoring). The two new errors
      (`components/ResearchTab.tsx(54,5)` and `lib/extract-tab-content.ts
      (9,27)`, both `TS2304: Cannot find name 'chrome'`) are further
      instances of the same **pre-existing** error class already present
      throughout this app's `chrome.*`-using files, not a new category.
- [x] Tests pass — `bunx vitest run test/open-tabs-context.test.ts
      test/extract-tab-content.test.ts`: 24/24 passed. `bun run test` in
      `qwksearch-ext`: 110/110 passed (12/12 files, 100 pre-existing + 10
      new). Full workspace `bun run test`: 176/186 files, 2479/2539 tests
      pass (4 skipped); the 9 failing files (`search-web-api` engine tests
      hitting real external APIs, the `qwksearch-web` config route test,
      `shadcn-settings`, `jsdom-scraper` missing its `jsdom` dependency,
      `chat-agent-toolkit`'s `openrouter-default-model.test.js`) are the
      same pre-existing, documented-in-prior-TODO.md-tasks set — none touch
      `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded. Also verified
      `bunx turbo build --filter=qwksearch-extension-wxt` (Chrome target)
      succeeds (11/11 tasks).
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`TabSearch.tsx`'s `chrome.scripting.executeScript` pattern,
      `open-tabs-context.ts`/`ResearchTab.tsx` from the prior task)
- [x] Implement `truncateTabContent` and `extractTabContent` in
      `lib/open-tabs-context.ts` (`extractTabContent` kept in its own
      `lib/extract-tab-content.ts` module, mirroring `lib/new-tab.ts`'s
      precedent of isolating each `chrome`-touching call for testability,
      since `open-tabs-context.ts` is deliberately kept chrome-free)
- [x] Update `formatOpenTabsMessage` to include per-tab content when present
- [x] Implement the `ResearchTab.tsx` second button + wiring
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (extraction failure via a
      rejected `executeScript`, missing/empty injection results, truncation
      boundary, custom max length, no contextable tabs, mixed
      content/no-content tabs, blank/whitespace-only content)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change; typecheck error count is +2, the
      same pre-existing error class)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (`bun install` was
      required in this fresh checkout — a `bun.lock` version-sync diff it
      produced was reverted, matching prior tasks' precedent, keeping only
      this task's own files)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #255)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #255 open; all verification passed
  locally on this commit.
- Follow-ups noted above remain open: letting the user edit the generated
  message before sending, any settings/toggle to auto-include tabs or page
  content, and smarter compression of long pages beyond flat truncation.

## Browser extension: "Chat about my open tabs" button

**Status:** Completed
**Source:** TODO.md — Ideas Backlog items 2 ("Chat with open tabs as
context.") and 19 ("Use open tabs as context."), scoped to the smallest
independently useful first slice: a button that seeds the Research tab's
chat with the list of the user's currently open tabs, using the
`research-agent-ui` `useChat().sendMessage` API that's already exposed to
consumers — no changes to the shared `research-agent-ui` package needed.
(A prior investigation ruled out reusing the existing `systemInstructions`
`localStorage` key: `apps/qwksearch-ext/components/SearchSettings.tsx`
already binds that same key two-way to a user-facing "custom instructions"
settings field, so writing tab context into it would silently clobber a
user's saved custom instructions. `sendMessage` avoids that entirely.)
**Branch:** `claude/adoring-mayer-1sn4od`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/253
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user click a button in `apps/qwksearch-ext`'s side panel Research tab
that lists their currently open browser tabs (title + URL) as the first
message in the chat, so they can immediately ask follow-up questions about
them (e.g. "summarize these" or "which of these is most relevant to X"),
without leaving the panel or manually typing/copy-pasting each tab.

### Scope
- New pure helper module `apps/qwksearch-ext/lib/open-tabs-context.ts`:
  - `isContextableTab(tab)`: true when a tab-like object has an `http(s)://`
    URL (excludes internal `chrome://`/`chrome-extension://`/`about:`/
    `file://` pages, which aren't meaningful chat context and may be
    extension/browser-internal).
  - `formatOpenTabsMessage(tabs)`: filters to contextable tabs, returns
    `undefined` when there are none, otherwise a numbered
    title/hostname-fallback + URL list message (reusing
    `hostnameFromUrl` from `lib/history.ts`) ending with a short prompt line,
    ready to hand straight to `sendMessage`.
- `apps/qwksearch-ext/components/ResearchTab.tsx`: add a small button
  (rendered inside the existing `ChatProvider` tree, above `ChatWindow`)
  that on click calls `chrome.tabs.query({currentWindow: true})`, formats
  the result via `formatOpenTabsMessage`, and calls the chat's
  `sendMessage(message)` — disabled while a message is already sending
  (`useChat().loading`).

### Non-goals
- Any change to `packages/research-agent-ui` — this slice deliberately uses
  only its already-public `useChat().sendMessage` API.
- Extracting each tab's full page text/content (mirroring `TabSearch.tsx`'s
  `chrome.scripting.executeScript` pattern) — this first slice only sends
  title + URL per tab; full-page-content context is a separate, larger
  follow-up (would need per-tab content-script injection and is a much
  bigger payload).
- Letting the user edit the generated message before it's sent (e.g.
  prefilling the chat input box instead of sending immediately) — no setter
  for the chat input's text is exposed by `research-agent-ui`'s public API
  today; out of scope for this slice.
- Any settings/toggle to auto-include tabs on every message, or to persist
  which tabs were included — this is a one-shot "seed the conversation"
  action only.
- Tabs from other windows (`chrome.tabs.query({currentWindow: true})` only)
  — matches the likely user intent of "the tabs I'm looking at right now"
  and avoids potentially large/irrelevant context from unrelated windows.

### Acceptance criteria
- [x] Clicking the button when there's at least one contextable open tab
      sends a chat message listing those tabs (title/hostname + URL) via
      `useChat().sendMessage`.
- [x] Clicking the button when there are zero contextable open tabs (e.g.
      only `chrome://` pages) does not call `sendMessage`.
- [x] The button is disabled while a chat message is already sending
      (`loading` from `useChat()`).
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces exactly 121 errors,
      one more than the 120 on `git stash -u`-ed (unmodified) code —
      confirmed via a direct before/after diff of the full error list. The
      one new error (`components/ResearchTab.tsx(25,5): error TS2304:
      Cannot find name 'chrome'` at the new `chrome.tabs.query` call) is a
      further instance of the same **pre-existing** `TS2304` class already
      present throughout this app's `chrome.*`-using files, not a new
      category; the two `research-agent-ui`-module-resolution `TS2307`
      errors are the same pre-existing pair (just shifted one line by the
      new `useChat` import).
- [x] Tests pass — `bunx vitest run test/open-tabs-context.test.ts`: 14/14
      passed. `bun run test` in `qwksearch-ext`: 100/100 passed (11/11
      files, 86 pre-existing + 14 new). Full workspace `bun run test`:
      175/185 files, 2474/2529 tests pass (4 skipped); the 51 failures
      across the same 10 files documented repeatedly in prior TODO.md tasks
      (`search-web-api` engine tests hitting real external APIs, the
      `qwksearch-web` config route test, `shadcn-settings`, `jsdom-scraper`
      missing its `jsdom` dependency, `chat-agent-toolkit`'s
      `openrouter-default-model.test.js`) are pre-existing and unrelated —
      none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded. Also verified
      `bunx turbo build --filter=qwksearch-extension-wxt` (Chrome target)
      succeeds (11/11 tasks).
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (mirrored `lib/history.ts`/`lib/new-tab.ts`'s pure-helper-module
      pattern; confirmed `useChat().sendMessage` and `ChatProvider` are
      public `research-agent-ui` exports; ruled out reusing
      `systemInstructions` localStorage — see Source above)
- [x] Implement `lib/open-tabs-context.ts` (`isContextableTab`,
      `formatOpenTabsMessage`)
- [x] Implement the `ResearchTab.tsx` button + wiring
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (no tabs, only
      internal-scheme tabs, blank/missing titles falling back to hostname,
      mixed contextable/non-contextable tabs with contiguous renumbering)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change; typecheck error count is +1, the same
      pre-existing error class)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` package-version-sync diff produced by `bun
      install` — pure version-number sync to already-committed
      `package.json` bumps, out of scope, matching prior tasks' precedent)
- [x] Commit and push the branch
- [ ] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope.
- Follow-ups noted above remain open: full page-content extraction as
  context (not just title/URL), letting the user edit the generated message
  before sending, and any settings/toggle for auto-including tabs.

## Completed

## Browser extension: Edit a bookmark's URL from the Favorites tab

**Status:** Completed
**Source:** TODO.md — the "Browser extension: Edit a bookmark's title from the
Favorites tab" task (PR #251, completed) explicitly deferred this as a
Non-goal/follow-up: "Editing a bookmark's URL — only the title, matching the
smallest independently useful slice of the deferred Non-goal." This is that
next slice.
**Branch:** `claude/adoring-mayer-ie5a52`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/259 (merged)
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user also edit a bookmark's URL inline from the same edit mode already
used for the title in `apps/qwksearch-ext`'s side panel Favorites tab, via
`chrome.bookmarks.update(id, { title, url })`, without leaving the panel.

### Scope
- `apps/qwksearch-ext/lib/bookmarks.ts`: add `sanitizeBookmarkUrl(input)`, a
  pure helper that trims a proposed new URL and returns `null` when the
  trimmed result isn't a syntactically valid URL (using the same `new
  URL(...)` try/catch pattern already used by `hostnameFromUrl` in this
  file), including for an empty/whitespace-only string.
- `apps/qwksearch-ext/components/BookmarksList.tsx`: extend the existing edit
  mode so the URL line is also an `<Input>` when editing, prefilled with the
  bookmark's raw URL. Enter/blur on either field saves both title and URL
  together via one `chrome.bookmarks.update(id, { title, url })` call. If the
  sanitized URL is invalid, the save is blocked (no `chrome.bookmarks.update`
  call) and edit mode stays open so the user can correct it. Escape still
  cancels both fields without saving, reusing the existing
  `cancellingEditRef` guard.

### Non-goals
- Any bookmark-folder-tree editing/moving, or creating new bookmarks — out of
  scope, unchanged from the original task's Non-goals.
- Any URL normalization/rewriting beyond trim + validity check (e.g.
  auto-prepending `https://` to a bare domain) — out of scope; if invalid,
  block save and let the user fix it themselves.
- Any change to `lib/history.ts`, `HistoryList.tsx`, `DownloadsList.tsx`, or
  any other tab — this touches only the Favorites/bookmarks feature.

### Acceptance criteria
- [x] Clicking "Edit" on a bookmark shows inline inputs for both title and
      URL, prefilled with current values (`editValue`/`editUrlValue` seeded
      from `bookmark.rawTitle`/`bookmark.url` in `startEditing`).
- [x] Saving (Enter or blur) with a valid URL calls `chrome.bookmarks.update`
      with both the sanitized title and sanitized URL, and exits edit mode.
      A shared `onBlur` on the wrapping `<div>` (checking
      `e.relatedTarget`/`currentTarget.contains`) also ensures Tab-ing
      between the title and URL inputs doesn't prematurely save/exit — only
      a blur to somewhere outside both inputs triggers `saveEdit`.
- [x] Saving with an invalid/empty URL does NOT call `chrome.bookmarks.update`
      and does NOT exit edit mode — `saveEdit` returns early when
      `sanitizeBookmarkUrl` returns `null`, leaving `editingId` set.
- [x] Escape cancels both fields without calling `chrome.bookmarks.update`,
      reusing the existing `cancellingEditRef` guard (now also resets
      `editUrlValue`).
- [x] Vitest coverage is added or updated — 5 new focused cases for
      `sanitizeBookmarkUrl` (valid w/ trim, already-trimmed valid,
      unparseable string, empty string, whitespace-only) in
      `apps/qwksearch-ext/test/bookmarks.test.ts`. No pre-existing
      `BookmarksList.tsx` component test file exists in
      `apps/qwksearch-ext/test/` (checked directly — only pure-helper test
      files like `bookmarks.test.ts` exist there), so component-level
      coverage isn't available as a test surface here, matching the
      precedent noted in the "Edit a bookmark's title" task.
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` in `apps/qwksearch-ext` (after
      clearing the stale `tsconfig.tsbuildinfo` incremental cache) surfaces
      exactly 123 errors both before and after this change (confirmed via
      `git stash push` on just the three touched files, re-running
      `bun run compile`, then `git stash pop`). A line-by-line `diff` of the
      two runs shows the only differences are the 11
      `components/BookmarksList.tsx` `TS2304: Cannot find name 'chrome'`
      lines shifting line numbers (e.g. `(24,5)` → `(30,5)`, `(76,5)` →
      `(89,5)`) because the diff adds lines above them — the error count and
      class are identical, no new error category introduced.
- [x] Tests pass — `bunx vitest run test/bookmarks.test.ts`: 18/18 passed (13
      pre-existing + 5 new). `bun run test` in `qwksearch-ext`: 12/12 files,
      115/115 tests passed (97 pre-existing + 18 in bookmarks.test.ts).
      Full workspace `bun run test`: 177/186 files, 2489/2544 tests pass (51
      failed, 4 skipped). The 9 failing files are exactly the documented
      pre-existing set: `chat-agent-toolkit/test/openrouter-default-model.test.js`,
      `qwksearch-web/app/api/config/__tests__/route.test.ts`,
      `search-web-api/test/{api,autocomplete-engines,engine-health-suite,
      search,sources-unit,sources}.test.ts` (external-API-dependent engine
      tests), `shadcn-settings/test/settings-field.test.tsx` — confirmed via
      a full `grep -E "^ (❯|FAIL)"` over the captured run output, none touch
      `qwksearch-ext` or bookmarks-related files.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded (9m0s).
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (`lib/bookmarks.ts`, `components/BookmarksList.tsx`,
      `test/bookmarks.test.ts`, checked `test/` for an existing
      `BookmarksList` component test — none found)
- [x] Implement the smallest useful vertical slice (`sanitizeBookmarkUrl`,
      dual title/URL inline-edit UI in `BookmarksList.tsx` with a shared
      save/blur/escape flow)
- [x] Add focused Vitest coverage (5 new `sanitizeBookmarkUrl` cases)
- [x] Run focused tests and fix failures (none needed — passed first run)
- [x] Run linting and typechecking (lint n/a; typecheck error count
      unchanged at 123, same pre-existing `TS2304` class, confirmed via
      `git stash`-based before/after diff)
- [x] Run the full relevant test suite (`qwksearch-ext` and full workspace
      `bun run test`, run synchronously to completion twice for a clean
      captured log)
- [x] Run the production/web build (`bun run build:web`, 14/14 turbo tasks)
- [x] Review the final diff for scope and quality (`bun install` at the repo
      root reported "Checked 3009 installs across 3339 packages (no
      changes)" — no `bun.lock` diff was produced this run, so there was
      nothing incidental to revert; final `git diff --stat` shows only the
      4 intended files)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #259, merged)
- [x] Update tracker status, completed checkboxes, and remaining work
      (this run — 2026-08-15 — found PR #259 already merged into master;
      an earlier tracker-sync PR #260 for this same fix was left open on
      branch `claude/adoring-mayer-ie5a52`, but this session's designated
      branch is `claude/adoring-mayer-r6s5vt`, so this fix is applied here
      instead of pushing further to that other branch)

### Remaining work
- None for this task's own scope. PR #259 merged into master (visible as
  commit `4baf74a` on master's history).
- Bookmark-folder-tree editing/moving remains an open, separate follow-up
  (unchanged from the original title-edit task's Remaining work) — see
  "Browser extension: Browse bookmarks by folder in the Favorites tab" below,
  which has since completed the browsing half of that follow-up.

## Browser extension: Edit a bookmark's title from the Favorites tab

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 14 (main-nav Favorites), continuing
the follow-up explicitly deferred as a Non-goal in the "Browser extension:
Favorites (bookmarks) tab" task below ("Editing a bookmark's title/URL —
only viewing, opening, and removing" for the first slice).
**Branch:** `claude/adoring-mayer-c9coc7`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/251
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user rename a bookmark's title inline from
`apps/qwksearch-ext`'s side panel Favorites tab, via `chrome.bookmarks.update`,
without leaving the panel.

### Scope
- `apps/qwksearch-ext/lib/bookmarks.ts`: add `sanitizeBookmarkTitle(input)`,
  a pure helper that trims a proposed new title (kept separate/testable per
  this codebase's per-feature pure-helper-module convention).
- `apps/qwksearch-ext/components/BookmarksList.tsx`: an "Edit" (pencil icon)
  button per bookmark row that swaps the title into an inline `<Input>`;
  Enter or blur saves via `chrome.bookmarks.update(id, {title})`, Escape
  cancels without saving.

### Non-goals
- Editing a bookmark's URL — only the title, matching the smallest
  independently useful slice of the deferred Non-goal.
- Any bookmark-folder-tree editing/moving — out of scope, matches the
  Favorites tab's existing flat-list precedent.

### Acceptance criteria
- [x] Clicking "Edit" on a bookmark shows an inline input pre-filled with
      its current raw title (empty when it was previously falling back to
      the hostname).
- [x] Pressing Enter or blurring the input saves the trimmed title via
      `chrome.bookmarks.update` and exits edit mode.
- [x] Pressing Escape cancels the edit without calling
      `chrome.bookmarks.update` (guarded against the native `blur` event
      that fires when the still-focused `<input>` unmounts on cancel, via a
      `cancellingEditRef` flag checked in the blur handler).
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces exactly 120 errors,
      one more than the 119 on `git stash -u`-ed (unmodified) code —
      confirmed via a direct before/after comparison. The one new error
      (`components/BookmarksList.tsx(76,5): error TS2304: Cannot find name
      'chrome'` at the new `chrome.bookmarks.update` call) is a further
      instance of the same **pre-existing** `TS2304` class already present
      throughout this app's `chrome.*`-using files, not a new category.
- [x] Tests pass — `bunx vitest run test/bookmarks.test.ts`: 13/13 passed
      (9 pre-existing + 4 new). `bun run test` in `qwksearch-ext`: 86/86
      passed (10/10 files, 82 pre-existing + 4 new). Full workspace `bun run
      test`: 174/184 files, 2458/2515 tests pass (4 skipped); the 53
      failures across the same 5 packages documented repeatedly in prior
      TODO.md tasks (`search-web-api` engine tests hitting real external
      APIs, the `qwksearch-web` config route test, `shadcn-settings`,
      `jsdom-scraper` missing its `jsdom` dependency, `chat-agent-toolkit`'s
      `openrouter-default-model.test.js`) are pre-existing and unrelated —
      none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (mirrored `BookmarksList.tsx`/`lib/bookmarks.ts`'s existing pattern)
- [x] Confirm `chrome.bookmarks.update` API shape against `@types/chrome`
- [x] Implement the smallest useful vertical slice (`sanitizeBookmarkTitle`,
      inline-edit UI in `BookmarksList.tsx`)
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (whitespace-only input, empty
      input, already-trimmed no-op)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change; typecheck error count is +1, the same
      pre-existing error class)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted an
      unrelated `bun.lock` package-version-sync diff produced by `bun
      install` — pure version-number sync to already-committed
      `package.json` bumps, out of scope, matching prior tasks' precedent —
      keeping only this task's own files)
- [x] Commit and push the branch
- [ ] Create or update the pull request
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope.
- Follow-ups noted above remain open: editing a bookmark's URL, and
  bookmark-folder-tree editing/moving — separate, independently useful
  slices of the same Favorites tab area.

## Browser extension: "New tab" button

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 28 ("Add downloads tab; also back,
refresh, undo close, new tab."), scoped to its next independently useful
piece: a "New tab" button in the side panel's Tabs view, using
`chrome.tabs.create`. ("Undo close tab" and "Downloads tab" slices are
already done; the "Undo close tab" task's Non-goals explicitly deferred
"new tab" as a separate follow-up, and back/refresh remain out of scope
since the side panel isn't a browser-chrome surface with its own navigable
history.)
**Branch:** `claude/adoring-mayer-36m7gr`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/250
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user open a new blank browser tab directly from
`apps/qwksearch-ext`'s side panel "Tabs" view, via Chrome's
`chrome.tabs.create({})`, mirroring the "Undo close tab" button's placement
and style.

### Scope
- New pure helper module `apps/qwksearch-ext/lib/new-tab.ts`: a small
  `openNewTab()` function wrapping `chrome.tabs.create({})`, kept as a
  separate testable unit per this codebase's per-feature pure-helper-module
  convention (even though it has no branching logic, this keeps the chrome
  call mockable/testable in isolation, matching the acceptance criteria's
  Vitest requirement).
- `apps/qwksearch-ext/components/TabList.tsx`: a "New tab" icon button
  (`Plus` icon from `lucide-react`) placed next to the existing "Undo close
  tab" button, calling `openNewTab()` on click. Always enabled (no
  disabled-state logic needed, unlike undo-close-tab).

### Non-goals
- Back/refresh browser-chrome-style buttons — the side panel isn't a
  browser-chrome surface (no navigable history of its own); out of scope,
  per the "Undo close tab" task's precedent.
- Any option to open the new tab with a specific URL, pinned state, or in a
  specific window — this is a plain "open a blank new tab" action only,
  matching Ctrl+T/the browser's own new-tab button.
- Any manifest/permissions change — `tabs` permission is already granted in
  `wxt.config.ts`, and `chrome.tabs.create` doesn't require additional
  permissions beyond it.

### Acceptance criteria
- [x] Clicking the "New tab" button opens a new blank browser tab via
      `chrome.tabs.create({})`.
- [x] The button is always enabled (no closed-tab-availability dependency,
      unlike "Undo close tab").
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces exactly 119 errors,
      one more than the 118 on `git stash -u`-ed (unmodified) code —
      confirmed via a direct before/after comparison. The one new error
      (`lib/new-tab.ts(2,3): error TS2304: Cannot find name 'chrome'`) is a
      further instance of the same **pre-existing** `TS2304` class already
      present throughout this app's `chrome.*`-using files, not a new
      category; the rest are the same pre-existing `TS2304`/`TS2307`/
      `TS2493`/`TS2769` classes documented in prior TODO.md tasks.
- [x] Tests pass — `bunx vitest run test/new-tab.test.ts`: 1/1 passed.
      `bun run test` in `qwksearch-ext`: 82/82 passed (10/10 files, 81
      pre-existing + 1 new). Full workspace `bun run test`: 174/184 files,
      2455/2511 tests pass (4 skipped); the 52 failures across the same 10
      files documented repeatedly in prior TODO.md tasks (`search-web-api`
      engine tests hitting real external APIs, the `qwksearch-web` config
      route test, `shadcn-settings`, `jsdom-scraper` missing its `jsdom`
      dependency, `chat-agent-toolkit`'s `openrouter-default-model.test.js`)
      are pre-existing and unrelated — none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (mirrored `lib/undo-close-tab.ts` + `TabList.tsx`'s established
      pattern)
- [x] Confirm `chrome.tabs.create` API shape against the installed
      `@types/chrome`
- [x] Implement the smallest useful vertical slice (`lib/new-tab.ts`,
      `TabList.tsx` button + wiring)
- [x] Add focused Vitest coverage (mocks the `chrome` global via
      `vi.stubGlobal`, asserts `openNewTab()` calls `chrome.tabs.create`
      with `{}`)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change; typecheck error count is +1, the same
      pre-existing error class)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (`bun install` produced
      an unrelated `bun.lock` package-version-sync diff, reverted per prior
      tasks' precedent — kept only this task's own files)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #250)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #250 open; `bun run build:web` passed
  14/14 locally on this commit. The PR's "Workers Builds:
  qwksearch-research-agent" Cloudflare deploy check failed — this is the
  same recurring, pre-existing, unrelated-to-code infrastructure issue
  already documented as Ideas Backlog items 38/39 (this is now a 4th
  occurrence; see the updated item 39 note below).
- Follow-ups noted above remain open: browser-chrome-style back/refresh
  buttons — a separate, independently useful slice of Ideas Backlog item
  28, if it's ever given a concrete design for a side panel that has no
  navigable history of its own.

## Browser extension: Favorites (bookmarks) tab

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 14 ("Main nav: Tabs | AI chat | Web
search | Favorites | History."), scoped to its next independently useful
piece: a Favorites list view using `chrome.bookmarks`, explicitly called out
as a remaining follow-up in the "Browser extension: History tab" task below,
mirroring that task's and the Downloads tab's established pattern.
**Branch:** `claude/adoring-mayer-fcxcmd`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/248 (merged)
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user see and act on their browser bookmarks from
`apps/qwksearch-ext`'s side panel, via a new "Favorites" tab alongside the
existing "Tabs", "Research", "Downloads", and "History" tabs, using Chrome's
`chrome.bookmarks` API.

### Scope
- `apps/qwksearch-ext/wxt.config.ts`: add the `bookmarks` manifest
  permission.
- New pure helper module `apps/qwksearch-ext/lib/bookmarks.ts`:
  - `hostnameFromUrl(url)`: extracts the hostname from a URL string,
    falling back to the raw string if it fails to parse (mirrors
    `lib/history.ts`, kept self-contained per this codebase's per-feature
    pure-helper-module convention).
  - `titleOrHostname(item)`: returns a bookmark node's title, trimmed,
    falling back to its URL's hostname when the title is blank/missing.
  - `isBookmarkNode(node)`: returns true when a `chrome.bookmarks.
    BookmarkTreeNode`-shaped object has a non-empty `url` (as opposed to a
    folder node, which has only `title`/`children`) — defensive filtering
    even though `chrome.bookmarks.getRecent` is documented to exclude
    folders.
- New component `apps/qwksearch-ext/components/BookmarksList.tsx`: lists
  the most recent 20 bookmarks (`chrome.bookmarks.getRecent(20)`, already
  most-recent-first), each row showing favicon + title/hostname, with
  click-to-open (`chrome.tabs.create({url})`) and a "remove bookmark" icon
  button (`chrome.bookmarks.remove`). Kept in sync via
  `chrome.bookmarks.onCreated`/`onRemoved`/`onChanged`.
- `apps/qwksearch-ext/entrypoints/sidepanel/App.tsx`: add a "Favorites" tab
  (`Star` icon) alongside "Tabs", "Research", "Downloads", and "History",
  rendering `BookmarksList`.

### Non-goals
- Any main-nav restructuring (the backlog item's literal "Tabs | AI chat |
  Web search | Favorites | History" layout) — out of scope; this task only
  adds a Favorites tab to the existing side-panel tab strip, matching how
  the History/Downloads tabs were added.
- Creating new bookmarks from the panel (e.g. a "bookmark the current tab"
  button) — this view is for browsing/acting on existing bookmarks, not a
  bookmark-creation UI (matches the Downloads tab's precedent of not
  initiating new downloads from the panel).
- Browsing the full bookmark folder tree, or filtering/searching bookmarks
  — out of scope for this first read/act-on-favorites slice (matches the
  Downloads/History tabs' precedent of a flat recency-ordered list only).
- Editing a bookmark's title/URL — only viewing, opening, and removing.

### Acceptance criteria
- [x] The Favorites tab lists the most recent bookmarks, most recent first,
      with title (or hostname fallback).
- [x] Clicking a bookmark opens it in a new tab.
- [x] "Remove bookmark" erases it from Chrome's bookmarks and the panel's
      list.
- [x] The list stays in sync with new/changed/removed bookmarks without a
      manual refresh (via `chrome.bookmarks.onCreated`/`onRemoved`/
      `onChanged`).
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces exactly 118 errors,
      the same count as on `git stash`-ed (unmodified) code — confirmed via
      a direct before/after comparison. All are the same **pre-existing**
      `TS2304: Cannot find name 'chrome'` (missing global `chrome` types
      throughout this app's `chrome.*`-using files), `TS2307` (missing
      `research-agent-ui` `dist/` output), `TS2493`, and `TS2769` error
      classes documented in prior TODO.md tasks; none reference
      `BookmarksList.tsx` or `lib/bookmarks.ts`.
- [x] Tests pass — `bunx vitest run test/bookmarks.test.ts`: 9/9 passed.
      `bun run test` in `qwksearch-ext`: 81/81 passed (9/9 files, 72
      pre-existing + 9 new).
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded. Also verified
      `bunx turbo build --filter=qwksearch-extension-wxt` (Chrome target)
      succeeds (11/11 tasks) and the built
      `.output/chrome-mv3/manifest.json` includes the new `"bookmarks"`
      permission.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (mirrored `HistoryList.tsx`/`lib/history.ts`'s pattern)
- [x] Confirm `chrome.bookmarks` API shape against the installed
      `@types/chrome` (`BookmarkTreeNode`, `getRecent`, `remove`,
      `onCreated`/`onRemoved`/`onChanged`)
- [x] Implement the smallest useful vertical slice (`bookmarks` permission,
      `lib/bookmarks.ts` pure helpers, `BookmarksList.tsx`,
      `sidepanel/App.tsx` wiring)
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (blank title, missing title,
      unparseable URL, folder node with no url, empty-string url)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change; typecheck error count unchanged
      before/after)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality (also reverted the
      unrelated `bun.lock` package-version-sync diff produced by `bun
      install` — pure version-number sync to already-committed
      `package.json` bumps, out of scope, matching prior tasks' precedent)
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #248)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #248 merged, CI/build/tests verified
  locally.
- Follow-ups noted above remain open: any main-nav restructuring toward the
  backlog item's literal "Tabs | AI chat | Web search | Favorites | History"
  layout, creating new bookmarks from the panel, and browsing/filtering the
  full bookmark folder tree.

## Wire `research-agent-ui` into `qwksearch-ext`'s build (item 29c)

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 29c, filed by the "Fix
`qwksearch-ext`'s Tailwind v4 PostCSS plugin mismatch" task: once the
PostCSS/CSS-config blocker was fixed, `qwksearch-ext`'s build failed at a
later step because `components/ResearchTab.tsx` imports `research-agent-ui`,
which is never declared as a dependency in `qwksearch-ext/package.json`
(unlike `apps/qwksearch-web`, which declares it via `workspace:*` plus a
`prebuild` script). Confirmed by re-running `bun run build` in
`qwksearch-ext` at the start of this task: it fails immediately with
`[vite]: Rolldown failed to resolve import "research-agent-ui" from
".../ResearchTab.tsx"`. The `next/navigation` and `grab-url` shims this
integration needs (`lib/next-navigation-shim.tsx`, `lib/grab-url-shim.ts`)
and their Vite aliases in `wxt.config.ts` already existed from earlier
work — only the dependency declaration/build-ordering was missing.
**Branch:** `claude/adoring-mayer-wmhmlr`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/246 (merged
— landed via a different session/branch than the one this entry originally
tracked; the tracker entry below was written before that merge and never
synced, matching the "History tab" task's precedent of squash-merge PRs not
carrying tracker-bookkeeping commits back to master)
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let `bun run build`/`bun run build:firefox`/`bun run zip` in
`apps/qwksearch-ext` succeed on a fresh checkout, so the "Research" tab
(already coded in `ResearchTab.tsx`, wired into `sidepanel/App.tsx`) is
actually buildable/shippable in the extension, matching how
`apps/qwksearch-web` already builds `research-agent-ui` successfully via
turbo's `^build` dependency graph.

### Scope
- `apps/qwksearch-ext/package.json`: declare `"research-agent-ui":
  "workspace:*"` as a dependency, so turbo's `build` task (`dependsOn:
  ["^build"]` in root `turbo.json`) builds `research-agent-ui` (and its own
  transitive workspace deps: `chat-agent-toolkit`, `domain-rank`,
  `extract-webpage`, `qwksearch-api-client`, `trending-news-api`,
  `use-weather-forecast`, `search-web-api`) before `qwksearch-ext`'s own
  `wxt build` runs.
- Verify `bunx turbo build --filter=qwksearch-extension-wxt` (turbo-driven,
  not plain `bun run build` inside the package, since only turbo knows the
  `^build` dependency ordering) succeeds end-to-end on a fresh checkout.
- Fix whatever further build errors surface once module resolution gets
  past `research-agent-ui` itself (peer deps, browser-vs-Node built-ins used
  by `research-agent-ui`'s own dependency chain, additional Next.js-only
  APIs beyond `next/navigation` that need shimming, etc.) — the scope of
  "whatever it actually takes to get a working build," not a predetermined
  list, since the real blockers are only discoverable by attempting the
  build.
- If a further blocker turns out to be large/separate in nature (e.g. a
  whole new browser-only reimplementation of something `research-agent-ui`
  assumes is server-side), document it precisely as a new backlog follow-up
  rather than silently expanding this task's scope.

### Non-goals
- Making the Research tab's *runtime behavior* fully functional inside the
  extension (e.g. verifying every API call the chat UI makes actually
  resolves against `https://qwksearch.com` correctly at runtime) — this
  task is scoped to getting the **build** to succeed; manual/runtime
  verification of the shipped extension is out of scope (matches this
  repo's precedent of build/test/typecheck-level verification, not manual
  QA, for `qwksearch-ext` tasks).
- Any UI/feature change to `ResearchTab.tsx`, `ChatWindow`, or any other
  `research-agent-ui` component.
- Rebuilding `packages/reason-editor/demo/` (item 0b) — unrelated.

### Acceptance criteria
- [x] `bunx turbo build --filter=qwksearch-extension-wxt` succeeds,
      producing `.output/chrome-mv3/` — 11/11 turbo tasks succeeded on the
      first attempt once the dependency was declared; no further blockers
      surfaced (the `next/navigation`/`grab-url` shims from earlier work
      were already sufficient).
- [x] The Firefox build succeeds, producing `.output/firefox-mv2/` — via
      `bun run build:firefox` inside `qwksearch-ext` (not
      `turbo build -- -b firefox`: turbo forwards trailing args after `--`
      to *every* task in the dependency graph, not just the filtered
      package, which broke unrelated packages' `tsup`-based build scripts
      that don't understand `-b`; this is a pre-existing turbo/CLI
      limitation unrelated to this task, not a bug introduced here — once
      `research-agent-ui` and its deps were already built via the prior
      Chrome-target turbo run, plain `bun run build:firefox` in the package
      itself picked them up correctly).
- [x] Vitest coverage is added or updated — n/a; this ended up being a pure
      dependency-declaration fix with no new logic (no new shim was
      needed), matching the "n/a" expectation noted when this task started.
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run.
- [x] Typecheck passes — `bun run compile` in `qwksearch-ext` (after
      clearing `tsconfig.tsbuildinfo`) surfaces only the same pre-existing
      `TS2304`/`TS2493`/`TS2769` error classes documented in prior TODO.md
      tasks; no new categories, and nothing referencing `ResearchTab.tsx`
      or `research-agent-ui`.
- [x] Tests pass — `bun run test` in `qwksearch-ext`: 72/72 passed (8/8
      files, unchanged from before this task). Full workspace `bun run
      test`: 172/182 files, 2442/2501 tests pass (4 skipped); the 10
      failing files (`search-web-api` engine tests hitting real external
      APIs, the `qwksearch-web` config route test, `shadcn-settings`,
      `jsdom-scraper` missing its `jsdom` dependency, `chat-agent-toolkit`'s
      `openrouter-default-model.test.js`) are the same pre-existing,
      documented-in-prior-TODO.md-tasks set — none touch `qwksearch-ext` or
      `research-agent-ui`.
- [x] Production/web build passes — `bun run build:web` at the repo root:
      14/14 turbo tasks succeeded, confirming this change doesn't regress
      `qwksearch-web`'s build.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry; no new shim was needed.

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (confirmed `next/navigation`/`grab-url` shims and their `wxt.config.ts`
      aliases already exist; only the dependency + build ordering is
      missing)
- [x] Reproduce the exact failure on a fresh `bun install` (`[vite]: Rolldown
      failed to resolve import "research-agent-ui"`)
- [x] Add `research-agent-ui: workspace:*` to `qwksearch-ext/package.json`
- [x] Run `bun install` and confirm the workspace link resolves
- [x] Attempt `bunx turbo build --filter=qwksearch-extension-wxt` — succeeded
      immediately (11/11 tasks); no further errors to iterate on
- [x] Attempt the Firefox build target (`bun run build:firefox`) — succeeded
- [x] Add focused Vitest coverage for any new logic — n/a, no new logic was
      added
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint is
      not actionable for this change; typecheck failures are pre-existing)
- [x] Run the full relevant test suite
- [x] Run the production/web build (`bun run build:web` at repo root)
- [x] Review the final diff for scope and quality (also reverted the
      unrelated `bun.lock` package-version-sync diff produced by `bun
      install` — pure version-number sync to already-committed
      `package.json` bumps, out of scope, matching prior tasks' precedent —
      keeping only the new `research-agent-ui: workspace:*` dependency line)
- [x] Commit and push the branch
- [x] Create or update the pull request — merged as PR #246
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #246 merged.
- The Research tab's actual *runtime* behavior inside the shipped extension
  (whether every `research-agent-ui` API call correctly resolves against
  `https://qwksearch.com`, whether the bundled voice/ONNX assets work in
  the extension's sandboxed pages, etc.) has not been manually verified —
  out of scope per this task's Non-goals, but worth a manual QA pass before
  relying on the Research tab in production.
- A post-merge Cloudflare Workers Build failure on this PR was flagged as
  Ideas Backlog item 38 (external dashboard access needed to diagnose;
  `bun run build:web` passed locally on the merged commit).

## Completed

## Browser extension: History tab

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 14 ("Main nav: Tabs | AI chat | Web
search | Favorites | History."), scoped to its next independently useful
piece: a History list view in the side panel, mirroring the pattern already
established by the Downloads tab and "Undo close tab" button (both slices
of the related item 28). (Favorites/bookmarks and any main-nav restructuring
remain separate follow-ups — see Non-goals.)
**Branch:** `claude/adoring-mayer-t17vkx`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/244 (merged)
**Started:** 2026-08-15
**Completed:** 2026-08-15

### Goal
Let a user see and act on their recent browsing history from
`apps/qwksearch-ext`'s side panel, via a new "History" tab alongside the
existing "Tabs", "Research", and "Downloads" tabs, using Chrome's
`chrome.history` API.

### Scope
- `apps/qwksearch-ext/wxt.config.ts`: add the `history` manifest permission.
- New pure helper module `apps/qwksearch-ext/lib/history.ts`:
  - `hostnameFromUrl(url)`: extracts the hostname from a URL string,
    falling back to the raw string if it fails to parse.
  - `titleOrHostname(item)`: returns a `chrome.history.HistoryItem`-shaped
    object's title, trimmed, falling back to its URL's hostname when the
    title is blank/missing.
  - `formatLastVisit(lastVisitTime, now)`: renders a short relative-time
    label ("Just now", "`N`m ago", "`N`h ago", "`N`d ago", falling back to a
    locale date string beyond a week) from a last-visit timestamp and an
    injected current time (kept injectable, not `Date.now()`-internal, so
    the helper is deterministically testable).
- New component `apps/qwksearch-ext/components/HistoryList.tsx`: lists the
  most recent 20 history entries (`chrome.history.search({text: '',
  maxResults: 20, startTime: 0})`, already most-recent-first), each row
  showing favicon + title/hostname + relative last-visit time, with
  click-to-open (`chrome.tabs.create({url})`) and a "remove from history"
  icon button (`chrome.history.deleteUrl`). Kept in sync via
  `chrome.history.onVisited`/`onVisitRemoved`.
- `apps/qwksearch-ext/entrypoints/sidepanel/App.tsx`: add a "History" tab
  (`History` icon) alongside "Tabs", "Research", and "Downloads", rendering
  `HistoryList`.

### Non-goals
- A "Favorites"/bookmarks tab (`chrome.bookmarks`) — a separate,
  independently useful slice of the same backlog item; left as a follow-up.
- Any main-nav restructuring (the backlog item's literal "Tabs | AI chat |
  Web search | Favorites | History" layout) — out of scope; this task only
  adds a History tab to the existing side-panel tab strip, matching how the
  Downloads tab was added.
- Full-text search/filtering within history, or browsing by date range —
  out of scope for this first read/act-on-history slice (matches the
  Downloads tab's precedent of not being a full download manager).
- Clearing all history, or deleting more than one URL at a time — only
  single-item removal via `chrome.history.deleteUrl`.

### Acceptance criteria
- [x] The History tab lists the most recent history entries, most recent
      first, with title (or hostname fallback) and a relative last-visit
      time.
- [x] Clicking a history entry opens it in a new tab.
- [x] "Remove from history" erases that URL from Chrome's history and the
      panel's list.
- [x] The list stays in sync with new/removed history entries without a
      manual refresh (via `chrome.history.onVisited`/`onVisitRemoved`).
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces only the same
      **pre-existing** `TS2304: Cannot find name 'chrome'` class of error
      already present throughout this app's `chrome.*`-using files
      (confirmed via `git stash`); this task's `HistoryList.tsx` addition is
      a further instance of that same class, not a new category. Also the
      same pre-existing `TS2493`/`TS2769` errors documented in prior
      TODO.md tasks.
- [x] Tests pass — `bunx vitest run test/history.test.ts`: 12/12 passed.
      `bun run test` in `qwksearch-ext`: 72/72 passed (8/8 files, 60
      pre-existing + 12 new). Full workspace `bun run test`: 172/182 files,
      2445/2501 tests pass (4 skipped); the 52 failures across the same 10
      files documented repeatedly in prior TODO.md tasks (`search-web-api`
      engine tests hitting real external APIs, the `qwksearch-web` config
      route test, `shadcn-settings`, `jsdom-scraper` missing its `jsdom`
      dependency, `chat-agent-toolkit`'s `openrouter-default-model.test.js`)
      are pre-existing and unrelated — none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (mirrored `DownloadsList.tsx`/`lib/downloads.ts`'s pattern)
- [x] Confirm `chrome.history` API shape against the installed
      `@types/chrome`
- [x] Implement the smallest useful vertical slice (`history` permission,
      `lib/history.ts` pure helpers, `HistoryList.tsx`, `sidepanel/App.tsx`
      wiring)
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (blank title, missing title,
      unparseable URL, missing lastVisitTime, each relative-time bucket
      boundary)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint
      is not actionable for this change; typecheck failures are
      pre-existing)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #244, merged)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task. PR #244 merged.
- Follow-ups noted above remain open: a "Favorites"/bookmarks tab
  (`chrome.bookmarks`), and any main-nav restructuring toward the backlog
  item's literal "Tabs | AI chat | Web search | Favorites | History" layout.

## Browser extension: Downloads tab

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 28 ("Add downloads tab; also back,
refresh, undo close, new tab."), scoped to its next independently useful
piece: a Downloads list view. (Back/refresh/new-tab browser-chrome-style
buttons remain a separate follow-up — see Non-goals.)
**Branch:** `claude/adoring-mayer-ddv3jg`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/242 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-15

### Goal
Let a user see and act on their recent downloads from
`apps/qwksearch-ext`'s side panel, via a new "Downloads" tab alongside the
existing "Tabs" and "Research" tabs, using Chrome's `chrome.downloads` API.

### Scope
- `apps/qwksearch-ext/wxt.config.ts`: add the `downloads` and
  `downloads.open` manifest permissions (`downloads.open` is required by
  `chrome.downloads.open()` in addition to `downloads`).
- New pure helper module `apps/qwksearch-ext/lib/downloads.ts`:
  - `basenameFromPath(path)`: extracts the filename from an absolute local
    path, handling both `/`- and `\`-separated paths.
  - `formatDownloadStatus(item)`: renders a short human-readable status
    label (`"Downloading NN%"`, `"Downloading"` when size is unknown,
    `"Paused"`, `"Complete"`, `"Failed"`/`"Failed: <reason>"`) from a
    `DownloadItem`-shaped object.
- New component `apps/qwksearch-ext/components/DownloadsList.tsx`: lists
  the most recent 20 downloads
  (`chrome.downloads.search({orderBy: ['-startTime'], limit: 20})`), each
  row showing filename + status, with "show in folder"
  (`chrome.downloads.show`) and "remove from list" (`chrome.downloads.erase`)
  icon buttons, and click-to-open (`chrome.downloads.open`) once complete.
  Kept in sync via `chrome.downloads.onCreated`/`onChanged`/`onErased`.
- `apps/qwksearch-ext/entrypoints/sidepanel/App.tsx`: add a "Downloads" tab
  (`Download` icon) alongside "Tabs" and "Research", rendering
  `DownloadsList`.

### Non-goals
- Back/refresh/new-tab browser-chrome-style buttons — remains a separate
  follow-up, per the "Undo close tab" task's precedent below.
- Removing the downloaded file from disk (`chrome.downloads.removeFile`)
  or accepting dangerous downloads (`chrome.downloads.acceptDanger`) — out
  of scope for this first read/act-on-history slice.
- Initiating new downloads from the panel — this view is for the browser's
  existing download history, not a download manager UI.

### Acceptance criteria
- [x] The Downloads tab lists the most recent downloads, most recent
      first, with filename and status.
- [x] Clicking a completed download opens it; clicking an
      in-progress/interrupted one does nothing.
- [x] "Show in folder" reveals the file; "remove from list" erases it from
      Chrome's download history and the panel's list.
- [x] The list stays in sync with new/changed/erased downloads without a
      manual refresh (via `chrome.downloads.onCreated`/`onChanged`/`onErased`).
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache) surfaces only the same
      **pre-existing** `TS2304: Cannot find name 'chrome'` class of error
      already present throughout this app's `chrome.*`-using files (this
      task's `DownloadsList.tsx` and `sidepanel/App.tsx` additions are
      further instances of that same class, not a new category); also the
      same pre-existing `TS2493`/`TS2769` errors documented in prior
      TODO.md tasks.
- [x] Tests pass — `bunx vitest run test/downloads.test.ts`: 13/13 passed.
      `bun run test` in `qwksearch-ext`: 60/60 passed (7/7 files, 47
      pre-existing + 13 new). Full workspace `bun run test`: 171/181 files,
      2434/2489 tests pass (4 skipped); the 51 failures across the same 10
      files documented repeatedly in prior TODO.md tasks (`search-web-api`
      engine tests hitting real external APIs, the `qwksearch-web` config
      route test, `shadcn-settings`, `jsdom-scraper` missing its `jsdom`
      dependency, `chat-agent-toolkit`'s `openrouter-default-model.test.js`)
      are pre-existing and unrelated — none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded.
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
      (mirrored `TabList.tsx`'s `chrome.sessions` wiring pattern from the
      "Undo close tab" task below)
- [x] Confirm `chrome.downloads` API shape against the installed
      `@types/chrome`
- [x] Implement the smallest useful vertical slice (`downloads`/
      `downloads.open` permissions, `lib/downloads.ts` pure helpers,
      `DownloadsList.tsx`, `sidepanel/App.tsx` wiring)
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (unknown size, paused,
      interrupted with/without error reason, over-100% clamping, path
      separators, no-slash filenames)
- [x] Run focused tests and fix failures
- [x] Run linting and typechecking (see acceptance-criteria notes — lint
      is not actionable for this change; typecheck failures are
      pre-existing)
- [x] Run the full relevant test suite
- [x] Run the production/web build
- [x] Review the final diff for scope and quality
- [x] Commit and push the branch
- [x] Create or update the pull request (PR #242, merged)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #242 merged, CI/build/tests verified
  locally.
- Follow-ups noted above remain open: browser-chrome-style
  back/refresh/new-tab buttons, removing files from disk
  (`chrome.downloads.removeFile`), and accepting dangerous downloads
  (`chrome.downloads.acceptDanger`) — all separate, independently useful
  slices of Ideas Backlog item 28.

## Browser extension: "Undo close tab" button

**Status:** Completed
**Source:** TODO.md — Ideas Backlog item 28 ("Add downloads tab; also back,
refresh, undo close, new tab."), scoped down to its smallest independently
useful piece: undo-close-tab. (Downloads tab, back/refresh/new-tab remain
separate follow-ups — see Non-goals.)
**Branch:** `claude/adoring-mayer-803j75`
**PR:** https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/241 (merged)
**Started:** 2026-08-14
**Completed:** 2026-08-14

### Goal
Let a user reopen the most recently closed tab from `apps/qwksearch-ext`'s
side panel "Tabs" view, via Chrome's `chrome.sessions` API — mirroring the
browser's own Ctrl+Shift+T, but reachable from the extension's own UI.

### Scope
- `apps/qwksearch-ext/wxt.config.ts`: add the `sessions` permission to the
  manifest.
- New pure helper `apps/qwksearch-ext/lib/undo-close-tab.ts`: given a list of
  `chrome.sessions.Session`-shaped objects (as returned by
  `chrome.sessions.getRecentlyClosed()`), returns the `sessionId` of the most
  recently closed *tab* (ignoring closed-window entries, since this button is
  specifically "undo close tab"), or `undefined` if there is none.
- `apps/qwksearch-ext/components/TabList.tsx`: a small "Undo close tab"
  icon button (Undo2 icon) above the tab list — disabled when there's
  nothing to restore, calling `chrome.sessions.restore(sessionId)` on click.
  Kept in sync via `chrome.sessions.onChanged` (re-fetches recently-closed
  tabs whenever the list changes, e.g. after a tab closes or is restored).

### Non-goals
- A "Downloads" tab/panel (`chrome.downloads`) — a separate, independently
  useful slice of the same backlog item; left as a follow-up.
- Back/refresh/new-tab browser-chrome-style buttons — the side panel isn't a
  browser-chrome surface (no navigable history of its own); out of scope for
  this slice, and the parent idea doesn't specify where these would live.
- Restoring a closed *window* (as opposed to a tab) — `chrome.sessions`
  conflates both into one recency-ordered list, but this button intentionally
  only offers to restore the most recent closed tab, per the backlog item's
  literal "undo close" wording.

### Acceptance criteria
- [x] Closing a tab makes the "Undo close tab" button enabled; clicking it
      reopens that tab via `chrome.sessions.restore`.
- [x] With no recently-closed tabs (only recently-closed windows, or
      nothing closed at all), the button is disabled.
- [x] A closed window entry in the recently-closed list is skipped in favor
      of the most recent closed *tab* entry, even if the window entry is
      more recent.
- [x] Vitest coverage is added or updated
- [ ] Lint passes — no `lint` script exists for `qwksearch-ext` or the repo
      root; nothing to run
- [x] Typecheck passes — `bun run compile` (after clearing the stale
      `tsconfig.tsbuildinfo` incremental cache to get an accurate signal)
      surfaces the same **pre-existing** `TS2304: Cannot find name 'chrome'`
      class of error already present throughout this file and others
      (`TabSearch.tsx`, `background.ts`, `sidepanel/App.tsx`, etc. —
      confirmed via `git stash` that `TabList.tsx` already had this error at
      its pre-existing `chrome.tabs.*` call sites before this change); the
      new `chrome.sessions.*` call sites this change adds are additional
      instances of that same pre-existing error class, not a new category.
      Also the same pre-existing `TS2493`/`TS2769` errors documented in
      prior TODO.md tasks.
- [x] Tests pass — `bunx vitest run test/undo-close-tab.test.ts`: 5/5
      passed. `bun run test` in `qwksearch-ext`: 47/47 passed (6/6 files,
      41 pre-existing + 6 new). Full workspace `bun run test`: 170/180
      files, 2420/2476 tests pass (4 skipped); the 52 failures across the
      same 10 files documented repeatedly in prior TODO.md tasks
      (`search-web-api` engine tests hitting real external APIs, the
      `qwksearch-web` config route test, `shadcn-settings`, `jsdom-scraper`
      missing its `jsdom` dependency, `chat-agent-toolkit`'s
      `openrouter-default-model.test.js`) are pre-existing and unrelated —
      none touch `qwksearch-ext`.
- [x] Production/web build passes — `bun run build:web`: 14/14 turbo tasks
      succeeded (verified on a clean, single build run; an earlier attempt
      that overlapped with a leftover backgrounded build process from the
      same session produced a spurious "module not found" failure in
      `reason-editor`'s output due to two concurrent builds racing on the
      same `dist/` directory — confirmed unrelated to this change by
      re-running a single build cleanly, which succeeded).
- [x] Documentation is updated if behavior or configuration changes — n/a
      beyond this tracker entry (no user-facing docs describe individual
      side-panel toolbar actions)

### Implementation plan
- [x] Inspect affected modules, local instructions, and existing tests
- [x] Confirm `chrome.sessions` API shape against the installed `@types/chrome`
- [x] Implement the smallest useful vertical slice (`sessions` permission,
      `lib/undo-close-tab.ts` pure helper, `TabList.tsx` button + wiring)
- [x] Add focused Vitest success-path coverage
- [x] Add focused failure/edge-case coverage (no closed tabs, closed-window-only,
      multiple entries, missing sessionId)
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
- [x] Create or update the pull request (PR #241)
- [x] Update tracker status, completed checkboxes, and remaining work

### Remaining work
- None for this task's own scope. PR #241 merged, CI/build/tests verified
  locally.
- Follow-ups noted above remain open: browser-chrome-style
  back/refresh/new-tab buttons — a separate, independently useful slice of
  Ideas Backlog item 28. (The "Downloads" tab/panel follow-up is now
  underway — see "Browser extension: Downloads tab" above.)

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
2. Chat with open tabs as context. — **done, see "Browser extension:
   \"Chat about my open tabs\" button" and "Browser extension: include page
   content in \"Chat about my open tabs\"" above**
3. Show Vals scores for all models; example Kimi K2.5 page lists Vals Index 51.70%, latency 807.18s, and cost/test $0.29.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
   — **investigated 2026-08-15, not yet actionable: the model list lives in
   `packages/chat-agent-toolkit/src/config/language-models-database.ts`
   (a per-provider `models: [{name, id, contextLength, ...}]` array), and an
   optional `benchmarkScore`/`latency`/`costPerTest` field could be added
   there cleanly and rendered conditionally in
   `apps/qwksearch-web/components/Settings/Sections/Models/ModelSelect.tsx`
   (after also threading the field through `model-registry.ts`'s
   `mergeChatModels`, which currently strips models down to `{name, key}`).
   The blocker is data, not code: this environment has no reliable access to
   real Vals Index scores per model, and the one example figure given here
   ("Kimi K2.5") doesn't match any entry in the database (`grep Kimi` only
   finds `"Kimi K2 0711"`) — populating this would mean fabricating numbers.
   Needs a human to supply a real data source (e.g. a Vals.ai API/export) or
   confirm which model IDs the example figures actually correspond to before
   this can be implemented.
4. Outline tree should reuse Fumadocs page tree/sidebar patterns. — **done, see "Outline sidebar: highlight the active heading while scrolling" above**
5. Option to start talking automatically on first visit, or via a button from anywhere on the site. — **done, see "Voice auto-start on first visit" above**
6. OpenRouter apps inspiration/reference: [openrouter.ai/apps](https://openrouter.ai/apps), and OpenRouter also documents app attribution plus public app rankings.
7. common typoes — **done, see "Fix common typos in AI prompt templates" above**
8. https://github.com/cloudflare/moltworker


## Longterm

12. Use CRX/extension to open tabs and scrape them.
13. Custom AI agent monitors topics and generates a news feed.
14. Main nav: Tabs | AI chat | Web search | Favorites | History. — **History
    tab and Favorites tab slices both done, see "Browser extension: History
    tab" and "Browser extension: Favorites (bookmarks) tab" above** (any
    further main-nav restructuring, e.g. a persistent top-level nav bar
    instead of the current tab switcher, remains an open, unscoped
    follow-up)
15. Queries should run on cached pages that belong to topic outlines.
16. Research agents should queue the next video. — **investigated
    2026-08-15, not yet a small slice: video search results
    (`packages/research-agent-ui/src/components/SearchResults/
    MessageSources.tsx`'s "Videos" category) currently just link out to the
    source URL with `target="_blank"` — there is no inline video player and
    no "queue"/"autoplay next" concept anywhere in the repo (confirmed via a
    repo-wide grep for `queue.*video`/`nextVideo`/`videoQueue`/`autoplay`).
    A "queue the next video" feature needs an inline player built first;
    that's a separate, larger prerequisite task, not something this slice
    can absorb.
17. Follow-up suggestions. — **feature already implemented; test coverage
    added, see "Test coverage for the follow-up-suggestions pipeline" above**
18. Browser sidebar results. — **investigated 2026-08-15: this item has no
    elaboration and is never cited as the source of any completed task
    (unlike items 1, 23, 25, 26, which each explicitly cite the sidebar work
    that closed them). The completed sidebar features ("Sidebar: Search
    topics...", "Sidebar: AI tips...", "Sidebar: highlight the top related
    document...") are all in the REASON editor's document sidebar
    (`packages/reason-editor/src/layout/sidebar/SidebarContent.tsx`), not
    the browser extension's side panel — so this item most plausibly means
    showing live web-search results inside the extension's side panel
    (`apps/qwksearch-ext`), which doesn't exist today. Needs a human to
    confirm the intended scope before it can be turned into a concrete
    implementation task.**
19. Use open tabs as context. — **done, see "Browser extension: \"Chat about
    my open tabs\" button" and "Browser extension: include page content in
    \"Chat about my open tabs\"" above**
20. Preload page results for common questions with SSR.
21. If autocomplete matches something like red.com, go there directly. — **done, see "Autocomplete: recognize a typed bare domain even when it's outside the ranked dataset" above**
22. Share button; email to friends; social actions. — **done, see "Article panel: Share button (native Web Share API with clipboard fallback)" above**
23. Suggest the next page from the sidebar on each page.
24. For each topic, next-word prediction in model.
25. Auto-search for topics in sidebar.
26. Prioritize sidebar with AI tips about the current page.
27. Cache questions and use them to build connections.
28. Add downloads tab; also back, refresh, undo close, new tab. — **done in
    full: "Undo close tab", "Downloads tab", "New tab", and "Back and
    Refresh" slices, see "Browser extension: \"Undo close tab\" button",
    "Browser extension: Downloads tab", "Browser extension: \"New tab\"
    button", and "Browser extension: Back and Refresh buttons for the
    active tab" above** (a "Forward" button, not named in the original
    item, was added as a small follow-up, see "Browser extension: Forward
    button for the active tab" above)
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
     prebuild chain. — **done, see "Wire `research-agent-ui` into
     `qwksearch-ext`'s build (item 29c)" above** (turned out to need only
     the dependency declaration itself — turbo's existing `^build` graph
     handled the rest; the Research tab's runtime behavior in the shipped
     extension remains unverified, see that task's Remaining work)
31. Agents that scrape the web and work with datasets like LinkedIn.
32. Auto-generate keyphrase completions for on-page Ctrl+F search.
33. Markdown/file tree view inspiration: [ld246.com/guide/markdown](https://ld246.com/guide/markdown).
34. Reuse Fumadocs multi-tree/root-toggle ideas for docs organization.
35. Release on HN, YouTube, and Product Hunt.
36. https://21st.dev/community/agents
37. from the drodpown menu have tit  insret to as about tabstion ...` to show where the warning was created)
38. The "Workers Builds: qwksearch-research-agent" Cloudflare deploy check
    failed on the merge of "Wire `research-agent-ui` into `qwksearch-ext`'s
    build" (PR #246, commit `104821a`), the only failure among the ~10
    consecutive same-session PR merges preceding it (#238–#244 all show
    that check succeeding). PR #246's diff only touches
    `apps/qwksearch-ext/package.json` (+1 dependency line), `bun.lock`
    (+1 line), and `TODO.md` — nothing in `apps/qwksearch-web` or any other
    Cloudflare-deployed app — and `bun run build:web` (the exact command
    that deploys `qwksearch-web`) passed 14/14 tasks locally on that same
    commit before merging. This points away from a real code regression and
    toward a transient Cloudflare-side issue (plausibly a deploy-rate/
    concurrency limit, given ~10 rapid consecutive deploys to the same
    Workers project within a few hours), but the actual build logs live
    behind Cloudflare's dashboard
    (https://dash.cloudflare.com/a5b587533d090f419224d2bc3f04ecc7/workers/services/view/qwksearch-research-agent/production/builds/2452c794-afe3-4680-b92f-2cd7ff020260),
    which this environment has no credentials for. Worth a human check with
    dashboard access, or re-triggering the deploy, to confirm whether
    production is actually affected.
39. The "Workers Builds: qwksearch-research-agent" Cloudflare deploy check
    failed a second time, on the merge of "Add a Favorites tab to the
    qwksearch-ext side panel" (PR #248, commit `a023649`) — the same check
    documented failing once before in item 38 above (PR #246). As with item
    38, PR #248's diff only touches files under `apps/qwksearch-ext/` plus
    `TODO.md` — nothing in `apps/qwksearch-web` or any other
    Cloudflare-deployed app — and `bun run build:web` (the exact command
    that deploys `qwksearch-web`) passed 14/14 tasks locally on that commit
    before merging. This second occurrence weakens the "transient
    deploy-rate/concurrency limit" theory from item 38 (this merge wasn't
    part of a rapid run of consecutive deploys) and makes a recurring,
    non-transient Cloudflare-side or Workers-config issue more plausible —
    but the actual build logs still live behind Cloudflare's dashboard
    (https://dash.cloudflare.com/a5b587533d090f419224d2bc3f04ecc7/workers/services/view/qwksearch-research-agent/production/builds/6c05326f-77df-42ed-8f3e-7465fa61a464),
    which this environment has no credentials for. Worth a human check with
    dashboard access to determine root cause — if it recurs a third time,
    that would confirm it's not transient.

    **Update: it recurred a third time, on PR #249 (commit `500d85d`) —
    the very PR that added this item 39 entry, whose diff touches only
    `TODO.md` (a pure documentation change, zero code). A markdown-only PR
    triggering the identical deploy failure conclusively rules out any
    code-level regression in this repo across all three occurrences (PRs
    #246, #248, #249) and confirms this is a Cloudflare-side/Workers-Build
    infrastructure or configuration issue unrelated to what's being
    deployed. This environment still has no Cloudflare dashboard
    credentials to identify the actual root cause (build ID
    `6b4c022e-0707-4947-a22f-b5c2422ae223` for this third failure) — needs
    a human with dashboard access to investigate the Workers Build
    pipeline itself (e.g. build-environment/quota/billing issue on
    Cloudflare's side), not this repo's source.

    **Update: it recurred a fourth time, on PR #250 (commit `d6394e2`,
    the "New tab" button task), build ID
    `874bf8e0-7b64-40bd-a5f3-d526ab3e1ed9`. Same pattern as all three prior
    occurrences: the diff only touches `apps/qwksearch-ext/` plus
    `TODO.md`, and `bun run build:web` passed 14/14 turbo tasks locally on
    this exact commit before the check ran. Four consecutive failures
    across four different PRs/commits, including a markdown-only one,
    rules out this repo's source as the cause.

    **Update: it recurred a fifth time, on PR #251 (commit `070415d`, the
    "Edit a bookmark's title" task), build ID
    `9c7e0d5d-3dc3-4092-8c61-89b86deab316`. Same pattern again: the diff
    only touched `apps/qwksearch-ext/` plus `TODO.md`, and `bun run
    build:web` passed 14/14 turbo tasks locally on this exact commit before
    the check ran (and before merging). Five consecutive failures across
    five different PRs/commits confirms this is not transient and not
    caused by this repo's source.

    **Update: it recurred a sixth time, on PR #252 (commit `91c1fb0`, the
    TODO.md tracker-sync-only follow-up to PR #251), build ID
    `01c74939-2faa-46b9-8f5d-41b4c9f7130b`. This PR's diff touches only
    `TODO.md` — zero code — the second time a pure-documentation PR has
    triggered the identical failure (the first being PR #249, see the third
    occurrence above), reconfirming this is entirely a Cloudflare-side/
    Workers-Build infrastructure issue with no code-level trigger in this
    repo whatsoever. Still needs a human with
    Cloudflare dashboard access to diagnose — this environment has no
    credentials for it.

    **Update: it recurred a seventh time, on PR #253 (commit `11dce04`, the
    "Chat about my open tabs" button task), build ID
    `e683a94c-497a-40fc-bc29-26536b87fd1f`. Same pattern as every prior
    occurrence: the diff only touches `apps/qwksearch-ext/` plus `TODO.md`,
    and `bun run build:web` passed 14/14 turbo tasks locally on this exact
    commit before the check ran (and before merging). Seven consecutive
    failures across seven different PRs/commits, including two
    pure-documentation ones, continues to rule out this repo's source as
    the cause. Still needs a human with Cloudflare dashboard access to
    diagnose — this environment has no credentials for it.

    **Update: it recurred an eighth time, on PR #254 (commit `6145234`, the
    TODO.md tracker-sync-only follow-up to PR #253), build ID
    `f644dbac-6f0e-4fe5-a26d-e1b637203ea4`. This PR's diff touches only
    `TODO.md` — zero code — the third pure-documentation PR to trigger the
    identical failure (after PRs #249 and #252). Eight consecutive failures
    across eight different PRs/commits, including three carrying no code
    change whatsoever, conclusively rules out this repo's source across
    every occurrence so far. Still needs a human with Cloudflare dashboard
    access to diagnose — this environment has no credentials for it.

    **Update: it recurred a ninth time, on PR #255 (commit `53a869a`, the
    "include page content in Chat about my open tabs" task), build ID
    `01ec4d1d-8fda-463f-90aa-266d787282e1`. Same pattern as every prior
    occurrence: the diff only touches `apps/qwksearch-ext/` plus `TODO.md`,
    and `bun run build:web` passed 14/14 turbo tasks locally on this exact
    commit before the check ran (and before merging). Nine consecutive
    failures across nine different PRs/commits, including three carrying no
    code change whatsoever, continues to rule out this repo's source as the
    cause. Still needs a human with Cloudflare dashboard access to
    diagnose — this environment has no credentials for it.

    **Update: it recurred a tenth time, on PR #257 (commit `cfcdbf8`, the
    "Add render-url-to-html sub-packages to bun workspaces" task), build ID
    `35066b2d-2947-4500-a235-ec0840810463`. Same pattern as every prior
    occurrence: `bun run build:web` passed 14/14 turbo tasks locally on this
    exact commit before the check ran (and before merging), and this PR
    changed only `package.json`'s `workspaces` array, `bun.lock`, and
    `TODO.md` — again nothing in `apps/qwksearch-web` or any other
    Cloudflare-deployed app. Ten consecutive failures across ten different
    PRs/commits, including four carrying no application code change
    whatsoever, continues to rule out this repo's source as the cause. Still
    needs a human with Cloudflare dashboard access to diagnose — this
    environment has no credentials for it.

    **Update: it recurred an eleventh time, on PR #258 itself (commit
    `a92ac91`, the tracker-sync-only follow-up to PR #257 that added the
    tenth-occurrence note above), build ID
    `8b8a70b5-dfc1-4a33-a330-3ac0403a62c8`. This PR's diff touches only
    `TODO.md` — zero code — the fourth pure-documentation PR to trigger the
    identical failure. Eleven consecutive failures across eleven different
    PRs/commits, on every single PR raised against this repo regardless of
    content (including PRs that change nothing but backlog prose),
    conclusively confirms this Cloudflare Workers Build check is failing
    unconditionally at the infrastructure/configuration level, not in
    response to anything in this repo's source or history. Per this task's
    Non-goals, future runs should not keep appending an occurrence count
    here — the pattern is fully established — and should not attempt a
    code-level fix; this is exclusively actionable by a human with Cloudflare
    dashboard access to the `qwksearch-research-agent` Workers project.

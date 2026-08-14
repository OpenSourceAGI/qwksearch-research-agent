## In Progress

_(none — see Completed below; a new task will be selected from the Ideas
Backlog on the next run)_

## Completed

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
- None for this task. PR #231 open, CI/build/tests verified locally.

## Completed

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

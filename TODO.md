
ext - dl to reason dl folswe
1. in sidebar, have it sugegst related by keywords
2. Chat with open tabs as context.
3. Show Vals scores for all models; example Kimi K2.5 page lists Vals Index 51.70%, latency 807.18s, and cost/test $0.29.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
4. Outline tree should reuse Fumadocs page tree/sidebar patterns.
7. Option to start talking automatically on first visit, or via a button from anywhere on the site.
8. OpenRouter apps inspiration/reference: [openrouter.ai/apps](https://openrouter.ai/apps), and OpenRouter also documents app attribution plus public app rankings.
10. common typoes
11. https://github.com/cloudflare/moltworker
40. `apps/qwk-vscode-ext/webview-ui`'s `bun run build` fails: `Cannot find package '@vitejs/plugin-react'` — it's declared in that dir's package.json but not installed (not hoisted to root node_modules either). Repro: `bun run build` from repo root, or `cd apps/qwk-vscode-ext/webview-ui && bun run build`. Discovered while verifying #39; out of scope there since it's unrelated to react-reason-editor.
41. Root `bun run test` (workspace vitest 4.1.10) shows ~32 failing test files under `apps/qwksearch-web` — Cloudflare KV-binding tests throw "KV binding not available" and a `/api/config` route test expects 200 but gets 500. Running that app's own local `vitest` (v3.2.7, via `apps/qwksearch-web`'s own `vitest.config.ts`) directly against the same files passes cleanly, so this looks like a version/config mismatch between the root workspace's vitest and the app's own vitest rather than a real app bug. Repro: `bun run test` from repo root vs. `cd apps/qwksearch-web && bunx vitest run lib/notebooklm/__tests__/credentials.test.ts app/api/config/__tests__/route.test.ts`. Discovered while verifying #39; out of scope there since it's unrelated to react-reason-editor.


## Completed

5. Filter outline — fixed: filtering already existed in the sidebar outline panel, but it dropped headings that matched only via body text and mis-hid items when a filter was active (index mismatch between the filtered list and the full outline). See packages/react-reason-editor/src/search/OutlineView.tsx and SidebarContent.tsx.

9. Reasoning view zoom default at 125% — fixed: the zoom control defaulted to 100% and reset on every reload since it wasn't persisted. Default is now 125% and the chosen zoom level persists across sessions via localStorage (`REASON-zoom`), applied on mount. See packages/react-reason-editor/src/extensions/Zoom/components/RichTextZoom.tsx. PR: https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/189

6. Find/replace across all docs — added: a "Find & Replace in All Docs" dialog, reachable from the ⌘K/Ctrl+K command palette, searches every document's content and lets you replace all occurrences across every matching document in one action (with a per-document match preview and an explicit confirmation step), including the document currently open in the editor. See packages/react-reason-editor/src/search/findReplaceAllDocs.ts, FindReplaceAllDialog.tsx, and the wiring in useReasonDocsState.ts/ReasonDocs.tsx/ReasonDocsDialogs.tsx/SearchModal.tsx. PR: https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/192

38. Follow-up to #6 (Find/replace across all docs) — fixed: a confirmed replace now also applies to the document currently open in the editor, instead of skipping it. `TiptapEditorWrapper` accepts a `reloadToken` prop (independent of `contentKey`/document id) that forces its reload effect to re-sync `content` into the editor; `useReasonDocsState`'s `handleReplaceInAllDocuments` bumps that token whenever the active document is among the replaced ones, via the new pure `shouldReloadOpenDocument` helper. See packages/react-reason-editor/src/editor/computeStableKey.ts, TiptapEditorWrapper.tsx, EditorArea.tsx, useReasonDocsState.ts, and packages/react-reason-editor/src/search/findReplaceAllDocs.ts. Tests: computeStableKey.test.ts, findReplaceAllDocs.test.ts. Known unrelated pre-existing gap: `packages/react-reason-editor`'s `build:lib`/`tsc --noEmit` were already broken on master before this change — see #39.

39. `react-reason-editor`'s `build:lib` and `tsc --noEmit` failures — fixed: (1) `vite.config.ts`'s entry-glob ignored `*.spec.ts` but this repo's tests are named `*.test.ts`, so `Zoom/components/RichTextZoom.test.ts` falsely registered a required (nonexistent) `extensions/Zoom/Zoom.ts` entry — now `*.test.ts` is ignored too; (2) `tsconfig.json` was missing the `react-reason-editor/wordcount` path mapping present in the vite self-reference resolver; (3) `InviteModal.tsx` passed a `string | null` `shareLink` into a `string | undefined` field; (4) `Pagination.ts`'s `@ts-expect-error` suppressed the wrong line; (5) `FileTree`'s dead, unused `onNewFile`/`onNewFolder` props were destructured under mismatched `_`-prefixed names; (6) the orphaned, syntactically-invalid `src/types/constants.types.ts` (unused anywhere, duplicating the real constants in `src/constants/index.ts`) was deleted. See packages/react-reason-editor/{vite.config.ts,tsconfig.json,src/dialogs/InviteModal.tsx,src/extensions/Pagination/Pagination.ts,src/file-tree/filetree.tsx}. Test: vite.config.test.ts. Known unrelated pre-existing gap: `apps/qwk-vscode-ext/webview-ui` fails `bun run build` with `Cannot find package '@vitejs/plugin-react'` (declared in its package.json but not installed) — untouched by this change; and the root `bun run test` shows ~32 failing test files in `apps/qwksearch-web` (Cloudflare KV bindings unavailable outside Workers runtime, and a route test mismatch) that also fail identically when that app's own local `vitest` is run directly, unrelated to any package this fix touches.

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
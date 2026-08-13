
ext - dl to reason dl folswe
1. in sidebar, have it sugegst related by keywords
2. Chat with open tabs as context.
3. Show Vals scores for all models; example Kimi K2.5 page lists Vals Index 51.70%, latency 807.18s, and cost/test $0.29.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
4. Outline tree should reuse Fumadocs page tree/sidebar patterns.
7. Option to start talking automatically on first visit, or via a button from anywhere on the site.
8. OpenRouter apps inspiration/reference: [openrouter.ai/apps](https://openrouter.ai/apps), and OpenRouter also documents app attribution plus public app rankings.
10. common typoes
11. https://github.com/cloudflare/moltworker


## Completed

5. Filter outline — fixed: filtering already existed in the sidebar outline panel, but it dropped headings that matched only via body text and mis-hid items when a filter was active (index mismatch between the filtered list and the full outline). See packages/react-reason-editor/src/search/OutlineView.tsx and SidebarContent.tsx.

9. Reasoning view zoom default at 125% — fixed: the zoom control defaulted to 100% and reset on every reload since it wasn't persisted. Default is now 125% and the chosen zoom level persists across sessions via localStorage (`REASON-zoom`), applied on mount. See packages/react-reason-editor/src/extensions/Zoom/components/RichTextZoom.tsx. PR: https://github.com/OpenSourceAGI/qwksearch-research-agent/pull/189

6. Find/replace across all docs — added: a "Find & Replace in All Docs" dialog, reachable from the ⌘K/Ctrl+K command palette, searches every document's content and lets you replace all occurrences across every matching document in one action (with a per-document match preview and an explicit confirmation step). The document currently open in the editor is intentionally excluded from the bulk replace and flagged in the UI, since its in-memory editor state isn't reloaded from an external content change and would otherwise silently overwrite the replacement on its next autosave — use the existing in-editor Find & Replace for that one. See packages/react-reason-editor/src/search/findReplaceAllDocs.ts, FindReplaceAllDialog.tsx, and the wiring in useReasonDocsState.ts/ReasonDocs.tsx/ReasonDocsDialogs.tsx/SearchModal.tsx.

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
38. Follow-up to #6 (Find/replace across all docs): also apply a confirmed replace to the document currently open in the editor. Today it's skipped because `TiptapEditorWrapper`/`useSyncStore` only reload editor content when the document ID (`contentKey`) changes, so an external content change to the open doc would be silently overwritten by the editor's own debounced autosave. Needs a safe way to force the editor to reload content after an external update (e.g. bump a reload token independent of doc ID) before this doc can be included.
39. `packages/react-reason-editor`'s `build:lib` script (`vite build`) fails on master independent of any TODO work: `src/extensions/Zoom/Zoom.ts` is referenced as a build entry but doesn't exist, and there are several pre-existing TypeScript errors (`src/dialogs/InviteModal.tsx`, `src/editor-views/components/Toolbar.tsx` and `config/pluginRegistry.tsx` importing a nonexistent `react-reason-editor/wordcount` subpath, `src/extensions/Pagination/Pagination.ts`, `src/file-tree/filetree.tsx`, `src/types/constants.types.ts` — the last one also breaks plain `tsc --noEmit`). `bun run test` (Vitest) is unaffected and passes. Repro: `cd packages/react-reason-editor && bun run build:lib`.
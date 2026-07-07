1. T3 chat model info https://t3.chat/chat/
2. Chat with open tabs as context.
3. Show Vals scores for all models; example Kimi K2.5 page lists Vals Index 51.70%, latency 807.18s, and cost/test $0.29.[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
4. Outline tree should reuse Fumadocs page tree/sidebar patterns.
5. Filter outline.
6. Find/replace across all docs.
7. Option to start talking automatically on first visit, or via a button from anywhere on the site.
8. OpenRouter apps inspiration/reference: [openrouter.ai/apps](https://openrouter.ai/apps), and OpenRouter also documents app attribution plus public app rankings.
9. Reasoning view zoom default at 125%.
10. common typoes
11. https://github.com/cloudflare/moltworker

## Recent Fixes

- Fixed article panel Ask and Suggest buttons by creating new endpoints:
  - `/api/agent/article-qa` - Q&A endpoint for answering questions about articles
  - `/api/agent/article-followups` - Generates follow-up questions based on article content
  - Replaced deprecated `/api/agent/agents` endpoint that was returning 501 errors

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
30. Chrome settings override reference: [developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override#others](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override#others).[developer.chrome](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
31. Agents that scrape the web and work with datasets like LinkedIn.
32. Auto-generate keyphrase completions for on-page Ctrl+F search.
33. Markdown/file tree view inspiration: [ld246.com/guide/markdown](https://ld246.com/guide/markdown).
34. Reuse Fumadocs multi-tree/root-toggle ideas for docs organization.
35. Release on HN, YouTube, and Product Hunt.
36. https://21st.dev/community/agents
37. from the drodpown menu have tit  insret to as about tabstion ...` to show where the warning was created)
vite.config.ts (3:27) [UNRESOLVED_IMPORT] Could not resolve '@cloudflare/vite-plugin' in vite.config.ts
   ╭─[ vite.config.ts:3:28 ]
   │
 3 │ import { cloudflare } from "@cloudflare/vite-plugin";
   │                            ────────────┬────────────  
   │                                        ╰────────────── Module not found, treating it as an external dependency
───╯

failed to load config from /mnt/Data/Projects/qwksearch-research-agent/apps/qwksearch-web/vite.config.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@cloudflare/vite-plugin' imported from /mnt/Data/Projects/qwksearch-research-agent/apps/qwksearch-web/node_modules/.vite-temp/vite.config.ts.timestamp-1780876003324-b31cf411d0f988.mjs
    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:301:9)
    at packageResolve (node:internal/modules/esm/resolve:768:81)
    at moduleResolve (node:internal/modules/esm/resolve:859:18)
    at defaultResolve (node:internal/modules/esm/resolve:992:11)
    at nextResolve (node:internal/modules/esm/hooks:769:28)
    at o (file:///mnt/Data/Projects/qwksearch-research-agent/node_modules/.pnpm/@tailwindcss+node@4.3.0/node_modules/@tailwindcss/node/dist/esm-cache.loader.mjs:1:69)
    at nextResolve (node:internal/modules/esm/hooks:769:28)
    at AsyncLoaderHooksOnLoaderHookWorker.resolve (node:internal/modules/esm/hooks:265:30)
    at MessagePort.handleMessage (node:internal/modules/esm/worker:251:24)
    at [nodejs.internal.kHybridDispatch] (node:internal/event_target:843:20) {
  code: 'ERR_MODULE_NOT_FOUND'
}
error: script "build" exited with code 1

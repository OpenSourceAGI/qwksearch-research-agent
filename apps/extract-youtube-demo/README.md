# extract-youtube live demo

**Live at [youtube.js.org](https://youtube.js.org).** The Storybook is at [youtube.js.org/storybook](https://youtube.js.org/storybook/).

Everything in [`extract-youtube`](../../packages/extract-youtube) on one
Cloudflare Worker, plus a Storybook of every React component.

| Path | What |
| --- | --- |
| `/` | The app. **Library** tab: `<VideoGrid />` and `<VideoList />` over `useVideoLibrary()`, with search, category, sort, grouping, favorites, hiding and Play all. **Admin** tab: `<VideoLibraryAdmin />` and `<VideoAvailabilityPanel />`. `<FloatingYouTubePlayer />` is mounted once for both, with the demo's own `SpeedButton` in its control strip. |
| `/api/transcript?videoId=` | `YouTubeTranscriptApi` from the main entry, answering `{ snippets }` or `{ error }`. |
| `/api/library/*` | `createVideoLibraryHandler` from `extract-youtube/library`: the whole library and admin API. |
| `/api/demo` | Which mode this deploy runs in. |
| `/storybook/` | The Storybook: one story file per component in `stories/`, each with a docs page. |

## Run it

```bash
bun install            # from the monorepo root
bun run dev            # app + Worker (in workerd) on one port
bun run storybook      # Storybook on :6006
```

The package is imported from `packages/extract-youtube/src` through the Vite
aliases in `aliases.ts`, so there is nothing to build first and edits to the
package show up on reload.

## Build and deploy

```bash
bun run build          # vite build (app + Worker), then storybook build into dist/client/storybook
bun run preview        # wrangler dev over the build
bunx wrangler deploy
```

## Modes

| `ADMIN_TOKEN` secret | `DB` D1 binding | Mode |
| --- | --- | --- |
| unset | unbound | **Sandbox**: anyone edits an in-memory library, seeded from `src/demo-data.ts`, which lives as long as the Worker isolate. |
| set | either | **Token**: paste the token on the Admin tab; the client sends it as a bearer token. |
| unset | bound | **Read-only**: a persistent library is never open to edits without a token. |

Optional: `wrangler secret put YOUTUBE_API_KEY` turns on Resync and richer
auto-fill. For D1, `wrangler d1 create extract-youtube-demo` and add the
binding as `DB` (see the comment in `wrangler.jsonc`). Its tables and seed are
created on the first request.

## Files

- `worker/index.ts`: the Worker: transcripts, the library handler, the mode.
- `src/App.tsx`, `src/LibraryView.tsx`, `src/AdminView.tsx`: the app.
- `src/SpeedButton.tsx`: a custom control supplied by the app, not the
  package, through `<FloatingYouTubePlayer extraControls />`. debate-ai.com,
  where the player was ported from, plugs its own "slow the debate down"
  button in the same way.
- `src/demo-data.ts`: the demo videos and custom fields, shared by the Worker
  and the stories.
- `stories/`: one `*.stories.tsx` per component, and `fixtures.ts`, whose
  `makeClient()` runs the real handler over a memory store.
- `.storybook/`: Storybook config. It has its own `vite.config.ts` without the
  Cloudflare plugin.

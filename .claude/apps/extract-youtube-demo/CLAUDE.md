# CLAUDE.md — `apps/extract-youtube-demo`

The live demo of `packages/extract-youtube`, as one Cloudflare Worker. Read
[`skills/ask-extract-youtube`](../../../skills/ask-extract-youtube/SKILL.md)
for the package itself.

| Path | Served by |
| --- | --- |
| `/` | The SPA in `src/`: Library tab (grid, list) and Admin tab (admin table, availability panel). |
| `/api/transcript`, `/api/library/*`, `/api/demo` | `worker/index.ts`. Only `/api/*` reaches the Worker (`run_worker_first`). |
| `/storybook/` | `storybook build` output, written into `dist/client/storybook`. |

## Things that bite

- **The package is aliased to its source.** `aliases.ts` maps
  `extract-youtube`, `/react` and `/library` to `packages/extract-youtube/src`,
  for the app, the Worker and Storybook alike. No package build is needed, and
  a change to a component is a change to the demo.
- **Storybook has its own Vite config** (`.storybook/vite.config.ts`). The app's
  config adds `@cloudflare/vite-plugin`, which must not run inside Storybook.
- **`bun run build` order matters.** `vite build` empties `dist/client`, then
  `storybook build` writes into it. Running them the other way round deletes
  the Storybook.
- **Modes come from bindings, not flags.** No `ADMIN_TOKEN` and no `DB` makes
  a sandbox anyone can edit. `ADMIN_TOKEN` requires a bearer token. `DB`
  without a token is read-only. Never make a D1-backed deploy open.
- **One story file per component in `stories/`.** A new component in
  `extract-youtube/react` gets a story here. Stories use `fixtures.ts`
  (`makeClient()` runs the real handler over a memory store), never the
  network.
- `src/demo-data.ts` is shared by the Worker seed and the stories. The two
  3Blue1Brown videos link each other so the stack feature has something to
  show. `zzzzzzzzzz0` is seeded as removed for the availability panel.

```bash
bun run dev          # app + Worker in workerd
bun run storybook    # :6006
bun run build        # app, Worker, Storybook
bun run preview      # wrangler dev over the build
bun run typecheck
```

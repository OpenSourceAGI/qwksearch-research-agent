# CLAUDE.md — `apps/extract-youtube-docs`

`extract-youtube`'s docs site: Fumadocs on vinext, deployed as a Cloudflare
Worker. Started from `template-fumadocs` in dev-tools-starter-agent.

- Pages are `content/docs/**/*.mdx`, ordered by the `meta.json` beside them.
  Frontmatter `icon` is a lucide icon name.
- **MDX is compiled at build time** by `fumadocs-mdx/vite` into `.source/`.
  Workers refuse `new Function`, so nothing may compile MDX per request.
- Site-wide links (the live demo, Storybook, npm, GitHub) are in
  `lib/fumadocs/customize-docs.ts`. The demo URL is also written into a few
  pages' `<Card>` links; change them together.
- `zod` is pinned to fumadocs-mdx's own range on purpose. With two zods, bun
  links two copies of `fumadocs-core` and `bun run typecheck` fails on
  `PageData`.
- When `packages/extract-youtube` changes public behaviour, the matching page
  here changes with it: `react/video-grid`, `admin/library-api`,
  `admin/custom-fields`, `admin/admin-components`, `live-demo`.

```bash
bun run dev
bun run build        # vinext build → dist/ (Worker + assets)
bun run preview      # wrangler dev over the build
bun run typecheck
```

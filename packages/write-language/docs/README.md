# write-language docs

The documentation site for the [`write-language`](https://www.npmjs.com/package/write-language)
package, built with [Fumadocs](https://fumadocs.dev) on Next.js and hosted on Vercel.

Pages live in `content/docs/*.mdx`. The provider and model tables are rendered from
`../src/language-model-registry.ts` at build time, so they always match the package source.

## Develop

```bash
cd packages/write-language/docs
npm install
npm run dev   # http://localhost:3000
npm run build
```

This folder is a standalone npm project, outside the repo's bun workspaces, and is not part of
the published package (`files` in the package's `package.json` only ships `dist` and `src`).

## Deploy on Vercel

Create a Vercel project from the GitHub repo with these settings:

| Setting | Value |
| --- | --- |
| Root Directory | `packages/write-language/docs` |
| Framework Preset | Next.js |
| Include files outside the Root Directory | Enabled (the default; the build reads `../src`) |

Install and build commands come from `vercel.json` in this folder (`npm install`,
`npm run build`). No environment variables are needed.

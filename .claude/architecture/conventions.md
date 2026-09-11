# Conventions and General Rules

## Language and style

- TypeScript throughout, ESM (`"type": "module"`). Python only in
  `language-model-training`; Rust only in the Tauri shell.
- Match the surrounding file's style — naming, import order, comment density.
  There is no repo-wide formatter enforcing it in CI.
- **Comments explain why, not what.** The valuable comments in this codebase
  record a failure and its cause: the error text, why the obvious fix does not
  work, what broke in production. `worker/index.ts`, `vitest.config.ts` and
  `src/source.ts` are the house style — copy that register.
- Keep package boundaries clean: import a sibling from its public entry point,
  never from its internals or its `src/`.

## Commits

Gitmoji + conventional commits, lowercase subject, imperative mood:

```
✨ feat(settings): give the two QwkSearch panes their shared controls
🐛 fix(ci): turn the four chronically red Coverage jobs green
📝 docs(ci): record the lockfile outage blocking every job
🔥 chore(worker): delete the unreachable extraction chain
⏪ revert(research-agent-ui): drop the application sidebar from the app shell
```

Scope is the package or app name without its prefix. Version-bump commits are
generated (`chore: bump published package versions [skip ci]`) — do not write them
by hand.

## Pull requests

- Target `master`. One concern per PR; no drive-by refactors.
- Say what changed, why, which workspace packages are affected, and whether a
  published package needs a version bump.
- Link issues with `Fixes #123`.
- Include test results; screenshots for UI changes.
- If you could not run a check, say so and why.

## Tests

- Add or update tests for every behaviour change and bug fix.
- Run the touched package's own suite first (`cd packages/<name> && bun run test`)
  — it is far faster than the root run — then `bun run test` from the root.
- Tests run under Node. Passing tests do **not** prove the code runs on a
  Cloudflare Worker; see [web-app.md](web-app.md).

## CI

| Workflow | Trigger | What it guards |
| --- | --- | --- |
| `test-coverage.yml` | push to master, PR | One matrix job per package, `fail-fast: false`, uploads to Codecov |
| `test-web-api.yml` | paths under `apps/qwksearch-web` and two packages | The web app's own suite |
| `lockfile.yml` | push, PR | `bun install --frozen-lockfile` with the pinned bun — this is what the Cloudflare build runs |
| `npm-publish.yml` | push to master | Publishes changed public packages |
| `deploy-test-reports.yml` | push to master | Builds the HTML report, deploys `apps/test-reports` |
| `auto-merge-*.yml` | schedule / PR | Merges PRs that are clean, approved and green |

Coverage jobs build `extract-pdf`, `extract-youtube`, `react-reason-editor` and
`use-voice-control` explicitly first, because other packages consume them via
`dist`. A new package that others import via `dist` needs adding to those steps.

## Publishing

Public packages publish from master via `npm-publish.yml`. Version bumps are
automated; a bump commit lands as `chore: bump published package versions
[skip ci]`. If you change a published package's public API, say so in the PR so
the bump is a deliberate choice rather than a patch.

## Security

- Never commit secrets, credentials, API keys, private keys or build output.
- Worker secrets go through `wrangler secret put`, not `vars` and not the repo.
  Plaintext dashboard Variables survive deploys only because of `keep_vars` — see
  [web-app.md](web-app.md).
- Vulnerabilities are reported privately per `SECURITY.md`, never in a public
  issue.
- The license is PROSPER 1.0.0 (`LICENSE.md`); contributions are under it.

## Agent-specific rules

- Read `skills/ask-<name>/SKILL.md` before working in a package. It is written
  from source and covers the real gotchas.
- Do not create a root `docs/` folder — see [documentation.md](documentation.md).
- Do not run `npm`/`yarn`/`pnpm` at the repo root. `packages-lobe/` and
  `apps/qwksearch-ext` are the exceptions, and they have their own instructions.
- After changing a package that another package imports, rebuild it before
  concluding a behaviour is broken — see [monorepo.md](monorepo.md).
- Update the matching skill and `readme.md` in the same PR as the behaviour change.

# CLAUDE.md — `searxng-search-cloudflare`

**Read [`skills/ask-searxng-search`](../../skills/ask-searxng-search/SKILL.md)
first.**

**Not a Node package** — there is no `package.json`. This is a container
deployment: `Dockerfile`, `Dockerfile.redis`, and the SearXNG configuration
(`searxng-settings.yml`, `searxng-engines.yml`).

So nothing at the root installs, builds or tests it. `bun run test` will never
tell you a change here is wrong.

## Rules

- **The YAML files are the product.** `searxng-engines.yml` decides which
  engines are queried and how; `searxng-settings.yml` carries instance
  configuration. A typo is a silently disabled engine, not a crash.
- Secrets (the SearXNG secret key, any instance credentials) belong in the
  deployment environment, never in these files.
- Redis is a separate image (`Dockerfile.redis`) and SearXNG expects it — a
  change to one usually needs the other.
- Verify by building and running the containers. There is no other check.

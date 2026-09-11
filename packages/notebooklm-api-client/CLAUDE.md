# CLAUDE.md — `notebooklm-api-client`

**Read [`skills/ask-notebooklm-client`](../../skills/ask-notebooklm-client/SKILL.md)
first.**

A NotebookLM API client: a Cloudflare **Worker** in front of an **on-demand
Python container** that drives NotebookLM. Published.

## Two runtimes, one package

The Worker is the front door; the container is a sleeping Python service that
wakes on demand. Consequences:

- **Cold starts are the normal case.** The first request after a sleep is slow.
  Timeouts and retries have to assume it; don't tune them against a warm
  container.
- Waking a container costs money. Don't wake one speculatively, and don't hold
  one awake with keepalives that aren't needed.
- Worker-side code has Workers constraints (no Node builtins, no filesystem);
  container-side code does not. Know which half you are editing.

## Rules

- It drives an **unofficial surface** of someone else's product. It will break
  when NotebookLM changes; fail diagnosably and don't retry aggressively into a
  changed API.
- Credentials belong in Worker secrets and container environment, never in
  source.

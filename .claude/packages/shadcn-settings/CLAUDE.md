# CLAUDE.md — `shadcn-settings`

**Read [`skills/ask-shadcn-settings`](../../../skills/ask-shadcn-settings/SKILL.md)
first.**

A prop-driven, **schema-based settings form renderer** on shadcn. Published.

## Schema-driven means the schema is the API

- **A new setting is a schema entry, not a new component.** If a setting needs
  bespoke rendering, add the field *type* to the renderer so every consumer gets
  it — one-off components defeat the package.
- The schema shape is public API for every consumer; changing a field type or a
  key is a breaking change.
- **Stay domain-free.** This renders settings; it should not know what
  QwkSearch's settings mean. Product-specific panels live in
  `research-agent-ui/settings`.

Both QwkSearch settings panes share these controls, so a styling or layout
change is visible in more than one place.

```bash
cd packages/shadcn-settings && bun run test
```

# CLAUDE.md — `shadcn-app-dock`

**Read [`skills/ask-shadcn-app-dock`](../../../skills/ask-shadcn-app-dock/SKILL.md)
first.**

A prop-driven, macOS-style category dock with magnification. Published.

## Rules

- **Prop-driven and domain-free.** It takes items and renders them; it must not
  know about QwkSearch's categories. Keep product knowledge in the caller.
- The magnification animation is the point and it runs on pointer move — keep it
  off the main thread's critical path, use transforms rather than layout
  properties, and respect `prefers-reduced-motion`.
- It must stay usable by keyboard and screen reader; a dock that only works with
  a hovering pointer excludes people and breaks on touch.

```bash
cd packages/shadcn-app-dock && bun run test
```

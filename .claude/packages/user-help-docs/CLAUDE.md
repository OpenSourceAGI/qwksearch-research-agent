# CLAUDE.md — `user-help-docs`

**Read [`skills/ask-user-help-docs`](../../../skills/ask-user-help-docs/SKILL.md)
and [`.claude/architecture/documentation.md`](../../architecture/documentation.md)
first.**

Private. The user-facing help documentation, hosted at `/docs` in
qwksearch.com. Content lives in `content/docs`.

## This is where documentation goes

**There is deliberately no root `docs/` folder in this repo — do not recreate
one.** User-facing documentation belongs here; package documentation belongs in
each package's `readme.md` and its `skills/ask-<name>/SKILL.md`; agent
orientation belongs in `CLAUDE.md` files.

## Rules

- Write for users of the product, not for maintainers.
- It goes through the Fumadocs pipeline — see
  [`documentation.md`](../../architecture/documentation.md) for how it
  is built and served.
- Being private and docs-shaped, it is easy to break without any test noticing.
  Build it before claiming a change works.

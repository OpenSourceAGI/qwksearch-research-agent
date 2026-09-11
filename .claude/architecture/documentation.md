# Documentation — Where It Goes

This repo has **one** home for prose documentation and **one** home for
agent-facing package reference. Neither of them is a root `docs/` folder.

| Kind of writing | Home |
| --- | --- |
| Anything a user or an operator reads | `packages/user-help-docs/content/docs/**` |
| Package reference written for coding agents | `skills/ask-<name>/SKILL.md` (+ `API.md`) |
| How to work in this repo, for Claude | `CLAUDE.md` and `.claude/architecture/**` |
| A package's own public API | that package's `readme.md` |

**Do not create a root `docs/` directory.** One existed and its contents were
moved into the user guide; a new one splits the documentation in two again and
ships nothing, because only `user-help-docs` is actually served.

## The user guide (`packages/user-help-docs`)

A **Fumadocs** site served at `/docs` in `apps/qwksearch-web`. Content is MDX under
`content/docs/`, with an `architecture/` subsection for internal design notes,
runbooks and migration plans.

To add a page:

1. Write `content/docs/<section>/<slug>.mdx` with frontmatter — `title` required,
   `description` recommended, optional `icon` (a Lucide name) and `full`.
   No H1: the frontmatter `title` renders it.
2. Add the slug to the `pages` array of the `meta.json` in that directory.
   `test/docs.test.ts` fails if a `meta.json` references a page that does not
   exist, or if a top-level page is missing from the root `meta.json`.
3. `cd packages/user-help-docs && bun run test`.

### Why the content pipeline looks unusual

`src/source.ts` inlines every file twice with `import.meta.glob` — `?raw` for the
search index and the `llms.txt` views, compiled for the rendered page — instead of
using the `fumadocs-mdx` collections pipeline. Both halves exist because of the
Workers runtime:

- There is no filesystem on a Worker and no `import.meta.url` to resolve
  `content/docs` against; resolving one threw at module scope and 500'd every
  route in the same chunk.
- The request-time MDX compiler runs its output through `new AsyncFunction(...)`,
  which Workers forbid (`EvalError: Code generation from strings disallowed`), so
  the compile happens in the bundler via `helpDocsMdxPlugin` from
  `user-help-docs/vite`.

Consequences worth remembering: the host app **must** register
`helpDocsMdxPlugin()` in both its Vite and its Vitest config, or every page throws
`No compiled module for "<path>"`; and MDX rules apply to content — a bare `{` or
`<` outside a code fence is parsed as JSX.

### The host app must scan `fumadocs-ui/dist` for Tailwind classes

Importing `fumadocs-ui/css/preset.css` is **not** enough to style the docs.
Fumadocs declares its own utility lists as `@source inline(…)` inside
`css/generated/*.css`, and `preset.css` `@import`s those files *after* an
`@plugin` at-rule. Vite resolves CSS `@import`s with postcss-import before
Tailwind ever sees the file, and postcss-import stops inlining at the first
non-`@import` at-rule — so all five generated files are dropped with no error.

What survives is only what is plain CSS: the `--color-fd-*` tokens and a handful
of base rules. Every *class* goes ungenerated — `#nd-notebook-layout`'s grid,
`--fd-sidebar-width`, `text-fd-muted-foreground`, the sidebar animations — and
`/docs` renders as a single unstyled column with **no sidebar and no
navigation**, while the page tree, the routes, the search index and the whole
test suite stay green.

`apps/qwksearch-web/app/globals.css` compensates by scanning the shipped output
itself (`dist`, not `src` — fumadocs-ui publishes compiled output only), next to
the same registration for the docs package's own components:

```css
@source "../node_modules/fumadocs-ui/dist";
@source "../../../packages/user-help-docs/src";
```

`app/docs/__tests__/docs-wiring.test.ts` compiles those registrations through
Vite and fails if the layout classes stop being generated.

## Skills (`skills/`)

One [Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
per package, each written from the package's **source** rather than its README.
They are the most detailed documentation in the repo; read the relevant one before
working in a package.

Start at [`ask-qwksearch-monorepo`](../../skills/ask-qwksearch-monorepo/SKILL.md)
when you do not yet know which layer owns a behaviour.

Shape of a skill: YAML frontmatter with `name` matching the directory and a
`description` that names the package and its path, lists what it covers, and ends
with a `Use when …` clause naming concrete symptoms — that description is the only
thing an agent sees when deciding to load it. Body: setup → which call to reach
for → recipes → a symptom/cause/fix table. Exhaustive option, export and prop
tables go in a sibling `API.md`.

Adding a package means adding its skill, plus rows in `skills/README.md` and in
`ask-qwksearch-monorepo`'s map.

## Keeping documentation honest

When you change behaviour, update in the same PR: the package `readme.md`, its
`skills/ask-<name>/SKILL.md`, and any affected `user-help-docs` page. A stale skill
is worse than a missing one — agents trust it. `packages/readme.md`, for instance,
still calls the editor Lexical when it is Tiptap; the source is authoritative.

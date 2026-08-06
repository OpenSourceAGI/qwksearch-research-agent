# Web UI: qwksearch-web, research-agent-ui, reason-editor

This is where most "add a feature" or "restyle the UI" requests land. Three
distinct pieces, easy to confuse:

## apps/qwksearch-web — the Next.js shell

Dev: `bun run dev` (root) or `cd apps/qwksearch-web && npx open-ready next dev`.
Build/deploy: `vinext build` / `vinext deploy` (Cloudflare Workers target),
`wrangler dev --local` for a local Workers runtime via `dev:cf`.

Next.js App Router layout (`apps/qwksearch-web/app/`):

- `app/page.tsx`, `app/c/[chatId]` — the main chat/search screen and per-conversation route. These mostly *instantiate* components from `research-agent-ui`.
- `app/api/agent`, `app/api/search`, `app/api/scraper`, `app/api/speech`, `app/api/config`, `app/api/user`, `app/api/auth`, `app/api/admin`, `app/api/docs`, `app/api/openapi`, `app/api/notebooklm` — backend routes. Adding a new backend capability usually means a new route here calling into a `packages/*` library, not new business logic inline.
- `app/settings/[[...section]]` — settings UI (includes the Skills & Memory panel, see `docs/SKILLS_AND_MEMORY.md`).
- `app/admin/*` — admin dashboard (users, freekeys, config).
- `app/login`, `app/library`, `app/news`, `app/docs`, `app/enterprise`, `app/legal` — supporting pages.
- `worker/index.ts` — the Cloudflare Worker entry (routes/middleware around the Next.js app when deployed to Workers).
- `drizzle/*.sql` — D1 database migrations; `db:generate`/`db:push`/`db:migrate`/`db:studio` scripts manage schema.
- Auth is Better Auth (`BETTER_AUTH_SECRET`, Discord OAuth, etc. — see `.env.example` for the full env var list before running locally).

**When to edit here**: new page/route, new API endpoint, auth/session behavior, DB schema changes, admin features. **Not** for chat UI component behavior — that's `research-agent-ui`.

## packages/research-agent-ui — the actual chat/search UI

This is a standalone package (own `package.json`, builds to `dist/`) designed
to "drop into a Next.js app behind a small config/injection surface." Built
with `bun run build` (vite + tsc), has its own Storybook (`bun run storybook`,
see `STORYBOOK.md`) for isolated component development — prefer Storybook
over the full web app when iterating on a single component's look.

Key exports (see `package.json` `exports` map): `.` (main), `./config`,
`./api`, `./file-sources`, `./settings`, `./settings/*`.

`src/` layout:

- `src/components/` — `ChatConversation`, `MessageComposer`, `MessageActions`, `ArticleReader`, `SearchConfig`, `SearchResults`, `FileUpload`, `ChatHistoryDropdown`, `VoiceSettings`, `Footer`, `ConfigError`. Each is a folder with the component + likely a `.stories.tsx` — check for an existing story before writing a manual test harness.
- `src/hooks/` — `useChat/`, `useSession.tsx`, `voice/`. Chat state and streaming logic lives here, not in the components.
- `src/config.ts` and `src/settings/` (`sections.json`, `search.json`) — the "injection surface" mentioned in the root README: branding, auth wiring, and media-search preferences are configured here rather than hardcoded in components.
- `src/api/` — typed handlers/types for talking to the backend; `src/api/handlers/`.
- `src/icons/` — category search icons (academic, files, images, news, tech, videos, web) as both `.tsx` and `.svg` — add both when adding a new search category icon.
- `src/lib/` — assorted utilities: `chatTitle.ts`, `composer.ts`, `export.ts`, `guest.ts`, `kokoro.ts` (voice), `suggestions.ts`, `url-autolink.ts`.
- `src/ui/` — small shared primitives (button, dialog, dropdown-menu, popover, tooltip, badge, live-waveform, glowing-effect) — Radix + Tailwind style, check here before adding a new low-level UI primitive; one may already exist.
- `src/cloudflare/worker.ts` — lets this package run standalone as its own Worker (`dev:cloudflare`/`deploy:cloudflare` scripts) independent of `qwksearch-web`.

**When to edit here**: anything about how the conversation looks or behaves, search config UI, article preview, file upload, voice settings, chat history — i.e. almost every "change the UI" request that mentions chat/search.

## packages/reason-editor — the REASON writing editor

A separate product surface: a Lexical/Tiptap-based rich text editor with a
document tree, not the chat UI. Dev: `bun run dev:editor` from root, or
`cd packages/reason-editor && ...` (check `package.json` for the exact
script name — `vite.config.ts` in this package drives standalone dev via
`index.html`). Build: `bun run build:lib`.

`src/` layout highlights:

- `src/extensions/` — one folder per Tiptap extension (Table, CodeBlock, Mermaid, Katex, Mention, SlashCommand, ExportPdf, ExportWord, ImportWord, Comment, Drawio, Twitter, Video, Image, etc). **Adding editor functionality (new block type, new toolbar action) means adding a new folder here following an existing extension's shape**, then registering it (check `src/editor-kit.ts` and `src/reason-docs.ts` for where extensions are assembled).
- `src/components/`, `src/editor-views/`, `src/editor/` — toolbar, editor area, right panel, and the standalone app shell (`editor-views/App.tsx`, `main.tsx`) used when running the editor outside the full product.
- `src/documents/`, `src/file-tree/` — the nested document organizer (drag-and-drop, context menu) mentioned in the root README.
- `src/locales/` — one file per language (20+ languages); add a new key to `en.ts` first, then mirror it across the others (or at minimum add the English fallback).
- `src/features/` — `ai-rewrite/`, `settings/`, `tags/`, `team/` — larger vertical features, each self-contained.
- `src/store/` — editor state (`store.ts`, `editor.ts`) plus reactive bridges (`EditorEditableReactive.tsx`, `ThemeColorReactive.tsx`).
- `src/comments/` — commenting/annotation system (`CommentsSidebar.tsx`, `commentMarks.ts`).

**When to edit here**: rich text editor behavior, new document/formatting feature, export/import formats, editor localization, collaborative editing (Yjs) behavior.

## Shared styling

Both `research-agent-ui` and `reason-editor` use Tailwind + shadcn-style
primitives; `qwksearch-web` also pulls in `shadcn-app-dock` for its
category dock. If a component looks inconsistent across surfaces, check
whether the same primitive exists in more than one package's `src/ui` or
`src/app-ui` before creating a third copy.

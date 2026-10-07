# CLAUDE.md — `education-playlists`

**Read [`skills/ask-education-playlists`](../../../skills/ask-education-playlists/SKILL.md)
first.**

Self-paced study playlists in a college-catalog shape (category → major →
program), the homepage **Learn** widget, and an LLM planner. Not yet published.

## Rules

- **Provenance is per item, and nothing from outside is `verified`.** A seed
  record, an official API record, a community-list link and a planner web
  result are not equally trustworthy, and the UI says which one it shows.
  `sanitizeItem` forces `verified: false` on anything it parses; only an
  ingestion run that checked the URL may set it.
- **Every rendered link goes through `safeUrl`/`sanitizePlaylist`.** Share
  links, stored playlists, server answers and LLM output are all untrusted. Only
  `http(s)` URLs survive; a `javascript:` href in a shared playlist is the bug
  this exists to prevent.
- **Don't invent course URLs.** Seed courseware links are canonical
  `ocw.mit.edu/courses/<slug>/` pages; lecture "videos" search MIT OCW's YouTube
  channel until the OCW YouTube dataset is ingested. A guessed playlist id that
  404s is worse than a search.
- **The model and the search are injected** (`PlannerDeps`). The package never
  imports a provider. Every model failure falls back to the offline planner —
  a learner should get a worse playlist, never an error.
- **The server handler caps input** (`MAX_PLAN_BODY_BYTES`, goal/answer
  lengths, answer count). Rate limiting is the host's job; qwksearch-web meters
  `/api/learn` with the guest limiter and plans offline past the limit.
- **The server store is where access is enforced.** `handlePlaylistStoreRequest`
  (`src/server/playlists.ts`) runs `canView`/`canEdit`; the widget's checks are
  display only. Only the owner changes visibility and members, members are
  reconciled server-side (never trust a client's status, user id or token), an
  invite is accepted only by the verified address it was sent to, and invite
  tokens are shown to the owner alone. Storage is behind `PlaylistRepository`;
  qwksearch-web's D1 one is `apps/qwksearch-web/lib/learn/playlists.ts`.
- Signed out (or with no `playlistsEndpoint`), playlists live in `localStorage`
  and invites go nowhere. On sign-in the widget uploads them once and drops
  the local copies. Public playlists still share by URL fragment.
- Time estimates on seed items are `rough` and say how they were derived
  (`estimateBasis`). Progress is measured by time, not item count.

```bash
cd packages/education-playlists && bun run test
```

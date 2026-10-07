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
- **Sharing is not persisted server-side yet.** Public playlists share by URL
  fragment (no storage needed); private playlists and invites live in
  `localStorage` only. `canView`/`canEdit` are the rules a server store must
  enforce when one is added — the widget's checks are display only.
- Time estimates on seed items are `rough` and say how they were derived
  (`estimateBasis`). Progress is measured by time, not item count.

```bash
cd packages/education-playlists && bun run test
```

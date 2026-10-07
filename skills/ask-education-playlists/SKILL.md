---
name: ask-education-playlists
description: Guide to education-playlists (packages/education-playlists), the self-paced study playlists package and the homepage Learn widget — the college-catalog taxonomy (category, major, program), the MIT OpenCourseWare seed catalog and its provenance, progress checkmarks and time estimates, private/public playlists with invites and share links, the LLM planner that asks follow-up questions and builds a custom playlist, the NotebookLM quiz hook, and qwksearch-web's /api/learn route and /learn page. Use when adding courses or data sources, changing the widget, wiring a model or search into the planner, or changing server-side playlist storage (/api/learn/playlists, invites).
---

# Working With education-playlists

`packages/education-playlists`. A React widget plus plain-TS logic, with a
Worker-safe planner handler on `education-playlists/server`.

## The model

- `Category → Major → Program` (`src/catalog/taxonomy.ts`). Majors carry the MIT
  department number (`6`, `18`, …) so ingested MIT records file themselves.
- `Playlist` — `visibility` is `preset` (catalog, read-only), `public` (anyone
  with the link) or `private` (owner + invited members).
- `PlaylistItem` — `kind` (video, video_playlist, courseware, …), `minutes`,
  `estimate: 'exact' | 'rough'` with `estimateBasis`, and `provenance`
  (`provider`, `method`, `verified`, `note`).

## The catalog

`src/catalog/mit-ocw-seed.ts` is a hand-curated seed: 28 MIT OCW courses in 11
preset playlists. Each course contributes a **lecture videos** item (a search of
MIT OCW's YouTube channel) and a **courseware** item (the canonical OCW course
page). Everything is `curated_seed`, `verified: false`.

Intended ingestion sources, in order of authority:

1. [`mitodl/ocw_oer_export`](https://github.com/mitodl/ocw_oer_export) — MIT's
   exporter over the MIT Learn API (title, URL, level, topics, instructors, term).
2. The MIT OCW YouTube course dataset (Kaggle) — real per-lecture video URLs
   and durations, which turn `rough` video estimates into `exact` ones.
3. Community awesome-lists as `community_list` items in their own playlists.

None of these are ingested yet. Add a source as an adapter that produces
`PlaylistItem`s with honest provenance; don't merge it into the seed by hand.

## The planner

`suggestFollowUps(goal, deps)` → questions with quick-answer options (the
learner can also type their own). `planPlaylist({ goal, answers }, deps)` →
the model writes 3–5 searches and names MIT course numbers; the searches run
against the catalog (`searchCatalog`) and, if `deps.search` is set, the web.
Level, format (videos/courseware) and weekly hours are read from the answers'
words (`readPreferences`). At most 12 items, easiest first.

`deps.generate` and `deps.search` are injected. With neither, or when the model
fails or returns unparseable JSON, the planner runs **offline**: standard
questions, catalog keyword search. The response says which (`mode`).

## Sharing

- `encodeShareFragment` / `decodeShareFragment` — a public playlist rides in the
  URL fragment (`/learn#playlist=…`); `<EducationPlaylists importFromHash />`
  opens it. Members are stripped; private playlists are refused.
- `invite` / `acceptInvite` / `canView` / `canEdit` — the access rules, pure
  functions shared by the widget and the server.
- `handlePlaylistStoreRequest` (`education-playlists/server`) — server-side
  storage over a `PlaylistRepository` the host supplies, with `getUser` and an
  optional `notifyInvite`. Routes: `GET <base>/playlists` (`{ playlists,
  invites }`), `GET|PUT|DELETE <base>/playlists/:id`, `POST
  <base>/playlists/accept-invite`. Invites are accepted only by the verified
  address they were sent to; only the owner sees tokens and changes members.
- `createRemotePlaylistStore` (browser) — what the widget uses when given
  `playlistsEndpoint` + `userId`; `#invite=<token>` links are accepted on
  arrival with `importFromHash`.

## Quiz hook

`src/quiz.ts` — `QuizGenerator`, `buildQuizPrompt`, `parseQuiz`. The widget shows
"Quiz me" only when a host passes `quizGenerator`. Wire it to
`notebooklm-api-client` (add the item as a source, ask with the prompt).

## In qwksearch-web

- Homepage: `research-agent-ui`'s `ChatHomepage` lazy-loads
  `<EducationPlaylists compact />` above the trending-news widget; setting
  `showEducationPlaylistsWidget` turns it off. Endpoints come from
  `researchAgentUIConfig.educationPlaylistsApiUrl` / `educationPlaylistsPageUrl`.
- `/api/learn` and `/api/learn/questions` → `lib/learn/planner.ts`, which passes
  the default chat model and a Searxng video search, metered by the guest rate
  limiter (offline past the limit).
- `/learn` — the full-page widget, and where share and invite links land. It
  passes the signed-in (non-anonymous) user and `/api/learn/playlists`.
- `/api/learn/playlists[/:id]` → `lib/learn/playlists.ts`: the D1 repository
  (`learn_playlists`, `learn_playlist_members`, migration `0012`) and the
  better-auth user. No `notifyInvite` yet — the app has no mail sender.

```bash
cd packages/education-playlists && bun run test
```

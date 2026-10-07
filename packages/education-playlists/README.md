# education-playlists

Self-paced study playlists organized like a college catalog: pick a
**category**, a **major** and a **program**, then work through an ordered list
of lecture videos and courseware links, checking items off as you go. Every
item shows how long it should take and where its record came from.

An AI planner builds custom playlists: describe what you want to learn, answer
a few follow-up questions (tap an option or type your own answer), and it turns
the answers into searches and the searches into a playlist.

- **Preset, public and private playlists.** Presets ship with the catalog.
  Save a copy to make it yours; keep it private and invite people by email, or
  make it public and share a link.
- **Progress by time.** Checkmarks persist per browser; progress and "weeks
  left at your pace" are measured in minutes, not item counts.
- **Provenance on every item.** Seed record, official API, dataset snapshot,
  community list or AI search, and whether the URL has been verified.
- **Quiz hook.** Pass a `quizGenerator` (for example NotebookLM over the item's
  material) and each item gets a "Quiz me" button.

The bundled catalog is a hand-curated seed of 28 MIT OpenCourseWare courses in
11 playlists. Course pages link to their canonical `ocw.mit.edu/courses/…`
address; until per-lecture video data is ingested, a course's "lecture videos"
item searches MIT OCW's YouTube channel.

## Usage

```tsx
import { EducationPlaylists } from 'education-playlists';

// Homepage card: one row of playlists that expands in place.
<EducationPlaylists compact planEndpoint="/api/learn" openHref="/learn" />

// Full page, which also opens playlists shared by link (#playlist=…).
<EducationPlaylists planEndpoint="/api/learn" importFromHash />
```

Without `planEndpoint` the planner runs in the browser: standard follow-up
questions and keyword search over the bundled catalog.

## Server

`education-playlists/server` is a plain `Request → Response` handler (Workers,
Node 18+, Bun, Deno). Pass it a language model and, optionally, a web search:

```ts
import { handleEducationPlaylistsRequest } from 'education-playlists/server';

export const POST = (request: Request) =>
  handleEducationPlaylistsRequest(request, {
    generate: async ({ system, prompt }) => callYourModel(system, prompt),
    search: async (query) => searchVideos(query), // [{ title, url, snippet? }]
  });
```

- `POST <base>/questions` `{ goal }` → `{ questions, mode }`
- `POST <base>` `{ goal, answers: [{ question, answer }] }` → `{ playlist, searches, mode, minutesPerWeek? }`
- `GET <base>/catalog` → the catalog

If the model fails or answers with something unusable, the handler plans
offline rather than erroring; `mode` says which happened. Rate limiting and
auth are the host's job.

## Data sources

Planned ingestion, in order of authority:

1. [`mitodl/ocw_oer_export`](https://github.com/mitodl/ocw_oer_export) over the
   MIT Learn API, for the full MIT OCW catalog.
2. The MIT OpenCourseWare YouTube course dataset (Kaggle), for per-lecture
   video URLs and exact durations.
3. Curated awesome-lists, kept as community-sourced playlists.

## Not built yet

- Server-side storage for playlists, so invites actually reach invitees and
  private playlists follow a signed-in user across devices. The access rules
  (`canView`, `canEdit`, `invite`, `acceptInvite`) are in place for it.
- The ingestion adapters above.
- A concrete quiz generator (the hook and prompt are here).

```bash
bun run test
bun run build
```

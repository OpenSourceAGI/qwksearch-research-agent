# CLAUDE.md — `apps/collaboration-server`

Private. The **Hocuspocus** server backing the Reason Editor's Tiptap/Yjs
collaborative editing, with SQLite persistence. It owns the Yjs rooms.

## What makes this different from a normal server

- **State is CRDT, not rows.** A Yjs document converges from concurrent edits;
  you cannot "fix" one by overwriting it. Never mutate a stored document outside
  the Yjs API.
- **Schema changes in `packages/reason-editor` reach live rooms.** A document
  written under the old schema still has to load. Test the upgrade path, not
  just a fresh document.
- **A room is a permission boundary.** Anyone who can connect to a room can read
  and write the document — authorize on connect, never only in the UI.
- Connections are long-lived. A leak here degrades slowly and then all at once;
  clean up on disconnect, including the error path.

Losing or corrupting a document is the worst outcome this service can produce —
weigh changes accordingly.

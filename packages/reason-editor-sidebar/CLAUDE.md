# CLAUDE.md — `react-reason-editor-sidebar` (`packages/reason-editor-sidebar`)

**npm name:** `react-reason-editor-sidebar`. **Read
[`skills/ask-reason-editor-sidebar`](../../skills/ask-reason-editor-sidebar/SKILL.md)
first.**

The REASON editor's file/folder sidebar, open-tabs pane and document tree.
Published.

## Rules

- **It is a separate package from `reason-editor` on purpose** — the editor is
  usable without a sidebar. Don't create a hard dependency from the editor onto
  this, and keep this one prop-driven rather than reaching into editor
  internals.
- The document tree reflects persisted structure. Drag-to-reorder, rename and
  delete are destructive operations on a user's documents: confirm deletes, make
  moves undoable, and never let an optimistic UI update diverge from what was
  actually saved.
- Open tabs are session state; losing them is annoying, corrupting the tree is
  not recoverable. Treat them with different levels of care.

```bash
cd packages/reason-editor-sidebar && bun run test
```

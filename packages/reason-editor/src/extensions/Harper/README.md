# Harper Proofing

Local, privacy-respecting grammar and spelling proofing for the editor,
powered by [`harper.js`](https://writewithharper.com/). All linting runs in the
browser via WebAssembly — document content is never sent to a remote service.

## Install

```bash
npm install harper.js
```

`harper.js` is a peer/runtime dependency and is externalized from the library
bundle so its WebAssembly binary resolves through the consuming app's bundler.

## Usage

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import { Harper, RichTextHarper } from 'reactjs-tiptap-editor/harper'

function Editor() {
  const editor = useEditor({
    extensions: [
      /* Document, Paragraph, Text, … */
      Harper.configure({
        preferWorker: true, // run linting off the main thread
        dialect: 'American', // American | British | Australian | Canadian | Indian
        debounce: 300, // ms between an edit and the lint it triggers
        autoLint: true, // re-lint automatically as the document changes
        onUpdate: (issues) => console.log(issues.length, 'issues'),
      }),
    ],
    immediatelyRender: false, // recommended for SSR
  })

  if (!editor) return null

  return (
    <>
      <EditorContent editor={editor} />
      {/* Floating hover tooltip with apply / ignore actions */}
      <RichTextHarper editor={editor} />
    </>
  )
}
```

## Commands

| Command | Description |
| --- | --- |
| `editor.commands.runProofing()` | Run a full proofing pass immediately (bypasses the debounce). |
| `editor.commands.clearProofing()` | Remove all issue decorations. |
| `editor.commands.applyHarperSuggestion(id, index)` | Apply the `index`-th suggestion of the issue `id`. |
| `editor.commands.ignoreHarperSuggestion(id)` | Dismiss the issue `id` without changing the document. |

## How it works

1. `extractTextWithMap` walks the ProseMirror document, emits normalized plain
   text (block-separated so paragraph boundaries do not merge words), and records
   an offset → document-position mapping table.
2. The text is linted by a worker-backed (or main-thread fallback) `harper.js`
   linter.
3. Each returned character span is mapped back to ProseMirror coordinates via the
   mapping table and rendered as an inline `Decoration`.
4. Decorations are re-mapped across document changes; stale passes are discarded
   if the document moves underneath an in-flight lint.

The extension also sets `spellcheck="false"` on the editor so the browser's
native spell checker does not draw duplicate underlines.

## Notes

- The linter (which builds Harper's curated dictionary) is expensive to
  construct, so a single instance is memoized and shared across editors.
- Suggestions are applied directly as ProseMirror transactions using the live
  decoration position, so they stay accurate even after nearby edits.

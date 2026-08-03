<a href="https://bundlephobia.com/package/ai-research-agent" target="_blank" rel="noopener noreferrer">
  <img
    src="https://img.shields.io/bundlephobia/minzip/grab-url?style=flat&label=size"
    alt="npm bundle size "
  />
</a>

![logo](https://i.imgur.com/EIqHZVO.png)


## ✨ REASON Editor - Features

- **Text Formatting:** Bold, italic, underline, strikethrough, text/highlight colors, font family & size, line height, subscript/superscript, inline code
- **Block Elements:** Headings (H1-H6), paragraphs, bullet/ordered/task lists, blockquotes, code blocks with syntax highlighting, horizontal rules, callout boxes (info, warning, error, success)
- **Media & Embeds:** Image/video upload with drag-to-resize, GIF search (Giphy), Twitter/X embeds, iframe embeds, file attachments
- **Advanced Content:** Tables with full manipulation (add/delete rows/columns, merge cells), multi-column layouts, mathematical equations (KaTeX/LaTeX), diagrams (Excalidraw), flowcharts (Mermaid), collapsible sections
- **Editor Tools:** Undo/redo, search & replace, code view (HTML toggle), clear formatting, text direction (LTR/RTL), alignment (left/center/right/justify), indent/outdent, drag & drop blocks, slash commands
- **Input Enhancements:** Emoji picker, markdown paste (auto-converts), @ mentions with suggestions, full keyboard shortcuts
- **Import/Export:** Import/export Word (.docx), export to PDF
- **Customization:** Dark/light themes, 8 accent color themes, 6 languages (English, Vietnamese, Chinese, Portuguese, Hungarian, Japanese), customizable upload handlers, extensible with Tiptap extensions
- **Performance:** Debounced auto-save (300ms), optional real-time collaboration (Yjs/Hocuspocus), tree-shakeable bundle, bubble menus, accessible (Radix UI), responsive design
- **Quick Stats:** 50+ editor features, 16 insert options, 15 bubble menus, 8 text styling options, 6 languages, 8 color themes

## 🔄 REASON vs. Google Drive & Docs

- **🔒 Yours to own and run:** Self-hosted and open source, so your data stays on your servers with no third-party access, no per-user fees or storage caps, and no vendor lock-in.
- **✅ Matches the Google Docs workflow:** Real-time collaboration (Yjs/Hocuspocus), rich formatting, @ mentions, media, tables/layouts, `.docx` import/export, and auto-save — in any modern browser.
- **🚀 Goes further for builders:** Native LaTeX/KaTeX math, Excalidraw/Mermaid diagrams, syntax-highlighted code blocks, full theming, and a fully extensible Tiptap architecture you can embed directly in your app.

## 🧩 Editor Views

The editor is composed from a Tiptap `editor` instance wrapped in `<RichTextProvider>` — from there you mix in exactly the chrome you need (full toolbar, a few buttons, bubble menus only, an outline, proofing, or the whole file-tree app). The [demo](demo/src/tabs) instantiates six views this way; each is reproduced below.

Running `pnpm dev` opens the full organizer app (view 1) directly, with no tab bar. The other five lighter-weight views live behind a second demo entry point at `/alternatives.html`, switchable via its own tab bar — see [Alternative demo views](#alternative-demo-views) below.

Every view follows the same shape: create the editor with `useEditor`, wrap it in `<RichTextProvider editor={editor}>`, and render `<EditorContent editor={editor} />` plus whatever UI pieces you import.

### 1. Full app — organizer & file tree

The complete document-organizer experience: resizable sidebar, document tabs, right-panel outline, and dialogs. Drop in the pre-assembled shell — no editor wiring required.

```tsx
import ReasonDocs from 'react-reason-editor/src/editor/ReasonDocs'
import 'react-reason-editor/src/app-styles/split-pane.css'

export function FullApp() {
  return <ReasonDocs />
}
```

### 2. Editor — full toolbar & bubble menus

A config-driven editor with the complete `RichTextToolbar` and all `BubbleMenus`. Extensions are built from an `EditorConfig` object so plugins can be toggled at runtime.

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import { RichTextProvider } from 'react-reason-editor'
import { RichTextToolbar, BubbleMenus } from 'react-reason-editor/editor-views/components'
import { buildExtensions, loadConfig } from 'react-reason-editor/editor-views/config/editorConfig'

export function FullEditor() {
  const config = loadConfig()
  const editor = useEditor({
    content: '<p>Start typing here…</p>',
    extensions: buildExtensions(config),
  })

  return (
    <RichTextProvider editor={editor!}>
      <RichTextToolbar />
      <EditorContent editor={editor} />
      <BubbleMenus />
    </RichTextProvider>
  )
}
```

> The example above imports straight from `src/editor-views/*`, which only
> resolves inside this repo (that tree isn't part of the package's built
> `dist/` output). Consumers outside this monorepo — e.g.
> `apps/qwk-vscode-ext`'s custom editors — should import the same pieces
> (`RichTextToolbar`, `BubbleMenus`, `buildExtensions`, `createDefaultConfig`,
> `debounce`, `RichTextProvider`) from the dedicated, published
> `react-reason-editor/editor-kit` subpath instead:
>
> ```tsx
> import { useEditor, EditorContent } from '@tiptap/react'
> import {
>   RichTextProvider,
>   RichTextToolbar,
>   BubbleMenus,
>   buildExtensions,
>   createDefaultConfig,
> } from 'react-reason-editor/editor-kit'
>
> const editor = useEditor({
>   content: '<p>Start typing here…</p>',
>   extensions: buildExtensions(createDefaultConfig()),
> })
> ```

### 3. Small toolbar — basics

A compact, hand-picked toolbar. Import only the `RichText*` control components you want and lay them out yourself; pair them with the bubble menus for selection formatting.

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import { RichTextProvider } from 'react-reason-editor'
import { RichTextBubbleText, RichTextBubbleLink } from 'react-reason-editor/bubble'
import { RichTextUndo, RichTextRedo } from 'react-reason-editor/history'
import { RichTextBold } from 'react-reason-editor/bold'
import { RichTextItalic } from 'react-reason-editor/italic'
import { RichTextHeading } from 'react-reason-editor/heading'
import { basicExtensions } from './extensions'

export function SmallToolbar() {
  const editor = useEditor({ content: '<p>Start typing here…</p>', extensions: basicExtensions })

  return (
    <RichTextProvider editor={editor!}>
      <div className="toolbar">
        <RichTextUndo />
        <RichTextRedo />
        <RichTextHeading />
        <RichTextBold />
        <RichTextItalic />
      </div>
      <EditorContent editor={editor} />
      <RichTextBubbleText />
      <RichTextBubbleLink />
    </RichTextProvider>
  )
}
```

### 4. Input box — bubble menus only

A short-form rich-text input with **no toolbar** — formatting appears in a bubble menu on selection. Ideal for comment/message fields.

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import { RichTextProvider } from 'react-reason-editor'
import { RichTextBubbleText, RichTextBubbleLink } from 'react-reason-editor/bubble'
import { basicExtensions } from './extensions'

export function InputBox() {
  const editor = useEditor({ content: '', extensions: basicExtensions })

  return (
    <RichTextProvider editor={editor!}>
      <EditorContent editor={editor} />
      <RichTextBubbleText />
      <RichTextBubbleLink />
    </RichTextProvider>
  )
}
```

### 5. Table of Contents — with outline

The editor beside a live outline sidebar. Add Tiptap's `TableOfContents` + `UniqueID` extensions and render the anchors it reports through `onUpdate` as clickable navigation.

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import UniqueID from '@tiptap/extension-unique-id'
import TableOfContents, { getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'
import { RichTextProvider } from 'react-reason-editor'
import { RichTextToolbar, BubbleMenus } from 'react-reason-editor/editor-views/components'

export function WithToc() {
  const [toc, setToc] = useState([])
  const editor = useEditor({
    content: '<h1>Title</h1><h2>Section</h2>',
    extensions: [
      /* …base extensions… */
      UniqueID.configure({ types: ['heading'] }),
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        onUpdate: (anchors) => setToc(anchors),
      }),
    ],
  })

  return (
    <RichTextProvider editor={editor!}>
      <RichTextToolbar />
      <div className="flex">
        <nav>{toc.map((i) => <a key={i.id} href={`#${i.id}`}>{i.textContent}</a>)}</nav>
        <EditorContent editor={editor} />
      </div>
      <BubbleMenus />
    </RichTextProvider>
  )
}
```

### 6. Harper — grammar & spell proofing

Inline writing suggestions powered by the [Harper](https://writewithharper.com/) checker. Add the `Harper` extension, surface flagged issues, and mount `<RichTextHarper>` for the hover tooltip.

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import { RichTextProvider } from 'react-reason-editor'
import { Harper, RichTextHarper, type HarperIssue } from 'react-reason-editor/harper'

export function WithHarper() {
  const [issues, setIssues] = useState<HarperIssue[]>([])
  const editor = useEditor({
    content: '<p>This has a mispelled word.</p>',
    extensions: [
      /* …base extensions… */
      Harper.configure({ debounce: 300, onUpdate: setIssues }),
    ],
    immediatelyRender: false,
  })

  if (!editor) return null

  return (
    <RichTextProvider editor={editor}>
      <button onClick={() => editor.chain().focus().runProofing().run()}>Check document</button>
      <EditorContent editor={editor} />
      <RichTextHarper editor={editor} />
    </RichTextProvider>
  )
}
```

> The runnable versions of all six views live in [`demo/src/tabs`](demo/src/tabs). Shared extension sets and default content are in [`demo/src/tabs/shared.ts`](demo/src/tabs/shared.ts).

### Alternative demo views

`pnpm dev` (or the deployed demo site) opens straight into the full organizer app — no tab bar, just [`ReasonDocs`](demo/src/tabs/TabFull.tsx). To try the other five, lighter-weight configurations (editor with full toolbar, small toolbar, input box, table of contents, Harper proofing), open `/alternatives.html` instead:

```
pnpm dev
# then visit:
#   http://localhost:5173/            → full app (default)
#   http://localhost:5173/alternatives.html → the other 5 views, switchable via tab bar
```

The alternatives page is wired up as its own Vite entry (`demo/alternatives.html` → `demo/src/alternatives-main.tsx` → `demo/src/AlternativesApp.tsx`) and is included in the production build alongside the main demo.

## 📚 Resources

- **[TipTap Official Documentation](https://tiptap.dev/)** - Core editor framework
- **[TipTap Extensions](https://tiptap.dev/extensions)** - Available extensions and APIs
- **[TipTap Collaboration Guide](https://tiptap.dev/collaboration)** - Real-time collaboration setup
- **[TipTap Community](https://github.com/ueberdosis/tiptap/discussions)** - GitHub discussions and support

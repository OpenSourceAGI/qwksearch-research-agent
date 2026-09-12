---
name: ask-reason-editor-sidebar
description: Guide to react-reason-editor-sidebar (packages/reason-editor-sidebar), the REASON editor's sidebar as a standalone package — the Sidebar / SidebarContent / SidebarToolbar / SidebarFooter / SidebarViewMenu components injected into ReasonDocs, the five stackable panels (Open Tabs, Files, Outline, Related, AI) and the inferred split view, the headless-tree file tree, the related-documents and outline views, the AI rewrite modes, and the localStorage-backed file-source CRUD for local / SSH / S3 / R2 / B2 / Google Docs / Turso. Use when changing the file tree, tabs panel, outline, split-view menu, or the storage-backend picker, or when wiring the sidebar into a host that mounts ReasonDocs.
---

# Working With react-reason-editor-sidebar

`packages/reason-editor-sidebar`, published as **react-reason-editor-sidebar**. Split out
of `reason-editor` so the dependency runs **one way**: `react-reason-editor` depends on
this package, and this package depends on nothing from it. Keep it that way — importing
`react-reason-editor` here creates a circular workspace dependency.

It is injected rather than imported by the editor: `ReasonDocs` takes
`SidebarComponent` and `SidebarContentComponent` props, and you pass `Sidebar` and
`SidebarContent` from here.

## Setup

```tsx
import { ReasonDocs } from "react-reason-editor";
import { Sidebar, SidebarContent } from "react-reason-editor-sidebar";
import "react-reason-editor-sidebar/style.css";

<ReasonDocs SidebarComponent={Sidebar} SidebarContentComponent={SidebarContent} />
```

## Panels

Five, from `PANEL_OPTIONS`: `openTabs` (Open Tabs), `files` (Files), `outline`
(Outline), `related` (Related), `ai` (AI). Both sides are controlled from the same view
menu — `leftPanels`/`onLeftPanelsChange` and `rightPanels`/`onRightPanelsChange` — even
though `ReasonDocs` renders the right panel itself.

**Split view is inferred, not a mode**: two or more selected panels on a side stack in a
resizable split. Use `togglePanel(panels, type)` to compute the next list and
`sortPanels(panels)` to put it back into canonical order (Open Tabs above Files, …),
rather than mutating the array at the call site.

## Picking the right export

| You want | Export |
| --- | --- |
| The left sidebar | `Sidebar` (`SidebarProps`) |
| The right panel body | `SidebarContent` (`SidebarContentProps`) |
| Search box / expand-collapse header | `SidebarToolbar` |
| Footer (storage source, trash, settings link, view menu) | `SidebarFooter` |
| The panel-toggle menu | `SidebarViewMenu`, `PANEL_OPTIONS`, `togglePanel`, `sortPanels` |
| The file/folder tree alone | `FileTree`, `DocumentTreeHandle` |
| Outline of the active document | `OutlineView`, `OutlineViewHandle`, `ActiveHeadingEditorHandle` |
| Related-document suggestions | `findRelatedDocuments`, `splitTopSuggestion` |
| The AI rewrite card | `AIRewriteSuggestion`, `getRewriteModes`, `saveRewriteModes`, `resetRewriteModes`, `DEFAULT_REWRITE_MODES` |
| The file-manager modal | `FileManagerModal` |
| Storage backends | `getFileSources`, `saveFileSources`, `addFileSource`, `updateFileSource`, `deleteFileSource`, `getActiveFileSourceId`, `setActiveFileSourceId`, `getActiveFileSource` |
| Types | `Document`, `TocEntry`, `SidebarPanelType`, `OpenTabKind`, `OpenTabItem`, `SidebarAiProps`, `SidebarTipsProps`, `SidebarTopicsProps`, `RelatedDocumentResult`, `RelatedDocumentsSplit`, `RewriteMode`, `FileSourceType`, `AnyFileSource` |
| Utilities | `cn`, `ssrSafeLocalStorage`, `defaultDocuments`, `fileSourceUtils` |

## Recipes

**The sidebar is fully controlled.** `SidebarProps` takes `documents`, `activeId`,
`activeDocument` and a callback for every mutation — `onSelect`, `onAdd`, `onDelete`,
`onDuplicate`, `onRename`, `onMove(draggedId, targetId, "before" | "after" | "child")`,
`onToggleExpand`, `onSetExpandedFolders`, `onManageTags` — plus the search props
(`searchQuery`, `onSearchChange`, `onSearchClear`, `onSearchFocus`) and the mobile
drawer props (`isOpen`, `onOpenChange`, `isMobile`). It stores nothing itself; the host
owns the document state.

**Persist expansion.** Implement `onSetExpandedFolders` as well as `onToggleExpand`.
The toolbar's stepped expand/collapse replaces the expanded set wholesale, and without
that callback the stepped state lives only inside the tree and is lost on the next
document change.

**File sources.** Seven backends — `local`, `ssh`, `s3`, `r2`, `b2`, `gdocs`, `turso` —
as a discriminated union on `type`. The picker lives in `SidebarFooter` (bottom icon
row), not the toolbar, and renders only when the host passes `onFileSourceChange`.
The CRUD helpers are **localStorage-backed**, so
they are per-browser and never reach a server; secrets entered in the file-source dialog
live in the browser.

**Open Tabs.** `OpenTabItem`/`OpenTabKind` cover both `"file"` and `"chat"` tabs, which
is how a host merges its own non-document tabs (`extraTabs` on `ReasonDocs`) into the
same panel.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Panels appear in the order they were toggled on | Run the list through `sortPanels` before rendering. |
| Split view won't turn on | There is no split flag — select a second panel for that side. |
| Folder expansion resets when switching documents | `onSetExpandedFolders` is not implemented. |
| Drag-and-drop reorders visually then snaps back | `onMove` must actually persist; the tree renders from the `documents` prop. |
| A circular-dependency error appears after an edit | Something in this package imported `react-reason-editor`. The dependency is one-way. |
| `localStorage is not defined` under SSR | Use `ssrSafeLocalStorage`; the file-source helpers already do. |
| File-source credentials don't work on another device | They are in `localStorage`, per browser, by design. |
| The settings button does nothing / 404s | It is a plain link to `settingsHref` (default `/settings`), not a callback — the host must serve that route or pass its own URL. |
| The tree looks unstyled | Import `react-reason-editor-sidebar/style.css`. |
| Peer errors on install | `react` and `react-dom` are peers; everything else (headless-tree, radix, svar filemanager, react-split-pane) is a real dependency. |

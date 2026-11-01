---
name: ask-shadcn-app-dock
description: Guide to shadcn-app-dock (packages/shadcn-app-dock), the prop-driven macOS-style dock — CategoryDock and DockNavItem, inline dropdown items via the renderContent render prop, the bundled ThemeMenu shadcn theme switcher over next-themes, the desktop/mobile fixed placements and mobileAlign, Alt+N shortcuts, and the CategoryDockProvider visibility/category context. Use when adding or reordering dock items, composing a dock dropdown, changing dock placement or mobile layout, wiring the theme switcher, or when dock icons fail to render in a Next.js app.
---

# Working With shadcn-app-dock

`packages/shadcn-app-dock`, published as **shadcn-app-dock**. A fixed, magnifying dock
built on Framer Motion and Radix, with a shadcn theme switcher bundled in. It is
**entirely prop-driven** — it holds no navigation state of its own.

## Setup

```tsx
import { CategoryDock, ThemeMenu } from "shadcn-app-dock";
import Image from "next/image";

<CategoryDock
  items={[
    { key: "search", label: "Search", icon: "/icons/search.svg", active: true, onClick: goSearch },
    { key: "theme",  label: "Theme",  icon: <Palette />,
      menu: { renderContent: ({ side, close }) => <ThemeMenu /> } },
  ]}
  renderImage={(src, alt, size) => <Image src={src} alt={alt} width={size} height={size} />}
  enableKeyboardShortcuts
  mobileAlign="end"
/>
```

Peers: `react`, `react-dom`, `next-themes` (the last only if you use `ThemeMenu`).

## The props that matter

| Prop | Default | Meaning |
| --- | --- | --- |
| `items` | — | `DockNavItem[]`: `{ key, label, icon, active?, onClick?, menu? }` |
| `renderImage` | plain `<img>` | How **string** icons render. Pass `next/image` in a Next app |
| `enableKeyboardShortcuts` | `false` | Alt+1…n fires the matching item's `onClick` |
| `placements` | both | `{ desktop?, mobile? }` — which fixed docks to render |
| `mobileAlign` | `"center"` | `"end"` shifts the mobile dock right at `sm:`+ so a chat input can share the bottom row |
| `className` | — | |

`icon` is polymorphic: a **string** is an image src routed through `renderImage`; a
**node** renders as-is. Icon size is fixed at 24.

An item with a `menu` becomes a dropdown trigger instead of a nav button, and
`onClick` is not used. `menu.renderContent({ side, close })` owns the whole dropdown
body — `side` is `"top"` or `"bottom"` depending on which dock it is in, and `close`
dismisses it.

## Recipes

**Compose a dropdown.** The package re-exports `DropdownMenuItem`,
`DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubTrigger` and
`DropdownMenuSubContent` precisely so `renderContent` needs no second shadcn import.

**Theme switching.** `<ThemeMenu showAppearance defaultColorTheme="modern-minimal" />`
renders as a *fragment of dropdown items*, so drop it straight inside a
`renderContent` — not inside another wrapper. It handles light/dark/system via
next-themes and the shadcn colour-theme picker with hover preview, persisting to
`localStorage["color-theme"]` **and** a cookie, and toggling a `theme-<name>` class on
`<html>`.

**Coordinating with the host.** `CategoryDockProvider` + `useCategoryDock(currentCategory,
onCategoryChange)` register the active category from anywhere in the tree;
`useCategoryDockState()` reads it, and `useCategoryDockVisibility()` gives
`{ dockHidden, toggleDock }` for chrome that needs to hide the dock.

**Primitives.** `Dock`, `DockIcon`, `DockItem`, `DockLabel` and `dockVariants` are
exported for building a dock that is not `CategoryDock`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| String icons 404 or warn in Next | The default renderer is a plain `<img>`. Pass `renderImage` using `next/image`. |
| An item's `onClick` never fires | It has a `menu`, so it is a dropdown trigger. Put the action inside `renderContent`. |
| Alt+N does nothing | `enableKeyboardShortcuts` defaults to `false`, and shortcuts map to `onClick` — menu items have none. |
| The mobile dock overlaps a chat input | Set `mobileAlign="end"`; below `sm:` it stays centered by design. |
| Two docks appear | Both placements render by default. Narrow with `placements`. |
| `ThemeMenu` renders nothing or throws | It needs a `next-themes` `ThemeProvider` above it, and must be inside a `DropdownMenuContent` — it returns loose menu items, not a container. |
| The colour theme resets on reload | It reads `localStorage["color-theme"]` in an effect and only accepts names in its own list; an unknown name falls back to `defaultColorTheme`. |
| Theme flashes on first paint | The class is applied client-side. Read the cookie server-side and set `theme-<name>` on `<html>` yourself for SSR. |
| Consumers see stale components | `bun run build` (vite + `tsc -p tsconfig.build.json`) — this package is consumed as built `dist/`. |

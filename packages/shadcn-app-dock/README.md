<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/shadcn-app-dock"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/dm/shadcn-app-dock.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/v/shadcn-app-dock.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/dt/shadcn-app-dock.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/types/shadcn-app-dock" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=shadcn-app-dock"><img src="https://packagephobia.com/badge?p=shadcn-app-dock" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# shadcn-app-dock


A prop-driven, macOS-style category **dock** for React — magnifying icon bar with an
optional dropdown menu and a built-in **shadcn theme switcher**.

- **Abstracted nav items** — pass your own `icon` / `label` / `onClick` per item.
- **Custom menu** — a trailing dropdown whose body you render yourself.
- **Theme switcher** — drop the exported `<ThemeMenu />` into that dropdown for
  light / dark / system + shadcn color themes (with hover preview).
- **Framework-agnostic icons** — defaults to `<img>`; pass `renderImage` to use
  `next/image` or any custom renderer.

## Requirements

Tailwind CSS with the shadcn design tokens (CSS variables like `--card`, `--accent`,
`--primary`). For the color themes, import the stylesheet shipped by
[`shadcn-theme-menu`](https://www.npmjs.com/package/shadcn-theme-menu):

```ts
import "shadcn-theme-menu/themes.css"
```

Wrap your app in `next-themes`' `ThemeProvider` (peer dependency) for the appearance toggle.

## Usage

```tsx
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  CategoryDock,
  ThemeMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "shadcn-app-dock"

const NAV = [
  { href: "/", label: "Research", icon: "/apple-touch-icon.png" },
  { href: "/docs", label: "Docs", icon: "/icons/icon-read.svg" },
]

export function AppDock() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <CategoryDock
      enableKeyboardShortcuts
      renderImage={(src, alt, size) => (
        <Image src={src} alt={alt} width={size} height={size} unoptimized className="w-full h-full" />
      )}
      items={NAV.map(({ href, label, icon }) => ({
        key: href,
        label,
        icon,
        active: pathname === href,
        onClick: () => router.push(href),
      }))}
      menu={{
        triggerIcon: "/icons/icon-configure.svg",
        triggerLabel: "Settings",
        renderContent: ({ side }) => (
          <>
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <ThemeMenu />
          </>
        ),
      }}
    />
  )
}
```

## API

### `<CategoryDock>`

| Prop | Type | Description |
| --- | --- | --- |
| `items` | `DockNavItem[]` | Nav items. `icon` is an image `src` string or a React node. |
| `menu` | `CategoryDockMenu` | Optional trailing dropdown; `renderContent({ side, close })` returns its body. |
| `renderImage` | `(src, alt, size) => ReactNode` | Renders string icons. Defaults to `<img>`. |
| `enableKeyboardShortcuts` | `boolean` | `Alt+1..n` triggers the matching item's `onClick`. |
| `placements` | `{ desktop?, mobile? }` | Which fixed placements to render. Defaults to both. |
| `className` | `string` | Extra classes on each placement wrapper. |

### `<ThemeMenu>`

Composable theme switcher (fragment of dropdown items). Props: `showAppearance?` (default
`true`), `defaultColorTheme?` (default `"modern-minimal"`).

### Provider / hooks

`CategoryDockProvider`, `useCategoryDock(currentCategory, onCategoryChange)`,
`useCategoryDockState()`, `useCategoryDockVisibility()` — optional context for sharing dock
visibility and per-page category state.

The shadcn dropdown and dock primitives (`Dock`, `DockItem`, `DropdownMenuItem`, …) are also
re-exported for building custom menu content.

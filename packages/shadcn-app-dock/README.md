<p align="center">
<br /> 
    <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/dm/shadcn-app-dock.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/v/shadcn-app-dock.svg" alt="npm version"></a>
    <a href="https://packagephobia.com/result?p=shadcn-app-dock" target="_blank" rel="noopener noreferrer">
  <img src="https://packagephobia.com/badge?p=shadcn-app-dock" alt="install size" />
</a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>  
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
<br />
    <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/vtempest/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>

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

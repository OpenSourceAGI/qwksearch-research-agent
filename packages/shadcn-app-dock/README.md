# shadcn-app-dock

<a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/dm/shadcn-app-dock.svg" alt="NPM Monthly Downloads"></a>
<a href="https://www.npmjs.com/package/shadcn-app-dock"><img src="https://img.shields.io/npm/v/shadcn-app-dock.svg" alt="npm version"></a>

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
